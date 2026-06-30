// Copyright (c) 2026 Mapatak Platform. All rights reserved.
// PROPRIETARY & CONFIDENTIAL. Unauthorized copying, modification, or distribution is strictly prohibited.

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { COUNTRIES_CONFIG } from "./countries-config";
import { normalizeForSearch } from "./normalize";
import type { CountryConfig } from "./types";
import arData from "./i18n/ar.json";
import enData from "./i18n/en.json";
import esData from "./i18n/es.json";
import urData from "./i18n/ur.json";

// ---------------------------------------------------------------------------
// Locale data
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

// Module-level multilingual search index — same as MapatakPhoneInput's
// SEARCH_HAYSTACK. Concatenates ISO + dial + all 4 localized names per
// country, normalized via normalizeForSearch.
const SEARCH_HAYSTACK: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  const locales: LocaleData[] = [LOCALE_MAP.ar, LOCALE_MAP.en, LOCALE_MAP.es, LOCALE_MAP.ur];
  for (const c of COUNTRIES_CONFIG) {
    const parts: string[] = [c.isoCode, c.dialCode];
    for (const loc of locales) {
      const name = loc.countries[c.isoCode];
      if (name) parts.push(name);
    }
    out[c.isoCode] = normalizeForSearch(parts.join(" "));
  }
  return out;
})();

// ---------------------------------------------------------------------------
// Size map (mirrors MapatakPhoneInput's SIZE_MAP)
// ---------------------------------------------------------------------------

const SIZE_MAP = {
  small: { height: 40, labelSize: 12, fontSize: 14, paddingX: 12 },
  medium: { height: 48, labelSize: 13, fontSize: 14, paddingX: 16 },
} as const;

// ---------------------------------------------------------------------------
// Inline icons (zero deps)
// ---------------------------------------------------------------------------

type IconProps = { className?: string; style?: React.CSSProperties };

