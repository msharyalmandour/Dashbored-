import { StrictMode } from "react";
import { HashRouter } from "react-router-dom";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { ToastProvider } from "./context/ToastContext.tsx";
import { TourProvider } from "./context/TourContext.tsx";

export default function Root() {
  return (
    <StrictMode>
      <AppErrorBoundary>
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
      </AppErrorBoundary>
    </StrictMode>
  );
}
