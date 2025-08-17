import React, { useState } from "react";
import "./Unlock.css";

interface UnlockProps {
  onUnlock: (password: string) => Promise<void>;
}

const Unlock: React.FC<UnlockProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleUnlockClick = async () => {
    try {
      await onUnlock(password);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="unlock-container">
      <div className="unlock-box">
        <h1>Secure Vault</h1>
        <p>Enter your master password to unlock.</p>
        <input
          type="password"
          placeholder="Master Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUnlockClick()}
        />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button onClick={handleUnlockClick}>Unlock</button>
      </div>
    </div>
  );
};

export default Unlock;
