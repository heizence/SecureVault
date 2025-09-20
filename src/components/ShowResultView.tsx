import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./ShowResultView.css";
import { EachFile } from "./ProgressDialog";

interface ShowResultViewProps {
  totalFiles: string[];
  suceededFiles: EachFile[];
  failedFiles: EachFile[] | undefined;
  onRetry: (failedPaths: string[]) => void;
  onClose: () => void;
}

const getFileName = (path: string) => path.substring(path.lastIndexOf("/") + 1);

const ShowResultView: React.FC<ShowResultViewProps> = ({
  totalFiles,
  suceededFiles,
  failedFiles = [],
  onClose,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"all" | "success" | "error">("all");

  const renderFileList = () => {
    switch (activeTab) {
      case "all":
        return totalFiles.map((filePath, index) => (
          <div key={`success-${index}`} className="result-item success">
            <div className="file-name-div">
              <span className="file-name">{getFileName(filePath)}</span>
            </div>
          </div>
        ));
      case "success":
        return suceededFiles.map((file, index) => (
          <div key={`success-${index}`} className="result-item success">
            <div className="file-name-div">
              <span className="icon">✓</span>
              <span className="file-name">{getFileName(file.path)}</span>
            </div>
          </div>
        ));
      case "error":
        if (failedFiles.length > 0) {
          return failedFiles.map((file) => (
            <div key={file.path} className="result-item error">
              <div className="file-info">
                <span className="icon">!</span>
                <span className="file-name">
                  {getFileName(file.path)}
                  <span className="error-message">({file.error})</span>
                </span>
              </div>
            </div>
          ));
        } else {
          return <div className="result-noitem">{t("results.noContents")}</div>;
        }
      default:
        return null;
    }
  };

  return (
    <div className="result-box">
      <h2>{t("progress.complete")}</h2>
      <h3 className="result-summary">
        {`${t("results.title")} : ${t("results.total", {
          count: totalFiles.length,
        })} ( ${t("results.success", { count: suceededFiles.length })} / ${t("results.failed", {
          count: failedFiles.length,
        })} )`}
      </h3>

      <div className="result-tabs">
        <button
          className={`tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          {t("results.total", { count: totalFiles.length })}
        </button>
        <button
          className={`tab ${activeTab === "success" ? "active" : ""}`}
          onClick={() => setActiveTab("success")}
        >
          {t("results.success", { count: suceededFiles.length })}
        </button>
        <button
          className={`tab ${activeTab === "error" ? "active" : ""}`}
          onClick={() => setActiveTab("error")}
        >
          {t("results.failed", { count: failedFiles.length })}
        </button>
      </div>
      <ul className="result-list">{renderFileList()}</ul>

      <button className="button-primary" onClick={onClose}>
        {t("results.close")}
      </button>
    </div>
  );
};

export default ShowResultView;
