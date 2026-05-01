// Copyright (c) 2026 Mapatak Platform. All rights reserved.
// PROPRIETARY & CONFIDENTIAL. Unauthorized copying, modification, or distribution is strictly prohibited.

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { COUNTRIES_CONFIG, getDefaultCountry } from "./countries-config";
import { validateAndBuildPayload, sanitizeInput, stripLeadingZero, resolveErrorMessage } from "./phone-validation";
import type { CountryConfig, MapatakPhoneInputProps, PhonePayload, PhoneValidationError } from "./types";
import arData from "./i18n/ar.json";
import enData from "./i18n/en.json";
import esData from "./i18n/es.json";
import urData from "./i18n/ur.json";

// ---------------------------------------------------------------------------
// Tiny class-name utility (local, zero-dependency)
// ---------------------------------------------------------------------------

type ClassArg = string | number | false | null | undefined | Record<string, boolean | undefined | null>;
function cn(...args: ClassArg[]): string {
  const out: string[] = [];
  for (const a of args) {
    if (!a) continue;
    if (typeof a === "string" || typeof a === "number") {
      out.push(String(a));
    } else if (typeof a === "object") {
      for (const [k, v] of Object.entries(a)) if (v) out.push(k);
    }
  }
  return out.join(" ");
}

// ---------------------------------------------------------------------------
// Locale resolution
// ---------------------------------------------------------------------------

interface LocaleData {
  countries: Record<string, string>;
  errors: Record<string, string>;
  ui: Record<string, string>;
}

const LOCALE_MAP: Record<string, LocaleData> = {
  ar: arData as LocaleData,
  en: enData as LocaleData,
  es: esData as LocaleData,
  ur: urData as LocaleData,
};

// ---------------------------------------------------------------------------
// Size map (aligned with @mapatak/ui-theme inputSizes scale)
// MUI-compat API keeps "small" | "medium"; internally we use md / lg tokens.
// ---------------------------------------------------------------------------

const SIZE_MAP = {
  small: {
    height: "h-10",              // 40px — matches inputSizes.md
    text: "text-sm",             // 14px
    paddingX: "px-3",            // 12px
    labelSize: "text-xs",        // 12px
  },
  medium: {
    height: "h-12",              // 48px — matches inputSizes.lg
    text: "text-base",           // 16px
    paddingX: "px-4",            // 16px
    labelSize: "text-sm",        // 14px
  },
} as const;

// ---------------------------------------------------------------------------
// Inline icons (no MUI deps)
// ---------------------------------------------------------------------------

function ChevronDownIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4 shrink-0", className)}
      style={style}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SearchIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4 shrink-0", className)}
      style={style}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Click-outside hook — replaces MUI ClickAwayListener
// ---------------------------------------------------------------------------

function useClickAway<T extends HTMLElement>(
  active: boolean,
  onAway: (event: MouseEvent | TouchEvent) => void
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!active) return;
    const handler = (event: MouseEvent | TouchEvent) => {
      const node = ref.current;
      if (node && !node.contains(event.target as Node)) {
        onAway(event);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [active, onAway]);
  return ref;
}

// ---------------------------------------------------------------------------
// MapatakPhoneInput
// ---------------------------------------------------------------------------

