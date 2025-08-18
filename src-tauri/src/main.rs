// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Emitter, Manager, State};
use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, Key, KeyInit, Nonce};
use argon2::{
    self,
    password_hash::{PasswordHasher, SaltString},
    Argon2, Params, Version,
};
use rand::RngCore;

use std::env;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::Path;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use walkdir::WalkDir; 

// 마스터 키를 메모리에 안전하게 보관할 구조체 정의
// Mutex를 사용하여 여러 스레드에서 동시에 접근해도 안전하도록 합니다.
pub struct Vault {
    key: Mutex<Option<Key<Aes256Gcm>>>,
}

// 취소 상태를 안전하게 공유하기 위한 구조체
pub struct OperationState {
    is_cancelled: Arc<AtomicBool>,
}

// 프론트엔드로 보낼 진행 상황 이벤트 데이터 구조
#[derive(Clone, serde::Serialize)]
struct ProgressPayload {
    status: String,
    current_file_path: String,
    total_files: usize,
    current_file_number: usize,
    total_progress: f64, // 전체 진행률 (0.0 ~ 1.0)
}

/******************* 앱 설정 파일 경로를 가져오는 헬퍼 함수 ******************/
fn get_vault_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    // --- FIX 1: ok_or -> map_err로 수정 ---
    let config_dir = app.path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;

    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }
    Ok(config_dir.join("vault.key"))
}

/******************* 앱 시작 시 vault.key 파일이 있는지 확인 ******************/
#[tauri::command]
fn vault_exists(app: tauri::AppHandle) -> Result<bool, String> {
    let vault_path = get_vault_path(&app)?;
    Ok(vault_path.exists())
}

// 최초 실행 시 마스터 키 생성 및 저장

#[tauri::command]
fn create_vault(app: tauri::AppHandle, password: String) -> Result<(), String> {
    // 1. 새로운 마스터 키 (Vault Key)를 무작위로 생성
    let mut vault_key_bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut vault_key_bytes);
    let vault_key = Key::<Aes256Gcm>::from_slice(&vault_key_bytes);

    // 2. 비밀번호를 해싱하여 마스터 키를 암호화할 키(KEK) 생성
    let mut salt_bytes = [0u8; 16];
    rand::rng().fill_bytes(&mut salt_bytes);
    let salt = SaltString::encode_b64(&salt_bytes).map_err(|e| e.to_string())?;
    let argon2 = Argon2::new(  
        argon2::Algorithm::Argon2id,
        Version::V0x13,
        Params::new(15000, 2, 1, None).unwrap()
    );
    let kek_hash = argon2.hash_password(password.as_bytes(), &salt).map_err(|e| e.to_string())?;
    let binding = kek_hash.hash.unwrap();    
    let kek = Key::<Aes256Gcm>::from_slice(&binding.as_bytes()[..32]);
    
    // 3. 마스터 키(Vault Key)를 KEK로 암호화
    let cipher = Aes256Gcm::new(kek);
    let mut nonce_bytes = [0u8; 12];
    rand::rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let encrypted_vault_key = cipher.encrypt(nonce, vault_key.as_slice()).map_err(|e| e.to_string())?;

    // 4. [솔트] + [논스] + [암호화된 마스터 키] 형태로 파일에 저장
    let mut final_data = Vec::new();
    final_data.extend_from_slice(&salt_bytes);
    final_data.extend_from_slice(&nonce_bytes);
    final_data.extend_from_slice(&encrypted_vault_key);

    let vault_path = get_vault_path(&app)?;
    fs::write(vault_path, final_data).map_err(|e| e.to_string())?;
    Ok(())
}

/******************* 사용자가 입력한 비밀번호로 vault 잠금 해제 및 마스터 키를 메모리에 로드 ******************/
#[tauri::command]
fn unlock_vault(app: tauri::AppHandle, password: String, vault_state: tauri::State<Vault>) -> Result<(), String> {
    let vault_path = get_vault_path(&app)?;
    let vault_data = fs::read(vault_path).map_err(|e| e.to_string())?;

    // 1. 파일에서 솔트, 논스, 암호화된 마스터 키 분리
    if vault_data.len() < 28 { return Err("Invalid vault file".into()); }
    let salt_bytes = &vault_data[0..16];
    let nonce_bytes = &vault_data[16..28];
    let encrypted_vault_key = &vault_data[28..];
    let salt = SaltString::encode_b64(salt_bytes).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(nonce_bytes);

    // 2. 비밀번호로 KEK 재생성
    let argon2 = Argon2::new(  
        argon2::Algorithm::Argon2id,
        Version::V0x13,
        Params::new(15000, 2, 1, None).unwrap()
    );
    let kek_hash = argon2.hash_password(password.as_bytes(), &salt).map_err(|e| e.to_string())?;
    let binding = kek_hash.hash.unwrap();    
    let kek = Key::<Aes256Gcm>::from_slice(&binding.as_bytes()[..32]);

    // 3. 마스터 키 복호화 시도
    let cipher = Aes256Gcm::new(kek);
    let vault_key_bytes = cipher.decrypt(nonce, encrypted_vault_key)
        .map_err(|_| "Unlock failed. Check password.".to_string())?;
    let vault_key = Key::<Aes256Gcm>::from_slice(&vault_key_bytes);

    // 4. 성공 시, 마스터 키를 Tauri 상태(State)에 저장
    *vault_state.key.lock().unwrap() = Some(*vault_key);
    Ok(())
}

