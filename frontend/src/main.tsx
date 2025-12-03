import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./css/styles.css";


(() => {
  try {
    const saved = localStorage.getItem("theme");
    let initial: "light" | "dark" = "dark";
    if (saved === "light" || saved === "dark") initial = saved;
    else if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    )
      initial = "dark";
    else initial = "light";
    document.documentElement.setAttribute("data-theme", initial);
  } catch {}
})();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
