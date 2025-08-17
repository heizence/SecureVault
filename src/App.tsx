import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, message, ask } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Settings from "./components/Settings";
import Unlock from "./components/Unlock";
import { Page } from "./types";
import "./App.css";
import InputDialog from "./components/InputDialog";
import Setup from "./components/Setup";
import LoadingSpinner from "./components/LoadingSpinner"; // 로딩 스피너 임포트

type VaultState = "checking" | "needs_setup" | "locked" | "unlocked";

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false); // 로딩 상태 추가
  const [vaultState, setVaultState] = useState<VaultState>("checking");
  const [activePage, setActivePage] = useState<Page>("files");

  const [showDialog, setShowDialog] = useState({
    isOpen: false,
    type: 0, // 0 : encryption, 1 : decryption
  });

  const handleUnlock = async (password: string) => {
    try {
      await invoke("unlock_vault", { password });
      setVaultState("unlocked");
    } catch (e) {
      throw e;
    }
  };

  const handleLock = () => {
    setVaultState("locked");
  };

  // 파일 암호화 함수
  const handleEncryptFile = async () => {
    try {
      // 1. 저장할 폴더를 먼저 선택합니다.
      const destDir = await open({
        title: "Select folder to save encrypted files",
        directory: true, // 폴더 선택 모드
      });
      if (typeof destDir !== "string") return; // 폴더 선택 안 했으면 종료

      const selectedPaths = await open({ multiple: true, title: "Select a file to encrypt" });

      setIsLoading(true);
      if (Array.isArray(selectedPaths) && selectedPaths.length > 0) {
        for (const filePath of selectedPaths) {
          await invoke("encrypt_file", { filePath, destinationDir: destDir });
        }
        await message(`${selectedPaths.length} file(s) encrypted successfully!`);
      }
    } catch (error) {
      await message(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 파일 복호화 함수
  const handleDecryptFile = async () => {
    try {
      const selectedPaths = await open({
        multiple: true,
        title: "Select a file to decrypt",
        filters: [{ name: "Encrypted Files", extensions: ["enc"] }],
      });

      setIsLoading(true);
      if (Array.isArray(selectedPaths) && selectedPaths.length > 0) {
        for (const filePath of selectedPaths) {
          await invoke("decrypt_file", { filePath });
        }
        await message(`${selectedPaths.length} file(s) decrypted successfully!`);
      }
    } catch (error) {
      await message(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecureDelete = async () => {
    try {
      const selectedPaths = await open({
        multiple: true,
        title: "Select a file to securely delete",
      });

      setIsLoading(true);
      if (Array.isArray(selectedPaths) && selectedPaths.length > 0) {
        const confirmed = await ask(
          `WARNING: This will permanently delete files. \n\nThis action cannot be undone. Are you sure?`,
          {
            title: "Confirm Secure Deletion",
            okLabel: "Delete Permanently",
            cancelLabel: "Cancel",
          }
        );
        if (!confirmed) return;

        for (const filePath of selectedPaths) {
          await invoke("secure_delete_file", { filePath });
        }
        await message(`${selectedPaths.length} file(s) deleted successfully!`);
      }
    } catch (error) {
      console.error(error);
      await message(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 앱 시작 시 vault 상태 확인
  useEffect(() => {
    invoke<boolean>("vault_exists")
      .then((exists) => {
        setVaultState(exists ? "locked" : "needs_setup");
      })
      .catch(console.error);
  }, []);

  // --- 화면 렌더링 로직 ---
  if (vaultState === "checking") {
    return <div>Checking vault status...</div>;
  }
  if (vaultState === "needs_setup") {
    return <Setup onSetupComplete={relaunch} />;
  }
  if (vaultState === "locked") {
    return <Unlock onUnlock={handleUnlock} />;
  }

  return (
    <div className="app-container">
      {isLoading && <LoadingSpinner />}
      <Header onNavigate={setActivePage} onLogout={handleLock} />
      <div className="app-body">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <main className="app-content">
          {activePage === "files" && (
            <>
              <h1>Handle Files</h1>
              <div className="controls">
                <button
                  className="app-buttons"
                  onClick={() => setShowDialog({ isOpen: true, type: 0 })}
                >
                  Encrypt Files
                </button>
                <button
                  className="app-buttons"
                  onClick={() => setShowDialog({ isOpen: true, type: 1 })}
                >
                  Decrypt Files
                </button>
                <button
                  className="app-buttons"
                  onClick={handleSecureDelete}
                  style={{ backgroundColor: "#dc3545", borderColor: "#dc3545", color: "white" }}
                >
                  Securely Delete Files
                </button>
              </div>
            </>
          )}
          {activePage === "settings" && <Settings />}
          {showDialog.isOpen && (
            <InputDialog
              onSubmit={() => {
                if (showDialog.type === 0) handleEncryptFile();
                else handleDecryptFile();
              }}
              onClose={() => setShowDialog({ isOpen: false, type: 0 })}
            />
          )}
        </main>
      </div>
    </div>
  );

  return <Unlock onUnlock={handleUnlock} />;
};

export default App;
