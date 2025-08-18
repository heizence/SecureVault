import React from "react";
import "./ProgressDialog.css";

// 파일 경로에서 파일 이름만 추출하는 헬퍼 함수
// Windows (\\)와 macOS/Linux (/) 경로 구분자를 모두 처리합니다.
const getFileName = (path: string): string => {
  if (!path || path === "Done") {
    return "모든 파일 처리 완료!";
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
  const isProcessing = status === "processing";
  // 헬퍼 함수를 사용하여 전체 경로에서 파일 이름만 추출합니다.
  const fileNameToDisplay = getFileName(currentFile);

  return (
    <div className="progress-overlay">
      <div className="progress-box">
        <h2>{isProcessing ? `처리 중...` : "작업 완료!"}</h2>
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
            취소
          </button>
        ) : (
          <button className="dialog-button confirm" onClick={onClose}>
            확인
          </button>
        )}
      </div>
    </div>
  );
};

export default ProgressDialog;
