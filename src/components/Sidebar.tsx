import React from "react";
import { useTranslation } from "react-i18next";
import { Page } from "../types";
import "./Sidebar.css";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const { t } = useTranslation();

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">Menu</div>
      <nav className="sidebar-nav">
        <ul>
          {/* --- 메뉴 항목 변경 --- */}
          <li className={activePage === "encrypt" ? "active" : ""}>
            <a href="#" onClick={() => onNavigate("encrypt")}>
              {t("encrypt.title")}
            </a>
          </li>
          <li className={activePage === "decrypt" ? "active" : ""}>
            <a href="#" onClick={() => onNavigate("decrypt")}>
              {t("decrypt.title")}
            </a>
          </li>
          <li className={activePage === "delete" ? "active" : ""}>
            <a href="#" onClick={() => onNavigate("delete")}>
              {t("delete.title")}
            </a>
          </li>
          <li className={activePage === "settings" ? "active" : ""}>
            <a href="#" onClick={() => onNavigate("settings")}>
              {t("settings.title")}
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
