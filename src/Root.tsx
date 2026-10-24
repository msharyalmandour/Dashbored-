import { StrictMode } from "react";
import { HashRouter } from "react-router-dom";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { ToastProvider } from "./context/ToastContext.tsx";
import { TourProvider } from "./context/TourContext.tsx";

export default function Root() {
  return (
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
    </StrictMode>
  );
}
