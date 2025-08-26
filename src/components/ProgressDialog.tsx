import React from "react";
import { useTranslation } from "react-i18next";
import "./ProgressDialog.css";

// 파일 경로에서 파일 이름만 추출하는 헬퍼 함수
// Windows (\\)와 macOS/Linux (/) 경로 구분자를 모두 처리
const getFileName = (path: string): string => {
  const { t } = useTranslation();

  if (!path || path === "Done") {
    return t("progress.processedAll");
  }
  return path.replace(/^.*[\\\/]/, "");
};

interface ProgressDialogProps {
  status: "processing" | "done" | "error";
  currentFile: string;
  totalFiles: number;
  currentFileNumber: number;
  totalProgress: number;
  onCancel: () => void;
  onClose: () => void;
}

const ProgressDialog: React.FC<ProgressDialogProps> = ({
  status,
  currentFile,
  totalFiles,
  currentFileNumber,
  totalProgress,
  onCancel,
  onClose,
}) => {
  const { t } = useTranslation();

  const isProcessing = status === "processing";
  const fileNameToDisplay = getFileName(currentFile);

  return (
    <div className="progress-overlay">
      <div className="progress-box">
        <h2>{isProcessing ? t("progress.processing") : t("progress.complete")}</h2>
        <h3>
          {currentFileNumber} / {totalFiles}
        </h3>

        <p className="filename" title={fileNameToDisplay}>
          {fileNameToDisplay}
        </p>

        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${totalProgress}%` }}></div>
        </div>
        <p className="progress-percentage">{Math.round(totalProgress)}%</p>

        {isProcessing ? (
          <button className="dialog-button cancel" onClick={onCancel}>
            {t("progress.cancel")}
          </button>
        ) : (
          <button className="dialog-button confirm" onClick={onClose}>
            {t("progress.confirm")}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProgressDialog;
