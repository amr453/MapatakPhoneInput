// Copyright (c) 2026 Mapatak Platform. All rights reserved.
// PROPRIETARY & CONFIDENTIAL. Unauthorized copying, modification, or distribution is strictly prohibited.

import { z } from "zod";
import { getCountryByIso } from "./countries-config";
import type { CountryConfig, PhonePayload } from "./types";

// --- Error Types ---
export type PhoneErrorKey =
  | "required"
  | "tooShort"
  | "tooLong"
  | "invalidPrefix"
  | "invalidFormat";

export interface PhoneValidationError {
  key: PhoneErrorKey;
  params?: Record<string, string | number>;
}

// --- Helpers ---
export const stripLeadingZero = (n: string): string =>
  n.startsWith("0") ? n.slice(1) : n;

// Universal decimal-digit normalisation: convert every Unicode `Nd`
// digit (Arabic ٠-٩, Persian ۰-۹, Bengali ০-৯, Devanagari ०-९, Thai ๐-๙,
// Tamil ௦-௯, fullwidth ０-９, mathematical 𝟎-𝟗, etc.) to ASCII *before*
// stripping non-digits — otherwise users on a non-Latin keyboard see
// their number disappear silently (`/\D/` would strip those code points).
//
// Algorithm: for each Nd character, walk back through codepoints until a
// non-Nd boundary is hit; the distance gives the digit value 0-9. Every
// Nd block in Unicode is exactly 10 contiguous codepoints starting at
// that script's "0", so this is reliable for every script.
const toAsciiDigits = (val: string): string =>
  val.replace(/\p{Nd}/gu, (d) => {
    const cp = d.codePointAt(0)!;
    if (cp >= 0x30 && cp <= 0x39) return d;
    for (let off = 1; off <= 9; off++) {
      if (!/\p{Nd}/u.test(String.fromCodePoint(cp - off))) {
        return String(off - 1);
      }
    }
    return "9";
  });

export const sanitizeInput = (raw: string): string =>
  toAsciiDigits(raw).replace(/\D/g, "");

/**
 * Resolves i18n error template: replaces {key} with params[key].
 */
export const resolveErrorMessage = (
  template: string,
  params?: Record<string, string | number>
): string => {
  if (!params) return template;
  return Object.entries(params).reduce(
    (msg, [k, v]) => msg.replace(`{${k}}`, String(v)),
    template
  );
};

// --- 5-Level Validator ---
export const validatePhone = (
  isoCode: string,
  rawInput: string
): PhoneValidationError | null => {
  const country = getCountryByIso(isoCode);
  if (!country) return { key: "invalidFormat" };

  // 1) Required check
  const sanitized = sanitizeInput(rawInput);
  if (!sanitized || sanitized.length === 0) {
    return { key: "required" };
  }

  // 2) Format check (non-digit chars in original)
  if (/[^\d]/.test(rawInput.replace(/^0/, ""))) {
    return { key: "invalidFormat" };
  }

  const cleaned = stripLeadingZero(sanitized);

  // 3) Invalid prefix — check as soon as user types the first digit
  //    Compare against the typed portion: if user typed fewer chars than
  //    the prefix length, check that the typed chars match the start of
  //    at least one valid prefix. This gives instant feedback.
  if (cleaned.length > 0) {
    const prefixMatch = country.startsWith.some((p) =>
      cleaned.length >= p.length
        ? cleaned.startsWith(p)
        : p.startsWith(cleaned)
    );
    if (!prefixMatch) {
      return {
        key: "invalidPrefix",
        params: { validPrefixes: country.startsWith.join(", ") },
      };
    }
  }

  // 4) Too short
  if (cleaned.length < country.minLength) {
    return {
      key: "tooShort",
      params: { minLength: country.minLength },
    };
  }

  // 5) Too long
  if (cleaned.length > country.maxLength) {
    return {
      key: "tooLong",
      params: { maxLength: country.maxLength },
    };
  }

  // 6) Full regex check
  if (!country.regex.test(cleaned)) {
    return { key: "invalidFormat" };
  }

  return null; // Valid!
};

// --- Zod Schema Helpers ---
export const createPhoneSchemaForCountry = (country: CountryConfig) =>
  z.string()
    .transform((v) => stripLeadingZero(sanitizeInput(v)))
    .refine((v) => v.length >= country.minLength && v.length <= country.maxLength, {
      message: `Must be ${country.minLength === country.maxLength ? country.minLength : country.minLength + "-" + country.maxLength} digits`,
    })
    .refine((v) => country.startsWith.some((p) => v.startsWith(p)), {
      message: `Must start with: ${country.startsWith.join(", ")}`,
    })
    .refine((v) => country.regex.test(v), {
      message: `Invalid format for ${country.isoCode}`,
    });

export const phonePayloadSchema = z.object({
  countryCode: z.string().length(2),
  nationalNumber: z.string().min(1),
}).superRefine((data, ctx) => {
  const country = getCountryByIso(data.countryCode);
  if (!country) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unsupported: ${data.countryCode}`, path: ["countryCode"] });
    return;
  }
  const cleaned = stripLeadingZero(sanitizeInput(data.nationalNumber));
  if (cleaned.length < country.minLength || cleaned.length > country.maxLength) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Must be ${country.minLength === country.maxLength ? country.minLength + " digits" : country.minLength + "-" + country.maxLength + " digits"}`, path: ["nationalNumber"] });
    return;
  }
  if (!country.startsWith.some((p) => cleaned.startsWith(p))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Must start with: ${country.startsWith.join(", ")}`, path: ["nationalNumber"] });
    return;
  }
  if (!country.regex.test(cleaned)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid format for ${country.isoCode}`, path: ["nationalNumber"] });
  }
});

// --- Payload Builder ---
export const validateAndBuildPayload = (
  isoCode: string,
  rawInput: string
): {
  success: true;
  data: PhonePayload;
} | {
  success: false;
  error: PhoneValidationError;
} => {
  const validationError = validatePhone(isoCode, rawInput);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const country = getCountryByIso(isoCode)!;
  const nationalNumber = stripLeadingZero(sanitizeInput(rawInput));

  return {
    success: true,
    data: {
      fullWithPlus: `+${country.dialCode}${nationalNumber}`,
      fullWithoutPlus: `${country.dialCode}${nationalNumber}`,
      nationalNumber,
      countryCode: country.isoCode,
      dialCode: country.dialCode,
    },
  };
};
