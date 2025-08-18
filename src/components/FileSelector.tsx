// src/components/FileSelector.tsx
import React from "react";
import "./FileSelector.css";

interface FileSelectorProps {
  onAddFiles: () => void;
  onAddFolder: () => void;
}

const FileSelector: React.FC<FileSelectorProps> = ({ onAddFiles, onAddFolder }) => {
  return (
    <div className="file-selector-container">
      <p>암호화, 복호화 또는 삭제할 파일이나 폴더를 추가하세요.</p>
      <div className="selector-buttons">
        <button className="selector-button" onClick={onAddFiles}>
          파일 추가
        </button>
        <button className="selector-button" onClick={onAddFolder}>
          폴더 추가
        </button>
      </div>
    </div>
  );
};

export default FileSelector;
