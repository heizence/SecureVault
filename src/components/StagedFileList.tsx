// src/components/StagedFileList.tsx

import React from "react";
import "./StagedFileList.css";

const getFileName = (path: string) => path.replace(/^.*[\\\/]/, "");

interface StagedFile {
  path: string;
}

interface StagedFileListProps {
  files: StagedFile[];
  onRemoveFile: (path: string) => void;
  onClearAll: () => void;
}

const StagedFileList: React.FC<StagedFileListProps> = ({ files, onRemoveFile, onClearAll }) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="staged-files-container">
      <div className="staged-files-header">
        <h4>{files.length}개의 파일이 준비됨</h4>
        <button onClick={onClearAll} className="clear-all-button">
          전체 삭제
        </button>
      </div>
      <ul className="staged-files-list">
        {files.map((file) => (
          <li key={file.path} className="staged-file-item">
            <span className="file-name" title={file.path}>
              {getFileName(file.path)}
            </span>
            <button onClick={() => onRemoveFile(file.path)} className="remove-file-button">
              &times;
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StagedFileList;
