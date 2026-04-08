# MapatakPhoneInput — Build Report

> **Date:** 2026-04-08
> **Version:** 1.0.0
> **Status:** Library Complete

---

## File Inventory

| File | Size | Purpose |
|------|------|---------|
| `package.json` | Config | @mapatak/phone-input, peerDependencies |
| `tsconfig.json` | Config | TypeScript strict mode, ES2022 target |
| `src/types.ts` | Types | CountryConfig, PhonePayload, MapatakPhoneInputProps, PhoneValidationError |
| `src/countries-config.ts` | Data | **196 countries** with dial codes, lengths, prefixes, regex patterns |
| `src/phone-validation.ts` | Logic | 5-level Zod validation + E.164 payload builder |
| `src/MapatakPhoneInput.tsx` | UI | Main component (MUI v6, RTL-safe, searchable dropdown) |
| `src/usePhoneForm.ts` | Hook | React Hook Form integration |
| `src/index.ts` | Exports | Public API barrel |
| `src/i18n/ar.json` | i18n | Arabic — 196 countries + 5 errors + UI strings |
| `src/i18n/en.json` | i18n | English — 196 countries + 5 errors + UI strings |
| `src/i18n/es.json` | i18n | Spanish — 196 countries + 5 errors + UI strings |
| `src/i18n/ur.json` | i18n | Urdu — 196 countries + 5 errors + UI strings |

**Total: 12 files**

---

## Coverage: 196 Countries

| Region | Count |
|--------|-------|
| Africa | 54 |
| Asia | 48 |
| Europe | 45 |
| Americas | 35 |
| Oceania | 14 |
| **Total** | **196** |

---

## Validation Engine: 5 Error Types

| # | Error Key | Trigger | Params |
|---|-----------|---------|--------|
| 1 | `required` | Empty input | — |
| 2 | `tooShort` | Length < minLength | `{ minLength }` |
| 3 | `tooLong` | Length > maxLength | `{ maxLength }` |
| 4 | `invalidPrefix` | Wrong leading digit | `{ validPrefixes }` |
| 5 | `invalidFormat` | Non-digits or regex fail | — |

---

## Output: PhonePayload (E.164)

```typescript
{
  fullWithPlus: "+966501234567",    // E.164 — WhatsApp, Twilio, most APIs
  fullWithoutPlus: "966501234567",  // Some local SMS gateways
  nationalNumber: "501234567",      // Display/stats
  countryCode: "SA",                // ISO 3166-1 alpha-2
  dialCode: "966"                   // Country calling code
}
```

---

## i18n: 4 Languages

| Language | Countries | Errors | UI | Direction |
|----------|-----------|--------|----|-----------|
| Arabic (ar) | 196 | 5 | 2 | RTL |
| English (en) | 196 | 5 | 2 | LTR |
| Spanish (es) | 196 | 5 | 2 | LTR |
| Urdu (ur) | 196 | 5 | 2 | RTL |

---

## Tech Stack

| Technology | Version | Role |
|------------|---------|------|
| React | 18+ | UI Framework |
| TypeScript | 5.x | Type Safety (strict) |
| MUI | v6.x | TextField, InputAdornment, Paper |
| Zod | Latest | Schema Validation |
| React Hook Form | Latest | Form Integration |

---

## Key Design Decisions

1. **Zero external phone libraries** — 100% custom built on MUI
2. **dir="ltr" lock** — Numeric input always LTR (prevents RTL corruption)
3. **Alphabetical sorting by locale** — Dropdown sorts country names per active language
4. **Searchable dropdown** — Search by name, ISO code, or dial code
5. **E.164 output** — SMS/WhatsApp gateway ready
6. **5-level validation** — Catches every input error before submission
7. **Country-specific regex** — Each of 196 countries has verified national number patterns
8. **Proprietary headers** — IP protection on all source files
9. **MapatakContext coupling** — Deep platform integration prevents standalone extraction

---

## Data Sources

All 196 country configurations (dial codes, number lengths, prefix patterns, regex) are based on:
- ITU-T E.164 standards
- National numbering plan regulations
- Verified against live SMS gateway requirements

---

## Integration Example

```tsx
import { MapatakPhoneInput, usePhoneField } from "@mapatak/phone-input";

// Basic
<MapatakPhoneInput defaultCountryIso="SA" locale="ar" onChange={handleChange} />

// With React Hook Form
const phoneField = usePhoneField(control, "phone", true);
<MapatakPhoneInput {...phoneField} defaultCountryIso="SA" locale="ar" />
```
