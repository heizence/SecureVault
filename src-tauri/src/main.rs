// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// `greet` 라는 이름의 Tauri Command를 정의합니다.
#[tauri::command]
fn greet(name: &str) -> String {
    // 이 println!은 Rust의 콘솔(터미널)에 출력됩니다.
    println!("Rust function `greet` was called with name: {}", name); 
    // 이 문자열이 React 프론트엔드로 반환됩니다.
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    tauri::Builder::default()
        // 위에서 정의한 greet command를 등록합니다.
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}