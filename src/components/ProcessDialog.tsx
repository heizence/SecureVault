import "./ProgressDialog.css";

interface ProgressDialogProps {
  status: "processing" | "done" | "error";
  currentFile: string;
  totalFiles: number;
  currentFileNumber: number;
  totalProgress: number; // 0에서 100
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

  return (
    <div className="progress-overlay">
      <div className="progress-box">
        <h2>
          {isProcessing
            ? `Processing... (${currentFileNumber} / ${totalFiles})`
            : "Operation Complete!"}
        </h2>
        <p className="filename">
          {isProcessing ? currentFile : `${totalFiles} file(s) processed successfully.`}
        </p>
        <div className="progress-bar-container">
          {/* 이제 totalProgress를 기준으로 바를 채웁니다 */}
          <div className="progress-bar" style={{ width: `${totalProgress}%` }}></div>
        </div>
        <p className="progress-percentage">{Math.round(totalProgress)}%</p>

        {isProcessing ? (
          <button onClick={onCancel}>Cancel</button>
        ) : (
          <button onClick={onClose} className="confirm-button">
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default ProgressDialog;
