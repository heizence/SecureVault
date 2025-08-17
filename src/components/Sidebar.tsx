import React from "react";
import "./Sidebar.css";
import { Page } from "../types";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">Menu</div>
      <nav className="sidebar-nav">
        <ul>
          <li className={activePage === "files" ? "active" : ""}>
            <a href="#" onClick={() => onNavigate("files")}>
              Handle Files
            </a>
          </li>
          <li className={activePage === "settings" ? "active" : ""}>
            <a href="#" onClick={() => onNavigate("settings")}>
              Settings
            </a>
          </li>
          <li>
            <a href="#">Help</a>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
