import React, { useState } from "react";
import { MapatakPhoneInput } from "../src";
import type { PhonePayload } from "../src";

// ---------------------------------------------------------------------------
// Demo App — pure Tailwind, zero MUI. Preview harness for MapatakPhoneInput.
// Consumers need Tailwind with the @mapatak/ui-theme preset for colours to
// resolve; here we use plain Tailwind defaults so the demo works standalone.
// ---------------------------------------------------------------------------

export default function App() {
  const [payload, setPayload] = useState<PhonePayload | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [dark, setDark] = useState(false);
  const [locale, setLocale] = useState<"en" | "ar" | "es" | "ur">("en");
  const [size, setSize] = useState<"small" | "medium">("medium");
  const [disabled, setDisabled] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState("SA");

  const surfaceClasses = dark
    ? "bg-neutral-900 text-neutral-100"
    : "bg-neutral-50 text-neutral-900";

  const panelClasses = dark
    ? "bg-neutral-800 border border-neutral-700"
    : "bg-white border border-neutral-200";

  return (
    <div className={`min-h-screen p-6 ${surfaceClasses}`} data-color-scheme={dark ? "dark" : "light"}>
      <h1 className="mb-6 text-2xl font-semibold">MapatakPhoneInput Demo</h1>

      {/* Controls */}
      <section className={`mb-4 rounded-lg p-4 ${panelClasses}`}>
        <h2 className="mb-3 text-base font-semibold">Controls</h2>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dark}
              onChange={(e) => setDark(e.target.checked)}
            />
            Dark Mode
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={disabled}
              onChange={(e) => setDisabled(e.target.checked)}
            />
            Disabled
          </label>

          <label className="flex items-center gap-2 text-sm">
            Locale:
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as typeof locale)}
              className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm"
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
              <option value="es">Spanish</option>
              <option value="ur">Urdu</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            Size:
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as "small" | "medium")}
              className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            Default Country:
            <select
              value={defaultCountry}
              onChange={(e) => setDefaultCountry(e.target.value)}
              className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm"
            >
              <option value="SA">Saudi Arabia</option>
              <option value="JO">Jordan</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="AE">UAE</option>
              <option value="EG">Egypt</option>
            </select>
          </label>
        </div>
      </section>

      {/* Phone Input */}
      <section className={`mb-4 max-w-[500px] rounded-lg p-4 ${panelClasses}`}>
        <h2 className="mb-3 text-base font-semibold">Phone Input</h2>
        <MapatakPhoneInput
          defaultCountryIso={defaultCountry}
          onChange={setPayload}
          onValidationChange={setIsValid}
          disabled={disabled}
          locale={locale}
          size={size}
          required
        />
      </section>

      {/* Output */}
      <section className={`max-w-[500px] rounded-lg p-4 ${panelClasses}`}>
        <h2 className="mb-2 text-base font-semibold">Output</h2>
        <p className={`text-sm ${isValid ? "text-green-600" : "text-neutral-500"}`}>
          Valid: {isValid ? "Yes" : "No"}
        </p>
        <pre
          className={`mt-2 overflow-auto rounded p-3 text-xs ${
            dark ? "bg-neutral-900" : "bg-neutral-100"
          }`}
        >
          {payload ? JSON.stringify(payload, null, 2) : "No data yet"}
        </pre>
      </section>
    </div>
  );
}
