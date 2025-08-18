import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { message } from "@tauri-apps/plugin-dialog";
import zxcvbn from "zxcvbn"; // 비밀번호 강도 측정 라이브러리
import "./Settings.css";

// 비밀번호 강도를 시각적으로 표시할 컴포넌트
const PasswordStrengthMeter: React.FC<{ score: number }> = ({ score }) => {
  const strength = {
    0: { text: "매우 약함", color: "#ef4444" },
    1: { text: "약함", color: "#f97316" },
    2: { text: "보통", color: "#eab308" },
    3: { text: "강함", color: "#84cc16" },
    4: { text: "매우 강함", color: "#22c55e" },
  }[score] || { text: "매우 약함", color: "#ef4444" };

  return (
    <div className="strength-meter-container">
      <div className="strength-meter-bar">
        {/* 점수에 따라 4개의 막대 중 일부를 채웁니다. */}
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

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
    // ... (유효성 검사 로직은 이전과 동일)

    try {
      await invoke("change_password", { oldPassword: currentPassword, newPassword: newPassword });
      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await message("Your password has been changed successfully.");
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-card">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Change Master Password</p>

        <div className="input-group">
          <label className="input-label">Current Password</label>
          <input
            type="password"
            className="input-field"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">New Password</label>
          <input
            type="password"
            className="input-field"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {/* 새 비밀번호 입력 시에만 강도 측정기 표시 */}
          {newPassword && <PasswordStrengthMeter score={passwordStrength} />}
        </div>

        <div className="input-group">
          <label className="input-label">Confirm New Password</label>
          <input
            type="password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && <p className="message error">{error}</p>}
        {success && <p className="message success">{success}</p>}

        <button className="button-primary" onClick={handlePasswordChange}>
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default Settings;
