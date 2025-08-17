import { useState } from "react";

export default function InputDialog({
  onSubmit,
  onClose,
}: {
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-80">
        <h2 className="text-lg mb-4">비밀번호를 입력하세요</h2>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border rounded w-full px-2 py-1 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200">
            취소
          </button>
          <button
            onClick={() => {
              onSubmit(value);
              onClose();
            }}
            className="px-3 py-1 rounded bg-blue-500 text-white"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
