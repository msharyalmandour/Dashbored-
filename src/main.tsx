import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { ToastProvider } from "./context/ToastContext.tsx";
import { TourProvider } from "./context/TourContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <TourProvider>
              <App />
            </TourProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  </StrictMode>,
);
