import React, { useState } from "react";
import Header from "./components/Header";
import FileList from "./components/FileList";
import Sidebar from "./components/Sidebar";
import Settings from "./components/Settings";
import Unlock from "./components/Unlock";
import { EncryptedFile, Page } from "./types";
import "./App.css";

const dummyFiles: EncryptedFile[] = [
  {
    status: "Encrypted",
    encryptedDate: "2025-08-16",
    originalName: "annual_report.pdf",
    encryptedSize: "1.2 MB",
  },
  {
    status: "Encrypted",
    encryptedDate: "2025-08-15",
    originalName: "project_alpha_brief.docx",
    encryptedSize: "500 KB",
  },
  {
    status: "Encrypted",
    encryptedDate: "2025-08-14",
    originalName: "family_vacation.mp4",
    encryptedSize: "15.8 GB",
  },
  {
    status: "Encrypted",
    encryptedDate: "2025-08-12",
    originalName: "logo_design.ai",
    encryptedSize: "3.1 MB",
  },
];

const App: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<Page>("files");

  const handleUnlock = () => {
    setIsUnlocked(true);
    setActivePage("files");
  };

  const handleLock = () => {
    setIsUnlocked(false);
  };

  if (isUnlocked) {
    return (
      <div className="app-container">
        <Header onNavigate={setActivePage} onLogout={handleLock} />
        <div className="app-body">
          <Sidebar activePage={activePage} onNavigate={setActivePage} />
          <main className="app-content">
            {activePage === "files" && (
              <>
                <h1>Encrypted Files</h1>
                <div className="controls">
                  <button>Add New</button>
                  <input type="text" placeholder="Search files..." />
                </div>
                <FileList files={dummyFiles} />
              </>
            )}
            {activePage === "settings" && <Settings />}
          </main>
        </div>
      </div>
    );
  }

  return <Unlock onUnlock={handleUnlock} />;
};

export default App;
