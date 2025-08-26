import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n"; // i18n 설정 파일 임포트

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
