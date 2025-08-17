import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface SetupProps {
  onSetupComplete: () => void;
}

const Setup: React.FC<SetupProps> = ({ onSetupComplete }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleCreateVault = async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await invoke("create_vault", { password });
      alert("Vault created successfully! The app will now reload.");
      onSetupComplete();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="unlock-container">
      <div className="unlock-box">
        <h1>Create Your Secure Vault</h1>
        <p>Choose a master password to protect your files.</p>
        <input
          type="password"
          placeholder="Master Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button onClick={handleCreateVault}>Create Vault</button>
      </div>
    </div>
  );
};

export default Setup;
