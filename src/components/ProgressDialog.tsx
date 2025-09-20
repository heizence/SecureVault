import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./ProgressDialog.css";
import ShowResultView from "./ShowResultView";

export enum Status {
  IDLE = "IDLE",
  PROCESSING = "PROCESSING",
  DONE = "DONE",
  ERROR = "ERROR",
}

export type EachFile = {
  path: string;
  error: string;
};

interface ProgressDialogProps {
  status: Status;
  currentFile: string;
  numberOfFiles: number;
  currentFileNumber: number;
  totalProgress: number;
  totalFiles: string[];
  suceededFiles: EachFile[];
  failedFiles: EachFile[] | undefined;
  onCancel: () => void;
  onClose: () => void;
}

// 파일 경로에서 파일 이름만 추출하는 헬퍼 함수
// Windows (\\)와 macOS/Linux (/) 경로 구분자를 모두 처리
const getFileName = (path: string): string => {
  const { t } = useTranslation();

  if (!path || path === "Done") {
    return t("progress.processedAll");
  }
  return path.replace(/^.*[\\\/]/, "");
};

const ProgressDialog: React.FC<ProgressDialogProps> = ({
  status,
  currentFile,
  numberOfFiles,
  currentFileNumber,
  totalProgress,
  totalFiles,
  suceededFiles,
  failedFiles,
  onCancel,
  onClose,
}) => {
  const { t } = useTranslation();

  const isProcessing = status === Status.PROCESSING;
  const fileNameToDisplay = getFileName(currentFile);

  useEffect(() => {
    if (status === Status.DONE) {
      console.log("[ProgressDialog]totalFiles :", totalFiles);
      console.log("[ProgressDialog]suceededFiles :", suceededFiles);
      console.log("[ProgressDialog]failedFiles :", failedFiles);
    }
  }, [status]);

  return (
    <div className="progress-overlay">
      {isProcessing ? (
        <div className="progress-box">
          <h2>{t("progress.processing")}</h2>
          <h3>
            {currentFileNumber} / {numberOfFiles}
          </h3>

          <p className="filename" title={fileNameToDisplay}>
            {fileNameToDisplay}
          </p>

          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${totalProgress}%` }}></div>
          </div>
          <p className="progress-percentage">{Math.round(totalProgress)}%</p>

          <button className="dialog-button cancel" onClick={onCancel}>
            {t("progress.cancel")}
          </button>
        </div>
      ) : (
        <div className="progress-box">
          <ShowResultView
            totalFiles={totalFiles}
            suceededFiles={suceededFiles}
            failedFiles={failedFiles}
            onRetry={() => {}}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  );
};

export default ProgressDialog;
