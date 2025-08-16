import React from "react";
import "./FileList.css";
import { EncryptedFile } from "../types";
import { invoke } from "@tauri-apps/api/core";

interface FileListProps {
  files: EncryptedFile[];
}

const FileList: React.FC<FileListProps> = ({ files }) => {
  // Rust의 greet 함수를 호출하는 비동기 함수
  const callGreetCommand = async () => {
    try {
      // 'greet' command를 'World'라는 인자와 함께 호출합니다.
      const response: string = await invoke("greet", { name: "World" });
      // Rust로부터 받은 응답을 alert 창으로 보여줍니다.
      alert(response);
    } catch (e) {
      console.error(e);
      alert("Failed to call Rust command.");
    }
  };

  return (
    <>
      {/* 테스트용 버튼 추가 */}
      <div style={{ marginBottom: "15px" }}>
        <button onClick={callGreetCommand}>Call Rust Function</button>
      </div>

      <div className="file-list-container">
        <div className="list-header">
          {/* ... 기존 헤더 내용 ... */}
          <div className="column">#</div>
          <div className="column">Status</div>
          <div className="column">Encrypted Date</div>
          <div className="column">Original Filename</div>
          <div className="column">Encrypted Size</div>
          <div className="column">Actions</div>
        </div>
        {files.map((file, index) => (
          <div className="list-item" key={index}>
            {/* ... 기존 아이템 내용 ... */}
            <div className="column">{index + 1}</div>
            <div className="column">{file.status}</div>
            <div className="column">{file.encryptedDate}</div>
            <div className="column">{file.originalName}</div>
            <div className="column">{file.encryptedSize}</div>
            <div className="column">
              <button>Open</button>
              <button>Export</button>
              <button>Delete</button>
            </div>
          </div>
        ))}
        <div className="list-footer">
          {/* ... 기존 푸터 내용 ... */}
          <span>Total {files.length} files</span>
          <div className="pagination">
            <button>&lt;</button>
            <span>1/10</span>
            <button>&gt;</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FileList;
