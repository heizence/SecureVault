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
import ProgressDialog from "./components/ProcessDialog";
import { listen } from "@tauri-apps/api/event";

type VaultState = "checking" | "needs_setup" | "locked" | "unlocked";

const App: React.FC = () => {
  const [vaultState, setVaultState] = useState<VaultState>("checking");
  const [activePage, setActivePage] = useState<Page>("files");
  const [showDialog, setShowDialog] = useState({
    isOpen: false,
    type: 0, // 0 : encryption, 1 : decryption
  });
  const [progress, setProgress] = useState({
    isVisible: false,
    status: "processing" as "processing" | "done" | "error",
    currentFile: "",
    totalFiles: 0,
    currentFileNumber: 0,
    totalProgress: 0,
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

  const startOperation = (initialFileName: string, totalFiles: number) => {
    setProgress({
      isVisible: true,
      status: "processing",
      currentFile: initialFileName,
      totalFiles: totalFiles,
      currentFileNumber: 1,
      totalProgress: 0,
    });
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

      if (Array.isArray(selectedPaths) && selectedPaths.length > 0) {
        startOperation(selectedPaths[0], selectedPaths.length);
        await invoke("encrypt_files_with_progress", {
          files: selectedPaths,
          destinationDir: destDir,
        });
      }
    } catch (error) {
      await message(`Error: ${error}`);
    } finally {
      setProgress((prev) => ({
        ...prev,
        status: "done",
      }));
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

      if (Array.isArray(selectedPaths) && selectedPaths.length > 0) {
        startOperation(selectedPaths[0], selectedPaths.length);
        await invoke("decrypt_files_with_progress", { files: selectedPaths });
      }
    } catch (error) {
      await message(`Error: ${error}`);
    } finally {
    }
  };

  const handleCancel = async () => {
    await invoke("cancel_operation");
    setProgress({
      isVisible: false,
      status: "processing",
      currentFile: "",
      totalFiles: 0,
      currentFileNumber: 0,
      totalProgress: 0,
    });
    message("Operation has been cancelled.");
  };

  // ProgressDialog 닫기 함수
  const handleCloseProgress = () => {
    setProgress({
      isVisible: false,
      status: "processing",
      currentFile: "",
      totalFiles: 0,
      currentFileNumber: 0,
      totalProgress: 0,
    });
  };

  const handleSecureDelete = async () => {
    try {
      const selectedPaths = await open({
        multiple: true,
        title: "Select a file to securely delete",
      });

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

  // progress dialog 이벤트 리스너 설정
  useEffect(() => {
    const unlistenProgress = listen<{
      current_file_path: string;
      total_files: number;
      current_file_number: number;
      total_progress: number;
    }>("PROGRESS_EVENT", (event) => {
      const { current_file_path, total_files, current_file_number, total_progress } = event.payload;

      if (current_file_path === "Done") {
        setProgress((prev) => ({ ...prev, status: "done", totalProgress: 100 }));
      } else {
        setProgress({
          isVisible: true,
          status: "processing",
          currentFile: current_file_path,
          totalFiles: total_files,
          currentFileNumber: current_file_number,
          totalProgress: total_progress * 100,
        });
      }
    });

    // 에러 이벤트 리스너 (선택사항이지만 추가하면 좋음)
    const unlistenError = listen<string>("ERROR_EVENT", (event) => {
      setProgress({
        isVisible: false,
        status: "processing",
        currentFile: "",
        totalFiles: 0,
        currentFileNumber: 0,
        totalProgress: 0,
      });
      message(`An error occurred: ${event.payload}`, { title: "Operation Failed" });
    });

    return () => {
      unlistenProgress.then((f) => f());
      unlistenError.then((f) => f());
    };
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
      {progress.isVisible && (
        <ProgressDialog
          status={progress.status}
          currentFile={progress.currentFile}
          totalFiles={progress.totalFiles}
          currentFileNumber={progress.currentFileNumber}
          totalProgress={progress.totalProgress}
          onCancel={handleCancel}
          onClose={handleCloseProgress}
        />
      )}
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
};

export default App;
