import { useState } from "react";
import "./InputDialog.css";

export default function InputDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    onSubmit(value);
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-box">
        <h2 className="dialog-title">비밀번호를 입력하세요</h2>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="dialog-input"
          autoFocus
        />
        <div className="dialog-actions">
          <button onClick={onClose} className="dialog-button cancel">
            취소
          </button>
          <button onClick={handleSubmit} className="dialog-button confirm">
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
