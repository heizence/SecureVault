import React from "react";

const Settings: React.FC = () => {
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
        <input type="password" style={inputStyle} />
      </div>
      <div style={inputGroupStyle}>
        <label style={labelStyle}>New Password</label>
        <input type="password" style={inputStyle} />
      </div>
      <div style={inputGroupStyle}>
        <label style={labelStyle}>Confirm New Password</label>
        <input type="password" style={inputStyle} />
      </div>
      <button>Save Changes</button>
    </div>
  );
};

export default Settings;
