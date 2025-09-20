import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, message, ask } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";

import { Page, StagedFile } from "./types";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Settings from "./components/Settings";
import Unlock from "./components/Unlock";
import Setup from "./components/Setup";
import ProgressDialog, { EachFile, Status } from "./components/ProgressDialog";
import AppEachContent from "./components/AppEachContent";
import "./App.css";

interface ProgressPayload {
  status: string;
  current_file_path: string;
  number_of_files: number;
  current_file_number: number;
  total_progress: number;
  total_files: string[];
  suceeded_files: EachFile[];
  failed_files?: EachFile[];
}

interface ProgressState {
  isVisible: boolean;
  status: Status;
  currentFile: string;
  numberOfFiles: number;
  currentFileNumber: number;
  totalProgress: number;
}

interface FileStatus {
  totalFiles: string[];
  suceededFiles: EachFile[];
  failedFiles?: EachFile[] | undefined;
}

const App: React.FC = () => {
  const { t } = useTranslation();

  const [vaultState, setVaultState] = useState<"checking" | "needs_setup" | "locked" | "unlocked">(
    "checking"
  );
  const [activePage, setActivePage] = useState<Page>("encrypt");
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [progress, setProgress] = useState<ProgressState>({
    isVisible: false,
    status: Status.IDLE,
    currentFile: "",
    numberOfFiles: 0,
    currentFileNumber: 0,
    totalProgress: 0,
  });

  const [fileStatus, setFileStatus] = useState<FileStatus>({
    totalFiles: [],
    suceededFiles: [],
    failedFiles: [],
  });

  const [isCancelling, setIsCancelling] = useState(false); // 취소 상태를 관리

  const handleLock = () => {
    setVaultState("locked");
  };

  const handleUnlock = async (password: string) => {
    try {
      await invoke("unlock_vault", { password });
      setVaultState("unlocked");
    } catch (e) {
      throw e;
    }
  };

  // 설정 완료 핸들러
  const handleSetupSuccess = () => {
    setVaultState("unlocked");
  };

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
        let filesInDir = await invoke<string[]>("get_files_in_dir_recursive", {
          dirPath: selected,
        });

        if (filesInDir.length === 0) {
          await message(t("error.noFilesDesc"), {
            title: t("error.noFilesTitle"),
          });
          return;
        }

        // 복호화 탭일 경우 .enc 파일만 필터링
        if (activePage === "decrypt") {
          filesInDir = filesInDir.filter((file) => file.endsWith(".enc"));
          if (filesInDir.length === 0) {
            await message(t("error.noEncFiles"), {
              title: t("error.noFilesTitle"),
            });
            return;
          }
        }

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

  const startOperation = (initialFileName: string, numberOfFiles: number) => {
    setIsCancelling(false); // 새로운 작업을 시작하기 전에 취소 상태를 리셋
    setProgress({
      isVisible: true,
      status: Status.PROCESSING,
      currentFile: initialFileName,
      numberOfFiles,
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
      await invoke("encrypt_files", { files: filePaths, destinationDir: destDir });
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
      await invoke("decrypt_files", { files: filePaths, destinationDir: destDir });
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
        // --- 수정: 진행률 표시 시작 및 새로운 커맨드 호출 ---
        startOperation(filePaths[0], filePaths.length);
        await invoke("secure_delete_files", { files: filePaths });
        setStagedFiles([]); // 작업 시작 후 목록 비우기
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

  const handleCancel = async () => {
    // 즉시 취소 상태로 변경하여 이후의 이벤트를 차단합니다.
    setIsCancelling(true);

    await invoke("cancel_operation");
    setProgress({
      isVisible: false,
      status: Status.PROCESSING,
      currentFile: "",
      numberOfFiles: 0,
      currentFileNumber: 0,
      totalProgress: 0,
    });
    message(t("messages.cancelSuccess"));
  };

  const handleCloseProgress = () => {
    setProgress({
      isVisible: false,
      status: Status.IDLE,
      currentFile: "",
      numberOfFiles: 0,
      currentFileNumber: 0,
      totalProgress: 0,
    });
  };

  useEffect(() => {
    setStagedFiles([]);
  }, [activePage]);

  useEffect(() => {
    invoke<boolean>("vault_exists")
      .then((exists) => setVaultState(exists ? "locked" : "needs_setup"))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const unlistenProgress = listen<ProgressPayload>("PROGRESS_EVENT", (event) => {
      // isCancelling 상태가 true이면, 모든 진행률 이벤트를 무시
      if (isCancelling) return;

      const {
        status,
        current_file_path,
        number_of_files,
        current_file_number,
        total_progress,
        total_files,
        suceeded_files,
        failed_files,
      } = event.payload;
      if (status === Status.DONE) {
        setProgress((prev) => ({
          ...prev,
          totalProgress: 100,
        }));
        setFileStatus({
          totalFiles: total_files,
          suceededFiles: suceeded_files,
          failedFiles: failed_files,
        });

        // 100% 진행도를 잠시 보여준 후 완료 화면 표시해 주기
        setTimeout(() => {
          setProgress((prev) => ({
            ...prev,
            status: Status.DONE,
            totalProgress: 100,
          }));
        }, 1500);
      } else {
        setProgress({
          isVisible: true,
          status: Status.PROCESSING,
          currentFile: current_file_path,
          numberOfFiles: number_of_files,
          currentFileNumber: current_file_number,
          totalProgress: total_progress * 100,
        });
      }
    });

    return () => {
      unlistenProgress.then((f) => f());
    };
  }, [isCancelling]);

  // --- 화면 렌더링 로직
  if (vaultState === "checking") {
    return <div>{t("message.checking")}</div>;
  }
  if (vaultState === "needs_setup") {
    return <Setup onSetupComplete={handleSetupSuccess} />;
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
          numberOfFiles={progress.numberOfFiles}
          currentFileNumber={progress.currentFileNumber}
          totalProgress={progress.totalProgress}
          totalFiles={fileStatus.totalFiles}
          suceededFiles={fileStatus.suceededFiles}
          failedFiles={fileStatus.failedFiles}
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