/******************* 폴더 내 모든 파일 경로를 가져오기 ******************/
#[tauri::command]
fn get_files_in_dir_recursive(dir_path: String) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    for entry in WalkDir::new(dir_path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            files.push(entry.path().to_string_lossy().to_string());
        }
    }
    Ok(files)
}

/******************* 암호화 함수 ******************/
#[tauri::command]
fn encrypt_files(file_path: String, vault: tauri::State<Vault>, destination_dir: String) -> Result<(), String> {
    // 잠금 해제 시 저장된 마스터 키를 가져옵니다.
    let vault_key = vault.key.lock().unwrap().clone().ok_or("Vault is locked")?;
    let source_path = Path::new(&file_path);
    let original_data = fs::read(&file_path).map_err(|e| e.to_string())?;

    // 파일 암호화에는 마스터 키를 직접 사용합니다.
    let cipher = Aes256Gcm::new(&vault_key);
    let mut nonce_bytes = [0u8; 12];
    rand::rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let encrypted_data = cipher.encrypt(nonce, original_data.as_ref()).map_err(|e| e.to_string())?;

    let mut final_data = Vec::new();
    final_data.extend_from_slice(&nonce_bytes);
    final_data.extend_from_slice(&encrypted_data);

       // --- 저장 경로 생성 로직 변경 ---
    let source_filename = source_path.file_name()
        .ok_or("Could not get source filename")?
        .to_str()
        .ok_or("Filename contains invalid characters")?;

    let dest_filename = format!("{}.enc", source_filename);
    let dest_path = Path::new(&destination_dir).join(dest_filename);

    fs::write(dest_path, final_data).map_err(|e| e.to_string())?;
    Ok(())
}

/******************* 총 진행률을 계산하는 async 암호화 커맨드 ******************/
#[tauri::command]
async fn encrypt_files_with_progress(
    app: tauri::AppHandle,
    vault: State<'_, Vault>,
    files: Vec<String>,
    destination_dir: String,
    op_state: State<'_, OperationState>,
) -> Result<(), String> {
    let vault_key = vault.key.lock().unwrap().clone().ok_or("Vault is locked")?;
    op_state.is_cancelled.store(false, Ordering::SeqCst);
    let cancel_flag = op_state.is_cancelled.clone();
    let total_files = files.len();

    for (index, file_path) in files.into_iter().enumerate() {
        if cancel_flag.load(Ordering::SeqCst) { break; }

        // --- 하이라이트: 파일 처리 로직 시작 ---
        // 각 파일을 처리하기 위한 즉시 실행 클로저
        let result: Result<(), String> = (|| {
            // 1. 파일 전체를 메모리로 읽습니다.
            let original_data = fs::read(&file_path).map_err(|e| e.to_string())?;

            // 2. 새로운 논스를 생성합니다.
            let mut nonce_bytes = [0u8; 12];
            rand::rng().fill_bytes(&mut nonce_bytes);
            let nonce = Nonce::from_slice(&nonce_bytes);
            
            // 3. 단 한 번의 암호화 작업을 수행합니다.
            let cipher = Aes256Gcm::new(&vault_key);
            let encrypted_data = cipher.encrypt(nonce, original_data.as_ref()).map_err(|e| e.to_string())?;

            // 4. [논스] + [암호화된 데이터]를 파일에 씁니다.
            let mut final_data = Vec::new();
            final_data.extend_from_slice(&nonce_bytes);
            final_data.extend_from_slice(&encrypted_data);

            let dest_filename = format!("{}.enc", Path::new(&file_path).file_name().unwrap().to_str().unwrap());
            let dest_path = Path::new(&destination_dir).join(dest_filename);
            fs::write(dest_path, final_data).map_err(|e| e.to_string())?;

            Ok(())
        })();
        // --- 하이라이트: 파일 처리 로직 끝 ---

        if let Err(e) = result {
            app.emit("ERROR_EVENT", e.to_string()).unwrap();
            return Ok(());
        }
        // 파일 하나 처리가 끝날 때마다 진행률을 업데이트합니다.
        
        app.emit("PROGRESS_EVENT", ProgressPayload {
            status: "processing".to_string(),
            current_file_path: file_path.clone(),
            total_files,
            current_file_number: index + 1,
            total_progress: (index + 1) as f64 / total_files as f64,
        }).unwrap();
    }
    app.emit("PROGRESS_EVENT", ProgressPayload { 
        status: "done".to_string(),
        current_file_path: "Done".to_string(), 
        total_files,
        current_file_number: total_files,
        total_progress: 1.0,
    }).unwrap();
    // ... (완료 이벤트는 동일)
    Ok(())
}