function ChevronDownIcon({ style }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={style} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SearchIcon({ style }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={style} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function LockIcon({ style }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={style} aria-hidden="true">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Click-outside hook
// ---------------------------------------------------------------------------

function useClickAway<T extends HTMLElement>(active: boolean, onAway: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!active) return;
    const handler = (event: MouseEvent | TouchEvent) => {
      const node = ref.current;
      if (node && !node.contains(event.target as Node)) onAway();
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
// Public API
// ---------------------------------------------------------------------------

export interface CountrySelectProps {
  /** ISO 3166-1 alpha-2 country code in the configured case (default 'upper'). */
  value: string;
  /** Fires with an ISO 3166-1 alpha-2 code in the configured case. */
  onChange: (iso: string) => void;
  locale?: "ar" | "en" | "es" | "ur";
  /** Whether emitted (and accepted) ISO codes are uppercase or lowercase. */
  valueCase?: "upper" | "lower";
  /** Restrict the list to these ISO codes (case-insensitive). */
  allowedIsos?: string[];
  disabled?: boolean;
  /** Render a padlock inside the trigger when `disabled`. */
  showLock?: boolean;
  /** Show `+dialCode` instead of the country name in the trigger. */
  showDialCode?: boolean;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  size?: "small" | "medium";
  theme?: "auto" | "light" | "dark";
  label?: string;
  required?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// CountrySelect
// ---------------------------------------------------------------------------

const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  locale = "en",
  valueCase = "upper",
  allowedIsos,
  disabled = false,
  showLock = false,
  showDialCode = false,
  placeholder,
  error = false,
  helperText,
  fullWidth = true,
  size = "medium",
  theme = "auto",
  label,
  required = false,
  className,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const containerRef = useClickAway<HTMLDivElement>(dropdownOpen, () => {
    setDropdownOpen(false);
    setSearchTerm("");
  });

  const localeData = LOCALE_MAP[locale] || LOCALE_MAP.en;
  const names = localeData.countries;
  const isRtl = locale === "ar" || locale === "ur";
  const sz = SIZE_MAP[size];

  const allowedSet = useMemo(() => {
    if (!allowedIsos || allowedIsos.length === 0) return null;
    return new Set(allowedIsos.map((i) => i.toUpperCase()));
  }, [allowedIsos]);

  const valueIso = (value || "").toUpperCase();
  const selectedCountry = useMemo<CountryConfig | undefined>(
    () => COUNTRIES_CONFIG.find((c) => c.isoCode === valueIso),
    [valueIso],
  );

  const sortedAndFiltered = useMemo(() => {
    let list = COUNTRIES_CONFIG.slice();
    if (allowedSet) list = list.filter((c) => allowedSet.has(c.isoCode));
    list.sort((a, b) => {
      const nA = names[a.isoCode] || a.isoCode;
      const nB = names[b.isoCode] || b.isoCode;
      return nA.localeCompare(nB, locale);
    });
    if (searchTerm.trim()) {
      const q = normalizeForSearch(searchTerm);
      if (q) list = list.filter((c) => (SEARCH_HAYSTACK[c.isoCode] || "").includes(q));
    }
    return list;
  }, [searchTerm, names, locale, allowedSet]);

  const emit = useCallback(
    (iso: string) => {
      onChange(valueCase === "lower" ? iso.toLowerCase() : iso.toUpperCase());
    },
    [onChange, valueCase],
  );

  const handleSelect = (c: CountryConfig) => {
    setDropdownOpen(false);
    setSearchTerm("");
    emit(c.isoCode);
  };

  useEffect(() => {
    if (dropdownOpen) {
      const timer = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [dropdownOpen]);

  const themeClass = theme === "light" ? "mpi-theme-light" : theme === "dark" ? "mpi-theme-dark" : "";
  const reactId = React.useId();
  const triggerId = `mapatak-country-${reactId}`;

  const triggerLabel = selectedCountry
    ? showDialCode
      ? `+${selectedCountry.dialCode}`
      : names[selectedCountry.isoCode] || selectedCountry.isoCode
    : placeholder || (localeData.ui.searchPlaceholder as string | undefined) || "";

  const triggerFlag = selectedCountry?.flag ?? "🏳";

  return (
    <div
      ref={containerRef}
      className={["mapatak-phone-root relative", themeClass, fullWidth ? "w-full" : "w-auto", className]
        .filter(Boolean)
        .join(" ")}
      style={{ position: "relative", width: fullWidth ? "100%" : "auto" }}
    >
      <style>{`.mapatak-phone-root{--mpi-bg:#ffffff;--mpi-bg-disabled:#f3f4f6;--mpi-text:#0f172a;--mpi-text-secondary:#64748b;--mpi-text-muted:#94a3b8;--mpi-label:#334155;--mpi-border:#cbd5e1;--mpi-divider:#e2e8f0;--mpi-hover:rgba(15,23,42,0.04);--mpi-active:rgba(59,130,246,0.08);--mpi-error:#ef4444;--mpi-shadow:0 12px 32px -8px rgba(15,23,42,0.18),0 2px 6px rgba(15,23,42,0.06);--mpi-scroll-thumb:rgba(15,23,42,0.18);--mpi-scroll-thumb-hover:rgba(15,23,42,0.32);color-scheme:light}.dark .mapatak-phone-root,.mapatak-phone-root.mpi-theme-dark{--mpi-bg:#1e2022;--mpi-bg-disabled:rgba(255,255,255,0.04);--mpi-text:#ffffff;--mpi-text-secondary:rgba(255,255,255,0.65);--mpi-text-muted:rgba(255,255,255,0.40);--mpi-label:rgba(255,255,255,0.78);--mpi-border:rgba(255,255,255,0.12);--mpi-divider:rgba(255,255,255,0.10);--mpi-hover:rgba(255,255,255,0.06);--mpi-active:rgba(59,130,246,0.18);--mpi-error:#f87171;--mpi-shadow:0 20px 60px rgba(0,0,0,0.7),0 4px 16px rgba(0,0,0,0.4);--mpi-scroll-thumb:rgba(255,255,255,0.20);--mpi-scroll-thumb-hover:rgba(255,255,255,0.32);color-scheme:dark}.dark .mapatak-phone-root.mpi-theme-light,.mapatak-phone-root.mpi-theme-light{--mpi-bg:#ffffff;--mpi-bg-disabled:#f3f4f6;--mpi-text:#0f172a;--mpi-text-secondary:#64748b;--mpi-text-muted:#94a3b8;--mpi-label:#334155;--mpi-border:#cbd5e1;--mpi-divider:#e2e8f0;--mpi-hover:rgba(15,23,42,0.04);--mpi-active:rgba(59,130,246,0.08);--mpi-error:#ef4444;--mpi-shadow:0 12px 32px -8px rgba(15,23,42,0.18),0 2px 6px rgba(15,23,42,0.06);--mpi-scroll-thumb:rgba(15,23,42,0.18);--mpi-scroll-thumb-hover:rgba(15,23,42,0.32);color-scheme:light}.mapatak-phone-scroll::-webkit-scrollbar{width:8px;height:8px}.mapatak-phone-scroll::-webkit-scrollbar-track{background:transparent}.mapatak-phone-scroll::-webkit-scrollbar-thumb{background:var(--mpi-scroll-thumb);border-radius:8px}.mapatak-phone-scroll::-webkit-scrollbar-thumb:hover{background:var(--mpi-scroll-thumb-hover)}`}</style>

      {label && (
        <label
          htmlFor={triggerId}
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 600,
            fontSize: sz.labelSize,
            color: "var(--mpi-label)",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {label}
          {required && (
            <span style={{ marginInlineStart: 2, color: "var(--mpi-error)" }} aria-hidden="true">*</span>
          )}
        </label>
      )}

      <button
        id={triggerId}
        type="button"
        onClick={() => !disabled && setDropdownOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={dropdownOpen}
        aria-label="Select country"
        dir={isRtl ? "rtl" : "ltr"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          height: sz.height,
          padding: `0 ${sz.paddingX}px`,
          background: disabled ? "var(--mpi-bg-disabled)" : "var(--mpi-bg)",
          border: `1.5px solid ${error ? "var(--mpi-error)" : "var(--mpi-border)"}`,
          borderRadius: 12,
          color: "var(--mpi-text)",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          fontFamily: "inherit",
          fontSize: sz.fontSize,
          transition: "border-color 120ms ease, box-shadow 120ms ease",
          opacity: disabled ? 0.9 : 1,
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
          {triggerFlag}
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: isRtl ? "right" : "left",
            color: selectedCountry ? "var(--mpi-text)" : "var(--mpi-text-muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontWeight: 500,
            fontVariantNumeric: showDialCode ? "tabular-nums" : undefined,
          }}
        >
          {triggerLabel}
        </span>
        {disabled && showLock ? (
          <LockIcon style={{ color: "var(--mpi-text-muted)", flexShrink: 0 }} />
        ) : (
          <ChevronDownIcon style={{ color: "var(--mpi-text-secondary)", flexShrink: 0 }} />
        )}
      </button>

      {helperText && (
        <p
          role={error ? "alert" : undefined}
          style={{
            marginTop: 4,
            fontSize: 12,
            color: error ? "var(--mpi-error)" : "var(--mpi-text-secondary)",
          }}
        >
          {helperText}
        </p>
      )}

      {dropdownOpen && !disabled && (
        <div
          dir={isRtl ? "rtl" : "ltr"}
          role="dialog"
          aria-label="Select country"
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
          <div
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

          <div
            role="listbox"
            aria-label="Countries"
            className="mapatak-phone-scroll"
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
              const active = c.isoCode === valueIso;
              const localName = names[c.isoCode] || c.isoCode;
              return (
                <button
                  key={c.isoCode}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(c)}
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
                  {showDialCode && (
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
                  )}
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

export default CountrySelect;
export { CountrySelect };
