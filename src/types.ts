// Copyright (c) 2026 Mapatak Platform. All rights reserved.
// PROPRIETARY & CONFIDENTIAL. Unauthorized copying, modification, or distribution is strictly prohibited.

export interface CountryConfig {
  isoCode: string;
  dialCode: string;
  flag: string;
  minLength: number;
  maxLength: number;
  startsWith: string[];
  regex: RegExp;
  exampleNumber: string;
}

export interface PhonePayload {
  fullWithPlus: string;
  fullWithoutPlus: string;
  nationalNumber: string;
  countryCode: string;
  dialCode: string;
}

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

export interface MapatakPhoneInputProps {
  defaultCountryIso?: string;
  value?: string;
  onChange?: (payload: PhonePayload | null) => void;
  onValidationChange?: (isValid: boolean) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  locale?: "ar" | "en" | "es" | "ur";
  size?: "small" | "medium";
  fullWidth?: boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
}
