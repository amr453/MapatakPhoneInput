// Copyright (c) 2026 Mapatak Platform. All rights reserved.
// PROPRIETARY & CONFIDENTIAL. Unauthorized copying, modification, or distribution is strictly prohibited.

import { useCallback, useState, type Ref } from "react";
import { useController, type Control, type FieldValues, type Path } from "react-hook-form";
import type { PhonePayload } from "./types";

interface UsePhoneFieldReturn {
  value: unknown;
  onChange: (payload: PhonePayload | null) => void;
  onValidationChange: (valid: boolean) => void;
  error: boolean;
  helperText: string;
  ref: Ref<unknown>;
}

export function usePhoneField<T extends FieldValues>(
  control: Control<T>, name: Path<T>, required = false
): UsePhoneFieldReturn {
  const [isValid, setIsValid] = useState(false);
  const { field, fieldState } = useController({
    control, name,
    rules: {
      validate: () => {
        if (required && !isValid) return "Phone number is required";
        if (!isValid) return "Invalid phone number";
        return true;
      },
    },
  });
  const handleChange = useCallback(
    (payload: PhonePayload | null) => { field.onChange(payload as T[Path<T>]); },
    [field]
  );
  return {
    value: field.value,
    onChange: handleChange,
    onValidationChange: setIsValid,
    error: !!fieldState.error,
    helperText: fieldState.error?.message || "",
    ref: field.ref,
  };
}
