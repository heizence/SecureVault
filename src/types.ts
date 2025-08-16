// 파일 데이터의 구조를 정의합니다.
export interface EncryptedFile {
  status: "Encrypted" | "Decrypted";
  encryptedDate: string;
  originalName: string;
  encryptedSize: string;
}

// 메인 화면에서 보여줄 페이지의 종류를 정의합니다.
export type Page = "files" | "settings";
