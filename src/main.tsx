import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import AuthGate from "./components/AuthGate";
import GlobalHeader from "./components/GlobalHeader";
import { initTheme } from "./theme";
import "./index.css";

initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGate>
        <GlobalHeader />
        <App />
      </AuthGate>
    </BrowserRouter>
  </React.StrictMode>
);
