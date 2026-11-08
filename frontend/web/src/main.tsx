import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./style.css";

function AppRoot() {
  useEffect(() => {
    window.dispatchEvent(new Event("campusfind:app-ready"));
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>,
);
