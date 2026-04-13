// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // optional

// Hardcode your browser key here for now (replace with your real key)
const TEST_BROWSER_KEY = ""; // <-- replace

// Set maps options once at app start
if (!window._gmapsOptionsSet) {
  if (!TEST_BROWSER_KEY) {
    console.warn("[main] No Google Maps key found. Map will likely fail.");
  } else {
    // new API: setOptions before importLibrary calls
    import("@googlemaps/js-api-loader").then(({ setOptions }) => {
      setOptions({ apiKey: TEST_BROWSER_KEY, version: "weekly" });
      window._gmapsOptionsSet = true;
      console.log("[main] Google Maps setOptions called.");
    }).catch((e) => {
      console.warn("Failed to set Google Maps options", e);
    });
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
