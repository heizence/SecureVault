import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, message, ask } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { listen } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";

import { Page, StagedFile } from "./types";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Settings from "./components/Settings";
import Unlock from "./components/Unlock";
import Setup from "./components/Setup";
import ProgressDialog from "./components/ProgressDialog";
import AppEachContent from "./components/AppEachContent";
import "./App.css";

interface ProgressPayload {
  status: string;
  current_file_path: string;
  total_files: number;
  current_file_number: number;
  total_progress: number;
}

const App: React.FC = () => {
  const { t } = useTranslation();

  const [vaultState, setVaultState] = useState<"checking" | "needs_setup" | "locked" | "unlocked">(
    "checking"
  );
  const [activePage, setActivePage] = useState<Page>("encrypt");
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
      const selected = await open({
        multiple: true,
        title: t("instructions.selectFiles"),
        filters: filter,
      });
      if (Array.isArray(selected)) {
        handleFilesAdded(selected);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        title: t("instructions.selectFolder"),
      });
      if (typeof selected === "string") {
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
      await message(t("error.noFilesEcrypt"), { title: t("error.noFilesTitle") });
      return;
    }
    try {
      const destDir = await open({
        title: t("instructions.selectFolderForSave"),
        directory: true,
      });
      if (typeof destDir !== "string") return;

      const filePaths = stagedFiles.map((f) => f.path);
      startOperation(filePaths[0], filePaths.length);
      await invoke("encrypt_files_with_progress", { files: filePaths, destinationDir: destDir });
      setStagedFiles([]);
    } catch (error) {
      console.error(error);
      await message(t("error.operationFailed"));
    }
  };

  const handleDecrypt = async () => {
    if (stagedFiles.length === 0) {
      await message(t("error.noFilesDecrypt"), { title: t("error.noFilesTitle") });
      return;
    }
    try {
      const destDir = await open({
        title: t("instructions.selectFolderForSave"),
        directory: true,
      });
      if (typeof destDir !== "string") return;

      const filePaths = stagedFiles.map((f) => f.path);
      startOperation(filePaths[0], filePaths.length);
      await invoke("decrypt_files_with_progress", { files: filePaths, destinationDir: destDir });
      setStagedFiles([]);
    } catch (error) {
      console.error(error);
      await message(t("error.operationFailed"));
    }
  };

  const handleSecureDelete = async () => {
    if (stagedFiles.length === 0) {
      await message(t("error.noFilesToDelete"), { title: t("error.noFilesTitle") });
      return;
    }

    const confirmed = await ask(t("messages.deleteConfirm", { count: stagedFiles.length }), {
      title: t("delete.title"),
      okLabel: t("delete.button"),
      cancelLabel: t("progress.cancel"),
    });

    if (confirmed) {
      const filePaths = stagedFiles.map((f) => f.path);
      try {
        for (const filePath of filePaths) {
          await invoke("secure_delete_file", { filePath });
        }
        await message(t("messages.deleteSuccess", { count: filePaths.length }));
        setStagedFiles([]);
      } catch (error) {
        console.error(error);
        await message(t("error.operationFailed"));
      }
    }
  };

  // 컨텐츠 유형에 따라 실행할 매서드
  const onButtonClickByType = () => {
    if (activePage === "encrypt") return handleEncrypt();
    else if (activePage === "decrypt") return handleDecrypt();
    else if (activePage === "delete") return handleSecureDelete();
    else return;
  };

  // 탭 변경 시 준비된 파일 목록 초기화
  useEffect(() => {
    setStagedFiles([]);
  }, [activePage]);

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
    message(t("messages.cancelSuccess"));
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
      message(`error : ${event.payload}`, { title: t("error.operationFailed") });
    });
    return () => {
      unlistenProgress.then((f) => f());
      unlistenError.then((f) => f());
    };
  }, []);

  // --- 화면 렌더링 로직 ---
  if (vaultState === "checking") {
    return <div>{t("message.checking")}</div>;
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
          {activePage === "settings" ? (
            <Settings />
          ) : (
            <AppEachContent
              type={activePage}
              stagedFiles={stagedFiles}
              onAddFiles={() =>
                handleAddFiles(
                  activePage === "decrypt"
                    ? [{ name: "Encrypted Files", extensions: ["enc"] }]
                    : undefined
                )
              }
              onAddFolder={handleAddFolder}
              onRemoveFile={handleRemoveFile}
              onClearAll={handleClearAllFiles}
              onButtonClick={onButtonClickByType}
              disabled={stagedFiles.length === 0}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
