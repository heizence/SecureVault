import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import "./Unlock.css";

interface UnlockProps {
  onUnlock: (password: string) => Promise<void>;
}

const Unlock: React.FC<UnlockProps> = ({ onUnlock }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleUnlockClick = async () => {
    setErrorKey(""); // 이전 에러 메시지 초기화

    try {
      await onUnlock(password);
    } catch (e) {
      console.error(String(e));
      setErrorKey("error.operationFailed");
    }
  };

  return (
    <div className="unlock-container">
      <LanguageSwitcher isAbsolute={true} />
      <div className="unlock-box">
        <h1>SecureVault</h1>
        <p>{t("unlock.prompt")}</p>
        <input
          type="password"
          className="unlock-input"
          placeholder={t("unlock.placeholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUnlockClick()}
        />
        {errorKey && <p className="error-message">{t(errorKey)}</p>}
        <button className="unlock-button" onClick={handleUnlockClick}>
          {t("unlock.button")}
        </button>
      </div>
    </div>
  );
};

export default Unlock;
