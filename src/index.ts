// Copyright (c) 2026 Mapatak Platform. All rights reserved.
// PROPRIETARY & CONFIDENTIAL. Unauthorized copying, modification, or distribution is strictly prohibited.

export { default as MapatakPhoneInput } from "./MapatakPhoneInput";
export { default as CountrySelect } from "./CountrySelect";
export type { CountrySelectProps } from "./CountrySelect";
export type { MapatakPhoneInputProps, PhonePayload, CountryConfig, PhoneErrorKey, PhoneValidationError } from "./types";
export { COUNTRIES_CONFIG, getCountryByIso, getCountryByDialCode, getDefaultCountry } from "./countries-config";
export {
  validateAndBuildPayload,
  validatePhone,
  createPhoneSchemaForCountry,
  phonePayloadSchema,
  sanitizeInput,
  stripLeadingZero,
  resolveErrorMessage,
} from "./phone-validation";
export type { PhoneErrorKey as ValidationErrorKey } from "./phone-validation";
export { usePhoneField } from "./usePhoneForm";
