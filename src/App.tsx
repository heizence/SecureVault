import React, { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Settings from "./components/Settings";
import Unlock from "./components/Unlock";
import { Page } from "./types";
import "./App.css";
import { invoke } from "@tauri-apps/api/core";
import { open, message, ask } from "@tauri-apps/plugin-dialog";
import InputDialog from "./components/InputDialog";

const App: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<Page>("files");

  const [showDialog, setShowDialog] = useState({
    isOpen: false,
    type: 0, // 0 : encryption, 1 : decryption
  });

  const handleUnlock = () => setIsUnlocked(true);
  const handleLock = () => setIsUnlocked(false);

  // 파일 암호화 함수 (수정 없음)
  const handleEncryptFile = async (password: string) => {
    try {
      // dialog.open()을 @tauri-apps/api에서 가져온 것으로 사용합니다.
      const selectedPath = await open({
        multiple: false,
        title: "Select a file to encrypt",
      });

      if (typeof selectedPath === "string") {
        if (password) {
          await invoke("encrypt_file", { filePath: selectedPath, password });
          await message("File encrypted successfully!");
        }
      }
    } catch (error) {
      console.error(error);
      await message(`Error: ${error}`);
    }
  };

  // --- 새로 추가된 파일 복호화 함수 ---
  const handleDecryptFile = async (password: string) => {
    try {
      // 1. .enc 파일 선택 다이얼로그 열기
      const selectedPath = await open({
        multiple: false,
        title: "Select a file to decrypt",
        filters: [{ name: "Encrypted Files", extensions: ["enc"] }],
      });

      if (typeof selectedPath === "string") {
        // 2. 사용자에게 비밀번호 입력받기
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

  const handleSecureDelete = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        title: "Select a file to securely delete",
      });

      if (typeof selectedPath === "string") {
        const confirmed = await ask(
          `WARNING: This will permanently delete the file.\n\n${selectedPath}\n\nThis action cannot be undone. Are you sure?`,
          {
            title: "Confirm Secure Deletion",
            okLabel: "Delete Permanently",
            cancelLabel: "Cancel",
            type: "warning",
          }
        );

        if (confirmed) {
          await invoke("secure_delete_file", { filePath: selectedPath });
          await message("File securely deleted successfully.");
        }
      }
    } catch (error) {
      console.error(error);
      await message(`Error: ${error}`);
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
                  <button onClick={() => setShowDialog({ isOpen: true, type: 0 })}>
                    Encrypt File
                  </button>
                  <button
                    onClick={() => setShowDialog({ isOpen: true, type: 1 })}
                    style={{ marginLeft: "10px" }}
                  >
                    Decrypt File
                  </button>
                  <button
                    onClick={handleSecureDelete}
                    style={{ marginLeft: "10px", backgroundColor: "#dc3545", color: "white" }}
                  >
                    Securely Delete File
                  </button>
                </div>
              </>
            )}
            {activePage === "settings" && <Settings />}
            {showDialog.isOpen && (
              <InputDialog
                onSubmit={(val) => {
                  if (showDialog.type === 0) handleEncryptFile(val);
                  else handleDecryptFile(val);
                }}
                onClose={() => setShowDialog({ isOpen: false, type: 0 })}
              />
            )}
          </main>
        </div>
      </div>
    );
  }

  return <Unlock onUnlock={handleUnlock} />;
};

export default App;
