import React, { useState } from "react";
import Header from "./components/Header";
import FileList from "./components/FileList";
import Sidebar from "./components/Sidebar";
import Settings from "./components/Settings";
import Unlock from "./components/Unlock";
import { EncryptedFile, Page } from "./types";
import "./App.css";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

const dummyFiles: EncryptedFile[] = [
  // ... (dummyFiles 내용은 이전과 동일하게 유지)
];

const App: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<Page>("files");

  const handleUnlock = () => setIsUnlocked(true);
  const handleLock = () => setIsUnlocked(false);

  // 파일 암호화 함수 (수정 없음)
  const handleEncryptFile = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        title: "Select a file to encrypt",
      });
      if (typeof selectedPath === "string") {
        const password = window.prompt("Enter a password for this file:");
        if (password) {
          await invoke("encrypt_file", { filePath: selectedPath, password });
          alert("File encrypted successfully!");
        }
      }
    } catch (error) {
      console.error(error);
      alert(`Error: ${error}`);
    }
  };

  // --- 새로 추가된 파일 복호화 함수 ---
  const handleDecryptFile = async () => {
    try {
      // 1. .enc 파일 선택 다이얼로그 열기
      const selectedPath = await open({
        multiple: false,
        title: "Select a file to decrypt",
        filters: [{ name: "Encrypted Files", extensions: ["enc"] }],
      });

      if (typeof selectedPath === "string") {
        // 2. 사용자에게 비밀번호 입력받기
        const password = window.prompt("Enter the password for this file:");
        if (password) {
          // 3. Rust의 decrypt_file command 호출
          await invoke("decrypt_file", { filePath: selectedPath, password });
          alert("File decrypted successfully!");
        }
      }
    } catch (error) {
      console.error(error);
      alert(`Error: ${error}`);
    }
  };

  const handleOpenFile = (file: EncryptedFile) => {
    alert(`Opening ${file.originalName}... (placeholder)`);
    // TODO: 추후 실제 파일 열기 로직 구현
  };

  // 'Export' 버튼 클릭 시 실행될 함수
  const handleExportFile = (file: EncryptedFile) => {
    alert(`Exporting ${file.originalName}... (placeholder)`);
    // TODO: 추후 실제 파일 내보내기 로직 구현
  };

  // 'Delete' 버튼 클릭 시 실행될 함수
  const handleDeleteFile = (file: EncryptedFile) => {
    if (window.confirm(`Are you sure you want to delete ${file.originalName}?`)) {
      alert(`Deleting ${file.originalName}... (placeholder)`);
      // TODO: 추후 실제 파일 삭제 로직 구현
    }
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
                  <button onClick={handleEncryptFile}>Encrypt File</button>
                  <button onClick={handleDecryptFile} style={{ marginLeft: "10px" }}>
                    Decrypt File
                  </button>
                  <input type="text" placeholder="Search files..." />
                </div>
                {/* FileList에 새로 만든 핸들러 함수들을 props로 전달 */}
                <FileList
                  files={dummyFiles}
                  onOpenFile={handleOpenFile}
                  onExportFile={handleExportFile}
                  onDeleteFile={handleDeleteFile}
                />
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
