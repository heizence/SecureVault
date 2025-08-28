import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import "./Setup.css";

interface SetupProps {
  onSetupComplete: (password: string) => void;
}

const Setup: React.FC<SetupProps> = ({ onSetupComplete }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleCreateVault = async () => {
    if (!password || !confirm) {
      setErrorKey("error.allFieldsRequired");

      return;
    }

    if (password.length < 8) {
      setErrorKey("error.passwordTooShort");
      return;
    }
    if (password !== confirm) {
      setErrorKey("error.passwordsNoMatch");
      return;
    }
    try {
      await invoke("create_vault", { password });
      onSetupComplete(password);
      alert(t("messages.vaultCreatedSuccess"));
      setErrorKey("");
    } catch (e) {
      console.error(String(e));
      setErrorKey("error.operationFailed");
    }
  };

  return (
    <div className="setup-container">
      <LanguageSwitcher isAbsolute={true} />
      <div className="setup-box">
        <h1>{t("setup.title")}</h1>
        <p>{t("setup.prompt")}</p>
        <input
          className="setup-input"
          type="password"
          placeholder={t("setup.placeholder1")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="setup-input"
          type="password"
          placeholder={t("setup.placeholder2")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {errorKey && (
          <p style={{ color: "red" }} className="error-message">
            {t(errorKey)}
          </p>
        )}
        <button className="setup-button" onClick={handleCreateVault}>
          {t("setup.button")}
        </button>
      </div>
    </div>
  );
};

export default Setup;
