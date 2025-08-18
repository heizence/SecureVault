import React from "react";
import "./Header.css";
import { Page } from "../types";

interface HeaderProps {
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, onLogout }) => {
  return (
    <header className="app-header">
      <div className="logo" onClick={() => onNavigate("files")}>
        <h2>Secure Vault</h2>
      </div>
      <nav className="main-nav">
        <ul></ul>
      </nav>
      <div className="user-info">
        <span>Welcome!</span>
        <button className="button" onClick={onLogout}>
          Lock
        </button>
      </div>
    </header>
  );
};

export default Header;