/******************* 복호화 함수 ******************/
#[tauri::command]
fn decrypt_files(file_path: String, vault: tauri::State<Vault>) -> Result<(), String> {
    let vault_key = vault.key.lock().unwrap().clone().ok_or("Vault is locked")?;

    let encrypted_file_data = fs::read(&file_path).map_err(|e| e.to_string())?;
    
    // 파일에서 논스와 암호화된 데이터를 분리합니다.
    if encrypted_file_data.len() < 12 { return Err("Invalid encrypted file".into()); }
    let nonce_bytes = &encrypted_file_data[0..12];
    let encrypted_data = &encrypted_file_data[12..];
    let nonce = Nonce::from_slice(nonce_bytes);

    let cipher = Aes256Gcm::new(&vault_key);
    let decrypted_data = cipher.decrypt(nonce, encrypted_data)
        .map_err(|_| "Decryption failed. File may be corrupt.".to_string())?;

    let dest_path_str = file_path.strip_suffix(".enc").ok_or("Invalid filename")?;
    fs::write(dest_path_str, decrypted_data).map_err(|e| e.to_string())?;
    Ok(())
}

// --- 하이라이트: 함수 전체 신규 추가 ---
#[tauri::command]
async fn decrypt_files_with_progress(
    app: tauri::AppHandle,
    vault: State<'_, Vault>,
    files: Vec<String>,
    destination_dir: String,
    op_state: State<'_, OperationState>,
) -> Result<(), String> {
    let vault_key = vault.key.lock().unwrap().clone().ok_or("Vault is locked")?;
    op_state.is_cancelled.store(false, Ordering::SeqCst);
    let cancel_flag = op_state.is_cancelled.clone();
    let total_files = files.len();

    for (index, file_path) in files.into_iter().enumerate() {
        if cancel_flag.load(Ordering::SeqCst) { break; }

        let result: Result<(), String> = (|| {
            let encrypted_file_data = fs::read(&file_path).map_err(|e| e.to_string())?;
            if encrypted_file_data.len() < 12 { return Err("Invalid encrypted file".into()); }

            let nonce_bytes = &encrypted_file_data[0..12];
            let encrypted_data = &encrypted_file_data[12..];
            let nonce = Nonce::from_slice(nonce_bytes);
            
            let cipher = Aes256Gcm::new(&vault_key);
            let decrypted_data = cipher.decrypt(nonce, encrypted_data)
                .map_err(|_| "Decryption failed. File may be corrupt.".to_string())?;

              // --- 수정: 저장 경로 로직 변경 ---
            let source_filename = Path::new(&file_path)
                .file_name().unwrap().to_str().unwrap()
                .strip_suffix(".enc").unwrap();
            let dest_path = Path::new(&destination_dir).join(source_filename);
            fs::write(dest_path, decrypted_data).map_err(|e| e.to_string())?;

            Ok(())
        })();

        if let Err(e) = result {
            app.emit("ERROR_EVENT", e.to_string()).unwrap();
            return Ok(());
        }

        app.emit("PROGRESS_EVENT", ProgressPayload {
            status: "processing".to_string(),
            current_file_path: file_path.clone(),
            total_files,
            current_file_number: index + 1,
            total_progress: (index + 1) as f64 / total_files as f64,
        }).unwrap();
    }
    
    app.emit("PROGRESS_EVENT", ProgressPayload { 
        status: "done".to_string(),
        current_file_path: "Done".to_string(), 
        total_files,
        current_file_number: total_files,
        total_progress: 1.0,
    }).unwrap();
    Ok(())
}

/******************* 암호화/복호화 취소 ******************/
#[tauri::command]
fn cancel_operation(op_state: State<OperationState>) -> Result<(), String> {
    op_state.is_cancelled.store(true, Ordering::SeqCst);
    Ok(())
}

