import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import { App } from "./App";
import "./index.css";
import "./store/theme";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element missing");
}
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
