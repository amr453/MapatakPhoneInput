// Copyright (c) 2026 Mapatak Platform. All rights reserved.
// PROPRIETARY & CONFIDENTIAL. Unauthorized copying, modification, or distribution is strictly prohibited.

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  TextField, InputAdornment, Box, Typography,
  Paper, ClickAwayListener, IconButton, Divider,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import SearchIcon from "@mui/icons-material/Search";
import { COUNTRIES_CONFIG, getDefaultCountry } from "./countries-config";
import { validateAndBuildPayload, sanitizeInput, stripLeadingZero, resolveErrorMessage } from "./phone-validation";
import type { CountryConfig, MapatakPhoneInputProps, PhonePayload, PhoneValidationError } from "./types";
import arData from "./i18n/ar.json";
import enData from "./i18n/en.json";
import esData from "./i18n/es.json";
import urData from "./i18n/ur.json";

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

// --- Extracted Style Objects ---
const S_ROOT = (fw: boolean) => ({
  position: "relative" as const,
  width: fw ? "100%" : "auto",
});
const S_INPUT_BASE = (sz: string) => ({
  "& .MuiInputBase-root": { height: sz === "small" ? "40px" : "48px" },
});
const S_ADORNMENT = { mr: 0 };
const S_FLAG_BTN = {
  borderRadius: "8px", px: 1, py: 0.5, gap: 0.5,
  direction: "ltr" as const,
  "&:hover": { backgroundColor: "action.hover" },
};
const S_FLAG_TEXT = { fontSize: "22px", lineHeight: 1 };
const S_DIAL_TEXT = {
  fontSize: "14px", fontWeight: 500,
  color: "text.primary", fontFamily: "monospace",
  direction: "ltr" as const,
};
const S_ARROW = { fontSize: 18, color: "text.secondary" };
const S_DIVIDER = { mx: 0.5, borderColor: "divider" };
const S_DROPDOWN = {
  position: "absolute" as const,
  top: "100%", left: 0, right: 0, zIndex: 1300,
  mt: 0.5, maxHeight: 360, overflow: "hidden",
  display: "flex", flexDirection: "column" as const,
  borderRadius: 2, border: "1px solid", borderColor: "divider",
};
const S_SEARCH_BOX = {
  p: 1.5, borderBottom: "1px solid", borderColor: "divider",
  display: "flex", alignItems: "center", gap: 1,
};
const S_SEARCH_INPUT = {
  "& .MuiInputBase-root": { height: 40, fontSize: 14 },
  "& fieldset": { borderColor: "divider" },
};
const S_LIST = { overflowY: "auto" as const, flex: 1 };
const S_ROW = (active: boolean) => ({
  display: "flex", alignItems: "center", gap: 1.5,
  px: 2, py: 1, cursor: "pointer",
  backgroundColor: active ? "action.selected" : "transparent",
  "&:hover": { backgroundColor: "action.hover" },
});
const S_ROW_FLAG = { fontSize: 22, width: 28, textAlign: "center" as const };
const S_ROW_NAME = { flex: 1, fontSize: 14 };
const S_ROW_DIAL = { fontSize: 13, color: "text.secondary", fontFamily: "monospace", direction: "ltr" as const };
const S_EMPTY = { p: 3, textAlign: "center" as const, color: "text.disabled", fontSize: 14 };

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
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(
    () => getDefaultCountry(defaultCountryIso)
  );
  const [phoneNumber, setPhoneNumber] = useState<string>(value);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [validationError, setValidationError] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const localeData = LOCALE_MAP[locale] || LOCALE_MAP.en;
  const names = localeData.countries;
  const isRtl = locale === "ar" || locale === "ur";

  // --- Sort + Filter (alphabetical by locale name) ---
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

  // --- Resolve error message from key + params ---
  const resolveValidationError = useCallback(
    (err: PhoneValidationError): string => {
      const template = localeData.errors[err.key] || err.key;
      return resolveErrorMessage(template, err.params);
    },
    [localeData]
  );

  // --- Validation ---
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
    const raw = e.target.value.replace(/[^\d]/g, "");
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
    if (dropdownOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [dropdownOpen]);

  const showError = externalError || !!validationError;
  const helperMsg = externalHelperText || validationError;
  const phoneInputProps = {
    dir: "ltr" as const,
    inputMode: "tel" as const,
    maxLength: selectedCountry.maxLength + 1,
    style: {
      fontSize: "16px",
      letterSpacing: "0.5px",
    },
  };

  const searchInputProps = { dir: isRtl ? "rtl" as const : "ltr" as const };

  return (
    <Box ref={anchorRef} dir="ltr" sx={S_ROOT(fullWidth)}>
      <TextField
        inputRef={inputRef}
        value={phoneNumber}
        onChange={handlePhoneChange}
        disabled={disabled}
        error={showError}
        helperText={helperMsg}
        required={required}
        label={label}
        placeholder={placeholder || selectedCountry.exampleNumber}
        size={size}
        fullWidth={fullWidth}
        inputProps={phoneInputProps}
        sx={S_INPUT_BASE(size)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start" sx={S_ADORNMENT}>
              <IconButton
                onClick={() => setDropdownOpen((o) => !o)}
                disabled={disabled}
                size="small"
                sx={S_FLAG_BTN}
              >
                <Typography component="span" sx={S_FLAG_TEXT}>
                  {selectedCountry.flag}
                </Typography>
                <Typography component="span" sx={S_DIAL_TEXT}>
                  +{selectedCountry.dialCode}
                </Typography>
                <ArrowDropDownIcon sx={S_ARROW} />
              </IconButton>
              <Divider orientation="vertical" flexItem sx={S_DIVIDER} />
            </InputAdornment>
          ),
        }}
      />

      {dropdownOpen && (
        <ClickAwayListener
          onClickAway={() => { setDropdownOpen(false); setSearchTerm(""); }}
        >
          <Paper elevation={8} dir={isRtl ? "rtl" : "ltr"} sx={S_DROPDOWN}>
            <Box sx={S_SEARCH_BOX}>
              <SearchIcon sx={S_ARROW} />
              <TextField
                inputRef={searchRef}
                size="small"
                fullWidth
                placeholder={localeData.ui.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                inputProps={searchInputProps}
                sx={S_SEARCH_INPUT}
              />
            </Box>
            <Box sx={S_LIST}>
              {sortedAndFiltered.map((c) => (
                <Box
                  key={c.isoCode}
                  onClick={() => handleCountrySelect(c)}
                  sx={S_ROW(c.isoCode === selectedCountry.isoCode)}
                >
                  <Typography sx={S_ROW_FLAG}>{c.flag}</Typography>
                  <Typography sx={S_ROW_NAME}>
                    {names[c.isoCode] || c.isoCode}
                  </Typography>
                  <Typography sx={S_ROW_DIAL}>+{c.dialCode}</Typography>
                </Box>
              ))}
              {sortedAndFiltered.length === 0 && (
                <Box sx={S_EMPTY}>
                  {localeData.ui.noResults}
                </Box>
              )}
            </Box>
          </Paper>
        </ClickAwayListener>
      )}
    </Box>
  );
};

export default MapatakPhoneInput;
export { MapatakPhoneInput };
