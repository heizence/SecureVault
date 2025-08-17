import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { message } from "@tauri-apps/plugin-dialog";

const Settings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handlePasswordChange = async () => {
    // 입력값 유효성 검사
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      // Rust의 change_password 커맨드 호출
      await invoke("change_password", {
        oldPassword: currentPassword,
        newPassword: newPassword,
      });
      setSuccess("Password changed successfully!");
      // 입력 필드 초기화
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await message("Your password has been changed successfully.");
    } catch (e) {
      setError(String(e));
    }
  };

  // 스타일 정의 (이전과 동일)
  const containerStyle: React.CSSProperties = { padding: "20px" };
  const inputGroupStyle: React.CSSProperties = { marginBottom: "15px", maxWidth: "400px" };
  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxSizing: "border-box",
  };

  return (
    <div style={containerStyle}>
      <h1>Settings</h1>
      <h3>Change Master Password</h3>
      <div style={inputGroupStyle}>
        <label style={labelStyle}>Current Password</label>
        <input
          type="password"
          style={inputStyle}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div style={inputGroupStyle}>
        <label style={labelStyle}>New Password</label>
        <input
          type="password"
          style={inputStyle}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div style={inputGroupStyle}>
        <label style={labelStyle}>Confirm New Password</label>
        <input
          type="password"
          style={inputStyle}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}
      <button onClick={handlePasswordChange}>Save Changes</button>
    </div>
  );
};

export default Settings;
