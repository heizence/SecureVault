import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, message, ask } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { listen } from "@tauri-apps/api/event";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Settings from "./components/Settings";
import Unlock from "./components/Unlock";
import Setup from "./components/Setup";
import ProgressDialog from "./components/ProgressDialog";
import StagedFileList from "./components/StagedFileList";
import { Page } from "./types";
import "./App.css";
import FileSelector from "./components/FileSelector";

type VaultState = "checking" | "needs_setup" | "locked" | "unlocked";

interface StagedFile {
  path: string;
}

interface ProgressPayload {
  status: string;
  current_file_path: string;
  total_files: number;
  current_file_number: number;
  total_progress: number;
}

const App: React.FC = () => {
  const [vaultState, setVaultState] = useState<VaultState>("checking");
  const [activePage, setActivePage] = useState<Page>("files");
  const [activeTab, setActiveTab] = useState<"encrypt" | "decrypt" | "delete">("encrypt");
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [progress, setProgress] = useState({
    isVisible: false,
    status: "processing" as "processing" | "done" | "error",
    currentFile: "",
    totalFiles: 0,
    currentFileNumber: 0,
    totalProgress: 0,
  });

  // --- 파일/폴더 추가 핸들러 ---
  const handleAddFiles = async (filter?: { name: string; extensions: string[] }[]) => {
    try {
      const selected = await open({ multiple: true, filters: filter });
      if (Array.isArray(selected)) {
        handleFilesAdded(selected);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddFolder = async () => {
    try {
      const selected = await open({ directory: true, title: "Select a folder" });
      if (typeof selected === "string") {
        // Rust에 폴더 내 파일 목록을 요청합니다.
        const filesInDir = await invoke<string[]>("get_files_in_dir_recursive", {
          dirPath: selected,
        });
        handleFilesAdded(filesInDir);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleFilesAdded = (newFilePaths: string[]) => {
    const newFiles = newFilePaths.map((path) => ({ path }));
    setStagedFiles((prev) => {
      const existingPaths = new Set(prev.map((f) => f.path));
      const uniqueNewFiles = newFiles.filter((f) => !existingPaths.has(f.path));
      return [...prev, ...uniqueNewFiles];
    });
  };

  const handleRemoveFile = (pathToRemove: string) => {
    setStagedFiles((prevFiles) => prevFiles.filter((f) => f.path !== pathToRemove));
  };

  const handleClearAllFiles = () => {
    setStagedFiles([]);
  };

  // --- 작업 실행 핸들러 ---
  const startOperation = (initialFileName: string, totalFiles: number) => {
    setProgress({
      isVisible: true,
      status: "processing",
      currentFile: initialFileName,
      totalFiles,
      currentFileNumber: 1,
      totalProgress: 0,
    });
  };

  const handleEncrypt = async () => {
    if (stagedFiles.length === 0) {
      await message("먼저 암호화할 파일을 추가해주세요.", { title: "파일 없음" });
      return;
    }
    try {
      const destDir = await open({
        title: "Select a folder to save encrypted files",
        directory: true,
      });
      if (typeof destDir !== "string") return;

      const filePaths = stagedFiles.map((f) => f.path);
      startOperation(filePaths[0], filePaths.length);
      await invoke("encrypt_files_with_progress", { files: filePaths, destinationDir: destDir });
      setStagedFiles([]);
    } catch (error) {
      await message(`Error: ${error}`);
    }
  };

  const handleDecrypt = async () => {
    if (stagedFiles.length === 0) {
      await message("먼저 복호화할 파일을 추가해주세요.", { title: "파일 없음" });
      return;
    }
    try {
      const destDir = await open({
        title: "Select a folder to save decrypted files",
        directory: true,
      });
      if (typeof destDir !== "string") return;

      const filePaths = stagedFiles.map((f) => f.path);
      startOperation(filePaths[0], filePaths.length);
      await invoke("decrypt_files_with_progress", { files: filePaths, destinationDir: destDir });
      setStagedFiles([]);
    } catch (error) {
      await message(`Error: ${error}`);
    }
  };

  const handleSecureDelete = async () => {
    if (stagedFiles.length === 0) {
      await message("먼저 삭제할 파일을 추가해주세요.", { title: "파일 없음" });
      return;
    }

    const confirmed = await ask(
      `정말로 ${stagedFiles.length}개의 파일을 영구적으로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      {
        title: "보안 삭제 확인",
        okLabel: "영구 삭제",
        cancelLabel: "취소",
      }
    );

    if (confirmed) {
      const filePaths = stagedFiles.map((f) => f.path);
      try {
        // 보안 삭제는 진행률 표시 없이 순차적으로 실행합니다.
        for (const filePath of filePaths) {
          await invoke("secure_delete_file", { filePath });
        }
        await message(`${filePaths.length}개의 파일이 안전하게 삭제되었습니다.`);
        setStagedFiles([]);
      } catch (error) {
        await message(`Error: ${error}`);
      }
    }
  };

  // 탭 변경 시 준비된 파일 목록 초기화
  useEffect(() => {
    setStagedFiles([]);
  }, [activeTab]);

  // --- 기존 핸들러 및 useEffect들 ---
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
    message("작업이 취소되었습니다.");
  };
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
  useEffect(() => {
    invoke<boolean>("vault_exists")
      .then((exists) => setVaultState(exists ? "locked" : "needs_setup"))
      .catch(console.error);
  }, []);
  useEffect(() => {
    const unlistenProgress = listen<ProgressPayload>("PROGRESS_EVENT", (event) => {
      const { status, current_file_path, total_files, current_file_number, total_progress } =
        event.payload;
      if (status === "done") {
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
    const unlistenError = listen<string>("ERROR_EVENT", (event) => {
      setProgress({
        isVisible: false,
        status: "processing",
        currentFile: "",
        totalFiles: 0,
        currentFileNumber: 0,
        totalProgress: 0,
      });
      message(`오류 발생: ${event.payload}`, { title: "작업 실패" });
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
              <div className="tab-nav">
                <button
                  className={`tab-button ${activeTab === "encrypt" ? "active" : ""}`}
                  onClick={() => setActiveTab("encrypt")}
                >
                  암호화
                </button>
                <button
                  className={`tab-button ${activeTab === "decrypt" ? "active" : ""}`}
                  onClick={() => setActiveTab("decrypt")}
                >
                  복호화
                </button>
                <button
                  className={`tab-button ${activeTab === "delete" ? "active" : ""}`}
                  onClick={() => setActiveTab("delete")}
                >
                  보안 삭제
                </button>
              </div>

              <div className="tab-content">
                {activeTab === "encrypt" && (
                  <div>
                    <FileSelector
                      onAddFiles={() => handleAddFiles()}
                      onAddFolder={handleAddFolder}
                    />

                    <StagedFileList
                      files={stagedFiles}
                      onRemoveFile={handleRemoveFile}
                      onClearAll={handleClearAllFiles}
                    />
                    <div className="action-footer">
                      <button
                        className="button-primary"
                        onClick={handleEncrypt}
                        disabled={stagedFiles.length === 0}
                      >
                        암호화 시작
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "decrypt" && (
                  <div>
                    <FileSelector
                      onAddFiles={() => handleAddFiles()}
                      onAddFolder={handleAddFolder}
                    />

                    <StagedFileList
                      files={stagedFiles}
                      onRemoveFile={handleRemoveFile}
                      onClearAll={handleClearAllFiles}
                    />
                    <div className="action-footer">
                      <button
                        className="button-primary"
                        onClick={handleDecrypt}
                        disabled={stagedFiles.length === 0}
                      >
                        복호화 시작
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "delete" && (
                  <div>
                    <FileSelector
                      onAddFiles={() => handleAddFiles()}
                      onAddFolder={handleAddFolder}
                    />

                    <StagedFileList
                      files={stagedFiles}
                      onRemoveFile={handleRemoveFile}
                      onClearAll={handleClearAllFiles}
                    />
                    <div className="action-footer">
                      <button
                        className="button-primary"
                        id="button-danger"
                        onClick={handleSecureDelete}
                        disabled={stagedFiles.length === 0}
                      >
                        선택 파일 영구 삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          {activePage === "settings" && <Settings />}
        </main>
      </div>
    </div>
  );
};

export default App;
