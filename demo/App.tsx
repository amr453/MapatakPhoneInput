import React, { useState } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { MapatakPhoneInput } from "../src";
import type { PhonePayload } from "../src";

const lightTheme = createTheme({ palette: { mode: "light" } });
const darkTheme = createTheme({ palette: { mode: "dark" } });

export default function App() {
  const [payload, setPayload] = useState<PhonePayload | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [dark, setDark] = useState(false);
  const [locale, setLocale] = useState<string>("en");
  const [size, setSize] = useState<"small" | "medium">("medium");
  const [disabled, setDisabled] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState("SA");

  const theme = dark ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", p: 4, backgroundColor: "background.default" }}>
        <Typography variant="h4" gutterBottom color="text.primary">
          MapatakPhoneInput Demo
        </Typography>

        {/* Controls */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Controls</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center" }}>
            <FormControlLabel
              control={<Switch checked={dark} onChange={(_, v) => setDark(v)} />}
              label="Dark Mode"
            />
            <FormControlLabel
              control={<Switch checked={disabled} onChange={(_, v) => setDisabled(v)} />}
              label="Disabled"
            />
            <Box>
              <Typography variant="caption">Locale</Typography>
              <Select size="small" value={locale} onChange={(e) => setLocale(e.target.value)} sx={{ ml: 1 }}>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="ar">Arabic</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="ur">Urdu</MenuItem>
              </Select>
            </Box>
            <Box>
              <Typography variant="caption">Size</Typography>
              <Select size="small" value={size} onChange={(e) => setSize(e.target.value as any)} sx={{ ml: 1 }}>
                <MenuItem value="small">Small</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
              </Select>
            </Box>
            <Box>
              <Typography variant="caption">Default Country</Typography>
              <Select size="small" value={defaultCountry} onChange={(e) => setDefaultCountry(e.target.value)} sx={{ ml: 1 }}>
                <MenuItem value="SA">Saudi Arabia</MenuItem>
                <MenuItem value="JO">Jordan</MenuItem>
                <MenuItem value="US">United States</MenuItem>
                <MenuItem value="GB">United Kingdom</MenuItem>
                <MenuItem value="AE">UAE</MenuItem>
                <MenuItem value="EG">Egypt</MenuItem>
              </Select>
            </Box>
          </Box>
        </Paper>

        {/* Phone Input */}
        <Paper sx={{ p: 3, mb: 3, maxWidth: 500 }}>
          <Typography variant="h6" gutterBottom>Phone Input</Typography>
          <MapatakPhoneInput
            defaultCountryIso={defaultCountry}
            onChange={setPayload}
            onValidationChange={setIsValid}
            disabled={disabled}
            locale={locale}
            size={size}
            required
          />
        </Paper>

        {/* Output */}
        <Paper sx={{ p: 3, maxWidth: 500 }}>
          <Typography variant="h6" gutterBottom>Output</Typography>
          <Typography variant="body2" color={isValid ? "success.main" : "text.secondary"}>
            Valid: {isValid ? "Yes" : "No"}
          </Typography>
          <Box
            component="pre"
            sx={{
              mt: 1, p: 2, borderRadius: 1,
              backgroundColor: "action.hover",
              fontSize: 13, overflow: "auto",
            }}
          >
            {payload ? JSON.stringify(payload, null, 2) : "No data yet"}
          </Box>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}
