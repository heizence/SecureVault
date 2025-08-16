import React from "react";
import "./Unlock.css";

interface UnlockProps {
  onUnlock: () => void;
}

const Unlock: React.FC<UnlockProps> = ({ onUnlock }) => {
  return (
    <div className="unlock-container">
      <div className="unlock-box">
        <h1>Secure Vault</h1>
        <p>Enter your master password to unlock.</p>
        <input type="password" placeholder="Master Password" />
        <button onClick={onUnlock}>Unlock</button>
      </div>
    </div>
  );
};

export default Unlock;
