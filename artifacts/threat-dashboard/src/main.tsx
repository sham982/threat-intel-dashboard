import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { getApiBaseUrl } from "./config";

// Set the API base URL dynamically based on hostname
setBaseUrl(getApiBaseUrl());

// Set auth token getter
setAuthTokenGetter(() => localStorage.getItem("auth_token"));

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
