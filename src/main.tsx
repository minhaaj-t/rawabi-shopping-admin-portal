import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./styles/admin-critical.css";
import { isLoggedIn } from "./lib/auth";
import { applyDocumentLocale, getStoredLocale } from "./lib/i18n";
import { applyPersonalize } from "./lib/personalize";

applyDocumentLocale(getStoredLocale());
applyPersonalize();

// Warm full theme early when already authenticated (login stays on critical CSS only).
if (isLoggedIn()) {
  void import("./styles/admin-theme.css");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
