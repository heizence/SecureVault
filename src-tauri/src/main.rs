// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, Key, KeyInit, Nonce};
use argon2::{
    self,
    password_hash::{PasswordHasher, SaltString},
    Argon2, Params, Version,
};
use rand::RngCore;
use std::fs;
use std::path::Path;

// --- 이전 단계에서 작성한 암호화 함수 (수정 없음) ---
#[tauri::command]
fn encrypt_file(file_path: String, password: String) -> Result<(), String> {
    // ... (이전과 동일한 암호화 코드)
    let source_path = Path::new(&file_path);
    let original_data =
        fs::read(source_path).map_err(|e| format!("Failed to read source file: {}", e))?;

    let mut salt_bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut salt_bytes);

    let salt =
        SaltString::encode_b64(&salt_bytes).map_err(|e| format!("Failed to create salt: {}", e))?;

    let argon2 = Argon2::new(
        argon2::Algorithm::Argon2id,
        Version::V0x13,
        Params::new(15000, 2, 1, None).unwrap(),
    );

    let key_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| format!("Failed to derive key: {}", e))?;

    let key_bytes = key_hash.hash.unwrap();
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes.as_bytes()[..32]);

    let cipher = Aes256Gcm::new(key);
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let encrypted_data = cipher
        .encrypt(nonce, original_data.as_ref())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let mut final_data = Vec::new();
    final_data.extend_from_slice(&salt_bytes);
    final_data.extend_from_slice(&nonce_bytes);
    final_data.extend_from_slice(&encrypted_data);

    let dest_path_str = format!("{}.enc", file_path);
    let dest_path = Path::new(&dest_path_str);
    fs::write(dest_path, final_data)
        .map_err(|e| format!("Failed to write encrypted file: {}", e))?;

    Ok(())
}

// --- 새로 추가된 복호화 함수 ---
#[tauri::command]
fn decrypt_file(file_path: String, password: String) -> Result<(), String> {
    // ---- 1. 암호화된 파일 읽기 ----
    let source_path = Path::new(&file_path);
    let encrypted_file_data =
        fs::read(source_path).map_err(|e| format!("Failed to read encrypted file: {}", e))?;

    // ---- 2. 헤더 정보 분리 (솔트, 논스) ----
    if encrypted_file_data.len() < 28 {
        // 솔트(16) + 논스(12) = 28
        return Err("Invalid encrypted file format.".to_string());
    }
    let salt_bytes: &[u8] = &encrypted_file_data[0..16];
    let nonce_bytes: &[u8] = &encrypted_file_data[16..28];
    let encrypted_data: &[u8] = &encrypted_file_data[28..];

    let salt =
        SaltString::encode_b64(salt_bytes).map_err(|e| format!("Failed to parse salt: {}", e))?;
    let nonce = Nonce::from_slice(nonce_bytes);

    // ---- 3. 마스터 키 재생성 (암호화와 동일한 로직) ----
    let argon2 = Argon2::new(
        argon2::Algorithm::Argon2id,
        Version::V0x13,
        Params::new(15000, 2, 1, None).unwrap(),
    );
    let key_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| format!("Failed to derive key: {}", e))?;
    let key_bytes = key_hash.hash.unwrap();
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes.as_bytes()[..32]);

    // ---- 4. 데이터 복호화 ----
    let cipher = Aes256Gcm::new(key);
    // `decrypt` 함수는 데이터 무결성 검사를 자동으로 수행합니다.
    // 만약 비밀번호가 틀리면 키가 달라지므로, 이 단계에서 에러가 발생합니다.
    let decrypted_data = cipher
        .decrypt(nonce, encrypted_data)
        .map_err(|_| "Decryption failed. Check your password.".to_string())?;

    // ---- 5. 복호화된 파일 저장 ----
    // ".enc" 확장자를 제거하여 원본 파일 경로를 만듭니다.
    let dest_path_str = file_path
        .strip_suffix(".enc")
        .ok_or("Invalid file name: should end with .enc".to_string())?;
    let dest_path = Path::new(&dest_path_str);
    fs::write(dest_path, decrypted_data)
        .map_err(|e| format!("Failed to write decrypted file: {}", e))?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![encrypt_file, decrypt_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
