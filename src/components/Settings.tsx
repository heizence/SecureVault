import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { message } from "@tauri-apps/plugin-dialog";
import zxcvbn from "zxcvbn";
import "./Settings.css";

// 비밀번호 강도를 시각적으로 표시할 컴포넌트
const PasswordStrengthMeter: React.FC<{ score: number }> = ({ score }) => {
  const { t } = useTranslation();

  const strength = {
    0: { text: t("passwordCheck.veryWeak"), color: "#ef4444" },
    1: { text: t("passwordCheck.weak"), color: "#f97316" },
    2: { text: t("passwordCheck.fair"), color: "#eab308" },
    3: { text: t("passwordCheck.strong"), color: "#84cc16" },
    4: { text: t("passwordCheck.veryStrong"), color: "#22c55e" },
  }[score] || { text: t("passwordCheck.weakest"), color: "#ef4444" };

  return (
    <div className="strength-meter-container">
      <div className="strength-meter-bar">
        {Array.from(Array(4).keys()).map((i) => (
          <div
            key={i}
            className="strength-meter-segment"
            style={{ backgroundColor: i < score + 1 ? strength.color : undefined }}
          ></div>
        ))}
      </div>
      <span style={{ color: strength.color, fontWeight: 500 }}>{strength.text}</span>
    </div>
  );
};

const Settings: React.FC = () => {
  const { t } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // 새 비밀번호가 입력될 때마다 강도를 다시 계산합니다.
  useEffect(() => {
    if (newPassword) {
      const result = zxcvbn(newPassword);
      setPasswordStrength(result.score); // score는 0에서 4까지의 정수
    } else {
      setPasswordStrength(0);
    }
  }, [newPassword]);

  const handlePasswordChange = async () => {
    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setErrorKey("error.allFieldsRequired");
        return;
      }

      if (newPassword.length < 8) {
        setErrorKey("error.passwordTooShort");
        return;
      }

      if (newPassword !== confirmPassword) {
        setErrorKey("error.passwordsNoMatch");
        return;
      }

      await invoke("change_password", { oldPassword: currentPassword, newPassword: newPassword });
      setErrorKey("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await message(t("messages.changePasswordSuccess"));
    } catch (e) {
      // 이전 비밀번호가 틀린 경우
      console.error(String(e));
      setErrorKey("error.oldPasswordNoMatch");
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-card">
        <h1 className="settings-title">{t("settings.title")}</h1>
        <p className="settings-subtitle">{t("settings.changePassword")}</p>

        <div className="input-group">
          <label className="input-label">{t("settings.currentPassword")}</label>
          <input
            type="password"
            className="input-field"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">{t("settings.newPassword")}</label>
          <input
            type="password"
            className="input-field"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          {newPassword && <PasswordStrengthMeter score={passwordStrength} />}
        </div>

        <div className="input-group">
          <label className="input-label">{t("settings.confirmPassword")}</label>
          <input
            type="password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {errorKey && (
          <p style={{ color: "red" }} className="message error">
            {t(errorKey)}
          </p>
        )}

        <button className="button-primary" onClick={handlePasswordChange}>
          {t("settings.button")}
        </button>
      </div>
    </div>
  );
};

export default Settings;
