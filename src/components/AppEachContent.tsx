import React from "react";
import { useTranslation } from "react-i18next";
import { Page, StagedFile } from "../types";
import "./AppEachContent.css";

interface AppEachContentProps {
  type: Page;
  stagedFiles: StagedFile[];
  onAddFiles: () => void;
  onAddFolder: () => void;
  onRemoveFile: (pathToRemove: string) => void;
  onClearAll: () => void;
  onButtonClick: () => void;
  disabled: boolean;
}

const AppEachContent: React.FC<AppEachContentProps> = ({
  type,
  stagedFiles,
  onAddFiles,
  onAddFolder,
  onRemoveFile,
  onClearAll,
  onButtonClick,
  disabled,
}) => {
  const { t } = useTranslation();

  return (
    <div className="file-handling-container">
      <h2>{t(`${type}.title`)}</h2>
      <p>{t(`${type}.subtext`)}</p>

      {/* file selector */}
      <div className="file-selector-container">
        <div className="selector-buttons">
          <button className="selector-button" onClick={onAddFiles}>
            {t("fileSelector.addFiles")}
          </button>
          <button className="selector-button" onClick={onAddFolder}>
            {t("fileSelector.addFolder")}
          </button>
        </div>
      </div>

      {/* Staged FileList */}
      {stagedFiles.length === 0 ? null : (
        <div className="staged-files-container">
          <div className="staged-files-header">
            <h4>{t("stagedFiles.ready", { count: stagedFiles.length })}</h4>
            <button onClick={onClearAll} className="clear-all-button">
              {t("stagedFiles.clearAll")}
            </button>
          </div>

          <ul className="staged-files-list">
            {stagedFiles.map((file: StagedFile) => (
              <li key={file.path} className="staged-file-item">
                <span className="file-name" title={file.path}>
                  {file.path.replace(/^.*[\\\/]/, "")}
                </span>
                <button onClick={() => onRemoveFile(file.path)} className="remove-file-button">
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="buttons">
        <button className="button-primary" onClick={onButtonClick} disabled={disabled}>
          {t(`${type}.button`)}
        </button>
      </div>
    </div>
  );
};

export default AppEachContent;