const MapatakPhoneInput: React.FC<MapatakPhoneInputProps> = ({
  defaultCountryIso = "SA",
  value = "",
  onChange,
  onValidationChange,
  error: externalError = false,
  helperText: externalHelperText = "",
  disabled = false,
  locale = "en",
  size = "medium",
  fullWidth = true,
  label,
  placeholder,
  required = false,
  theme = "auto",
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(
    () => getDefaultCountry(defaultCountryIso)
  );
  const [phoneNumber, setPhoneNumber] = useState<string>(value);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [validationError, setValidationError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const containerRef = useClickAway<HTMLDivElement>(dropdownOpen, () => {
    setDropdownOpen(false);
    setSearchTerm("");
  });

  const localeData = LOCALE_MAP[locale] || LOCALE_MAP.en;
  const names = localeData.countries;
  const isRtl = locale === "ar" || locale === "ur";
  const sz = SIZE_MAP[size];

  // ---- Sort + Filter (alphabetical by locale name) ----
  const sortedAndFiltered = useMemo(() => {
    let list = [...COUNTRIES_CONFIG].sort((a, b) => {
      const nA = names[a.isoCode] || a.isoCode;
      const nB = names[b.isoCode] || b.isoCode;
      return nA.localeCompare(nB, locale);
    });
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((c) => {
        const localName = (names[c.isoCode] || "").toLowerCase();
        return (
          c.isoCode.toLowerCase().includes(q) ||
          c.dialCode.includes(q) ||
          localName.includes(q)
        );
      });
    }
    return list;
  }, [searchTerm, names, locale]);

  // ---- Resolve error message from key + params ----
  const resolveValidationError = useCallback(
    (err: PhoneValidationError): string => {
      const template = localeData.errors[err.key] || err.key;
      return resolveErrorMessage(template, err.params);
    },
    [localeData]
  );

  // ---- Validation ----
  const emitPayload = useCallback(
    (country: CountryConfig, raw: string) => {
      const cleaned = stripLeadingZero(sanitizeInput(raw));
      if (!cleaned) {
        setValidationError("");
        onValidationChange?.(false);
        onChange?.(null);
        return;
      }
      const result = validateAndBuildPayload(country.isoCode, raw);
      if (result.success) {
        setValidationError("");
        onValidationChange?.(true);
        onChange?.(result.data);
      } else {
        setValidationError(resolveValidationError(result.error));
        onValidationChange?.(false);
        onChange?.(null);
      }
    },
    [onChange, onValidationChange, resolveValidationError]
  );

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // `sanitizeInput` first normalises Arabic-Indic / Persian digits to
    // ASCII so users on an ar / ur keyboard don't see their input vanish.
    const raw = sanitizeInput(e.target.value);
    setPhoneNumber(raw);
    emitPayload(selectedCountry, raw);
  };

  const handleCountrySelect = (country: CountryConfig) => {
    setSelectedCountry(country);
    setDropdownOpen(false);
    setSearchTerm("");
    emitPayload(country, phoneNumber);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const nc = getDefaultCountry(defaultCountryIso);
    setSelectedCountry(nc);
    if (phoneNumber) emitPayload(nc, phoneNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCountryIso]);

  useEffect(() => {
    if (dropdownOpen) {
      const timer = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [dropdownOpen]);

  const showError = externalError || !!validationError;
  const helperMsg = externalHelperText || validationError;

  // ---- Unique id for label / input association ----
  const reactId = React.useId();
  const inputId = `mapatak-phone-${reactId}`;

  const themeClass =
    theme === "light" ? "mpi-theme-light" : theme === "dark" ? "mpi-theme-dark" : "";

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className={cn("mapatak-phone-root relative", themeClass, fullWidth ? "w-full" : "w-auto")}
    >
      {/* Self-contained theming.
          - Light is the default palette (defined on `.mapatak-phone-root`).
          - Dark activates automatically when any ancestor carries `.dark`
            (the standard Tailwind dark-mode class).
          - Consumers can force a palette via the `theme` prop, which
            applies `mpi-theme-light` / `mpi-theme-dark` and wins over
            ancestor-based detection — useful for surfaces that are
            intentionally always-light (e.g. sign-in split panels). */}
      <style>{`.mapatak-phone-root{--mpi-bg:#ffffff;--mpi-bg-disabled:#f3f4f6;--mpi-text:#0f172a;--mpi-text-secondary:#64748b;--mpi-text-muted:#94a3b8;--mpi-label:#334155;--mpi-border:#cbd5e1;--mpi-divider:#e2e8f0;--mpi-hover:rgba(15,23,42,0.04);--mpi-active:rgba(59,130,246,0.08);--mpi-error:#ef4444;--mpi-shadow:0 12px 32px -8px rgba(15,23,42,0.18),0 2px 6px rgba(15,23,42,0.06);--mpi-scroll-thumb:rgba(15,23,42,0.18);--mpi-scroll-thumb-hover:rgba(15,23,42,0.32);color-scheme:light}.dark .mapatak-phone-root,.mapatak-phone-root.mpi-theme-dark{--mpi-bg:#1e2022;--mpi-bg-disabled:rgba(255,255,255,0.04);--mpi-text:#ffffff;--mpi-text-secondary:rgba(255,255,255,0.65);--mpi-text-muted:rgba(255,255,255,0.40);--mpi-label:rgba(255,255,255,0.78);--mpi-border:rgba(255,255,255,0.12);--mpi-divider:rgba(255,255,255,0.10);--mpi-hover:rgba(255,255,255,0.06);--mpi-active:rgba(59,130,246,0.18);--mpi-error:#f87171;--mpi-shadow:0 20px 60px rgba(0,0,0,0.7),0 4px 16px rgba(0,0,0,0.4);--mpi-scroll-thumb:rgba(255,255,255,0.20);--mpi-scroll-thumb-hover:rgba(255,255,255,0.32);color-scheme:dark}.dark .mapatak-phone-root.mpi-theme-light,.mapatak-phone-root.mpi-theme-light{--mpi-bg:#ffffff;--mpi-bg-disabled:#f3f4f6;--mpi-text:#0f172a;--mpi-text-secondary:#64748b;--mpi-text-muted:#94a3b8;--mpi-label:#334155;--mpi-border:#cbd5e1;--mpi-divider:#e2e8f0;--mpi-hover:rgba(15,23,42,0.04);--mpi-active:rgba(59,130,246,0.08);--mpi-error:#ef4444;--mpi-shadow:0 12px 32px -8px rgba(15,23,42,0.18),0 2px 6px rgba(15,23,42,0.06);--mpi-scroll-thumb:rgba(15,23,42,0.18);--mpi-scroll-thumb-hover:rgba(15,23,42,0.32);color-scheme:light}.mapatak-phone-scroll::-webkit-scrollbar{width:8px;height:8px}.mapatak-phone-scroll::-webkit-scrollbar-track{background:transparent}.mapatak-phone-scroll::-webkit-scrollbar-thumb{background:var(--mpi-scroll-thumb);border-radius:8px}.mapatak-phone-scroll::-webkit-scrollbar-thumb:hover{background:var(--mpi-scroll-thumb-hover)}`}</style>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "mb-1.5 block font-medium text-gray-700 dark:text-gray-200",
            sz.labelSize,
            disabled && "opacity-50"
          )}
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 600,
            fontSize: 13,
            color: "var(--mpi-label)",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {label}
          {required && (
            <span style={{ marginInlineStart: 2, color: "var(--mpi-error)" }} aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Input row — flag button + phone field. Inline-style fallbacks
          ensure the field renders correctly even in apps that don't scan
          this library for Tailwind classes (e.g. when the consuming
          app's `@source` directive is restricted to its own src tree). */}
      <div
        className={cn(
          "flex items-center rounded-lg border bg-white transition-colors",
          "dark:bg-gray-800",
          sz.height,
          showError ? "border-red-500" : "border-slate-300 dark:border-slate-600",
          disabled && "cursor-not-allowed opacity-50 bg-gray-100 dark:bg-gray-900"
        )}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: size === "small" ? 40 : 48,
          background: disabled ? "var(--mpi-bg-disabled)" : "var(--mpi-bg)",
          border: `1px solid ${showError ? "var(--mpi-error)" : "var(--mpi-border)"}`,
          borderRadius: 12,
          transition: "border-color 120ms ease, box-shadow 120ms ease",
        }}
      >
        {/* Flag / Dial code trigger */}
        <button
          type="button"
          onClick={() => !disabled && setDropdownOpen((o) => !o)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
          aria-label="Select country"
          dir="ltr"
          className={cn(
            "inline-flex items-center gap-1 h-full shrink-0",
            "ps-3 pe-2",
            "text-gray-800 dark:text-gray-200",
            "hover:bg-gray-50 dark:hover:bg-gray-700",
            "rounded-s-lg",
            "focus:outline-none",
            "disabled:cursor-not-allowed"
          )}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: "100%",
            padding: "0 12px",
            color: "var(--mpi-text)",
            background: "transparent",
            cursor: disabled ? "not-allowed" : "pointer",
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
            outline: "none",
            border: "none",
            fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden="true">
            {selectedCountry.flag}
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: "var(--mpi-text)",
              minWidth: 36,
              textAlign: "left",
            }}
          >
            +{selectedCountry.dialCode}
          </span>
          <ChevronDownIcon style={{ color: "var(--mpi-text-secondary)" }} />
        </button>

        {/* Divider */}
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 1,
            height: 22,
            background: "var(--mpi-divider)",
            margin: "0 4px",
            flexShrink: 0,
          }}
        />

        {/* Phone number input */}
        <input
          ref={inputRef}
          id={inputId}
          type="tel"
          inputMode="tel"
          dir="ltr"
          value={phoneNumber}
          onChange={handlePhoneChange}
          disabled={disabled}
          required={required}
          placeholder={
            placeholder ||
            `${(localeData.ui.examplePrefix as string | undefined) ?? ""}${selectedCountry.exampleNumber}`
          }
          maxLength={selectedCountry.maxLength + 1}
          aria-invalid={showError || undefined}
          aria-describedby={helperMsg ? `${inputId}-helper` : undefined}
          className={cn(
            "flex-1 h-full bg-transparent outline-none border-0",
            "text-gray-900 dark:text-white placeholder:text-gray-400",
            sz.paddingX,
            "disabled:cursor-not-allowed"
          )}
          style={{
            flex: 1,
            minWidth: 0,
            height: "100%",
            padding: "0 14px",
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--mpi-text)",
            fontSize: 14,
            letterSpacing: "0.3px",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Helper / error text */}
      {helperMsg && (
        <p
          id={`${inputId}-helper`}
          role={showError ? "alert" : undefined}
          className={cn(
            "mt-1 text-xs",
            showError ? "text-red-500" : "text-gray-500 dark:text-gray-400"
          )}
          style={{
            marginTop: 4,
            fontSize: 12,
            color: showError ? "var(--mpi-error)" : "var(--mpi-text-secondary)",
          }}
        >
          {helperMsg}
        </p>
      )}

      {/* Dropdown panel — fixed-height + scroll, even without Tailwind */}
      {dropdownOpen && (
        <div
          dir={isRtl ? "rtl" : "ltr"}
          role="dialog"
          aria-label="Select country"
          className={cn(
            "absolute inset-x-0 top-full z-50 mt-1",
            "flex flex-col overflow-hidden",
            "rounded-lg border border-gray-200 dark:border-gray-700",
            "bg-white dark:bg-gray-800",
            "shadow-lg"
          )}
          style={{
            position: "absolute",
            insetInlineStart: 0,
            insetInlineEnd: 0,
            top: "100%",
            marginTop: 6,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            maxHeight: 320,
            overflow: "hidden",
            background: "var(--mpi-bg)",
            border: "1px solid var(--mpi-border)",
            borderRadius: 14,
            boxShadow: "var(--mpi-shadow)",
          }}
        >
          {/* Search */}
          <div
            className="flex items-center gap-2 border-b border-gray-200 p-3 dark:border-gray-700"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 12,
              borderBottom: "1px solid var(--mpi-divider)",
              flexShrink: 0,
            }}
          >
            <SearchIcon style={{ color: "var(--mpi-text-secondary)" }} />
            <input
              ref={searchRef}
              type="search"
              dir={isRtl ? "rtl" : "ltr"}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={localeData.ui.searchPlaceholder}
              className={cn(
                "h-8 w-full bg-transparent outline-none border-0",
                "text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
              )}
              style={{
                flex: 1,
                minWidth: 0,
                height: 32,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--mpi-text)",
                fontSize: 14,
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Country list — scrollbar styling is themed via CSS variables
              defined on the root, so it inverts cleanly in dark mode. */}
          <div
            role="listbox"
            aria-label="Countries"
            className="flex-1 overflow-y-auto mapatak-phone-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
              scrollbarWidth: "thin",
              scrollbarColor: "var(--mpi-scroll-thumb) transparent",
            }}
          >
            {sortedAndFiltered.map((c) => {
              const active = c.isoCode === selectedCountry.isoCode;
              const localName = names[c.isoCode] || c.isoCode;
              return (
                <button
                  key={c.isoCode}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleCountrySelect(c)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2 text-start text-sm transition-colors",
                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                    "focus:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-gray-700",
                    active && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 16px",
                    background: active ? "var(--mpi-active)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--mpi-text)",
                    fontSize: 14,
                    textAlign: isRtl ? "right" : "left",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      width: 28,
                      textAlign: "center",
                      fontSize: 20,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    {c.flag}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      color: "var(--mpi-text)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {localName}
                  </span>
                  <span
                    dir="ltr"
                    style={{
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 12,
                      color: "var(--mpi-text-secondary)",
                      flexShrink: 0,
                    }}
                  >
                    +{c.dialCode}
                  </span>
                </button>
              );
            })}

            {sortedAndFiltered.length === 0 && (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--mpi-text-muted)",
                }}
              >
                {localeData.ui.noResults}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapatakPhoneInput;
export { MapatakPhoneInput };