/******************* 보안 삭제 함수 ******************/
#[tauri::command]
fn secure_delete_file(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);

    // 1. 파일 메타데이터를 읽어 파일 크기를 가져옵니다.
    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;
    let file_size = metadata.len();

    // 2. 파일을 쓰기 모드로 엽니다.
    let mut file = OpenOptions::new().write(true).open(path)
        .map_err(|e| format!("Failed to open file for writing: {}", e))?;

    // 3. 파일 크기만큼 무작위 데이터로 덮어씁니다. (1회)
    // 보안 강도를 높이려면 이 과정을 여러 번 반복할 수 있습니다.
    const CHUNK_SIZE: usize = 1024 * 1024; // 1MB 단위로 덮어쓰기
    let mut buffer = vec![0u8; CHUNK_SIZE];
    let mut written_bytes = 0u64;

    while written_bytes < file_size {
        rand::rng().fill_bytes(&mut buffer);
        let bytes_to_write = std::cmp::min(file_size - written_bytes, CHUNK_SIZE as u64) as usize;
        file.write_all(&buffer[..bytes_to_write])
            .map_err(|e| format!("Failed to overwrite file: {}", e))?;
        written_bytes += bytes_to_write as u64;
    }
    
    // 파일 동기화로 모든 데이터가 디스크에 확실히 쓰여지도록 보장합니다.
    file.sync_all().map_err(|e| e.to_string())?;

    // 4. 파일을 최종적으로 삭제합니다.
    fs::remove_file(path)
        .map_err(|e| format!("Failed to delete file after overwrite: {}", e))?;

    Ok(())
}


/******************* 비밀번호 변경 함수 ******************/
#[tauri::command]
fn change_password(app: tauri::AppHandle, old_password: String, new_password: String) -> Result<(), String> {
    let vault_path = get_vault_path(&app)?;
    let vault_data = fs::read(&vault_path).map_err(|e| e.to_string())?;

    // 1. 기존 비밀번호로 마스터 키 복호화 시도
    let vault_key = {
        if vault_data.len() < 28 { return Err("Invalid vault file".into()); }
        let salt_bytes = &vault_data[0..16];
        let nonce_bytes = &vault_data[16..28];
        let encrypted_vault_key = &vault_data[28..];
        let salt = SaltString::encode_b64(salt_bytes).map_err(|e| e.to_string())?;
        let nonce = Nonce::from_slice(nonce_bytes);

        let argon2 = Argon2::new(
            argon2::Algorithm::Argon2id,
            Version::V0x13,
            Params::new(15000, 2, 1, None).unwrap()
        );
        let kek_hash = argon2.hash_password(old_password.as_bytes(), &salt).map_err(|e| e.to_string())?;
        let binding = kek_hash.hash.unwrap();
        let kek = Key::<Aes256Gcm>::from_slice(&binding.as_bytes()[..32]);

        let cipher = Aes256Gcm::new(kek);
        cipher.decrypt(nonce, encrypted_vault_key)
            .map_err(|_| "Password change failed. Old password is incorrect.".to_string())?
    };

    // 2. 새로운 비밀번호로 마스터 키 재암호화
    let mut new_salt_bytes = [0u8; 16];
    rand::rng().fill_bytes(&mut new_salt_bytes);
    let new_salt = SaltString::encode_b64(&new_salt_bytes).map_err(|e| e.to_string())?;
    
    let argon2 = Argon2::new(
        argon2::Algorithm::Argon2id,
        Version::V0x13,
        Params::new(15000, 2, 1, None).unwrap()
    );
    let new_kek_hash = argon2.hash_password(new_password.as_bytes(), &new_salt).map_err(|e| e.to_string())?;
    let binding = new_kek_hash.hash.unwrap();    
    let new_kek = Key::<Aes256Gcm>::from_slice(&binding.as_bytes()[..32]);

    let cipher = Aes256Gcm::new(new_kek);
    let mut new_nonce_bytes = [0u8; 12];
    rand::rng().fill_bytes(&mut new_nonce_bytes);
    let new_nonce = Nonce::from_slice(&new_nonce_bytes);
    let new_encrypted_vault_key = cipher.encrypt(new_nonce, &*vault_key).map_err(|e| e.to_string())?;

    // 3. 새로운 [솔트] + [논스] + [암호화된 마스터 키] 형태로 파일 덮어쓰기
    let mut final_data = Vec::new();
    final_data.extend_from_slice(&new_salt_bytes);
    final_data.extend_from_slice(&new_nonce_bytes);
    final_data.extend_from_slice(&new_encrypted_vault_key);

    fs::write(vault_path, final_data).map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Vault { key: Default::default() })
        .manage(OperationState { is_cancelled: Arc::new(AtomicBool::new(false)) })
        .invoke_handler(tauri::generate_handler![
            vault_exists,
            create_vault,
            unlock_vault,
            get_files_in_dir_recursive,
            encrypt_files, 
            decrypt_files, 
            encrypt_files_with_progress,            
            decrypt_files_with_progress,
            secure_delete_file,
            cancel_operation,
            change_password,        
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
