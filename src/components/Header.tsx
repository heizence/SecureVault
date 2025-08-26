import React from "react";
import { Page } from "../types";
import LanguageSwitcher from "./LanguageSwitcher";
import "./Header.css";
interface HeaderProps {
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, onLogout }) => {
  return (
    <header className="app-header">
      <div className="logo" onClick={() => onNavigate("encrypt")}>
        SecureVault
      </div>

      <div className="header-actions">
        <LanguageSwitcher isAbsolute={false} />
        <div className="user-info">
          <button className="lock-button" onClick={onLogout}>
            Lock
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
