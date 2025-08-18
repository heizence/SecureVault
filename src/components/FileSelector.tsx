import React from "react";
import "./FileSelector.css";

interface FileSelectorProps {
  type: number; // 0 : 암호화, 1 : 복호화, 2 : 보안 삭제
  onAddFiles: () => void;
  onAddFolder: () => void;
}

const FileSelector: React.FC<FileSelectorProps> = ({ type, onAddFiles, onAddFolder }) => {
  return (
    <div className="file-selector-container">
      <p>{type === 0 ? "암호화" : type === 1 ? "복호화" : "삭제"}할 파일이나 폴더를 추가하세요.</p>
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
