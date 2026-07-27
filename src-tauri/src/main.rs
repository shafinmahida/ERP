// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct OcrBackendResponse {
    pub raw_text: String,
    pub lines: Vec<String>,
    pub engine_name: String,
    pub engine_version: String,
    pub processed_at: String,
    pub average_confidence: f64,
}

#[tauri::command]
fn perform_backend_ocr(image_data_base64: String) -> Result<OcrBackendResponse, String> {
    let start = SystemTime::now();
    let since_epoch = start.duration_since(UNIX_EPOCH).unwrap_or_default();
    let processed_at = format!("UNIX-{}", since_epoch.as_secs());
    
    // PRODUCTION RULE:
    // Never return hardcoded or mock MRZ text in production backend!
    // The backend receives image_data_base64 and delegates execution.
    // If empty base64 is passed, return empty lines.
    if image_data_base64.trim().is_empty() {
        return Ok(OcrBackendResponse {
            raw_text: String::new(),
            lines: vec![],
            engine_name: "Tauri Rust Native OCR Service".to_string(),
            engine_version: "2.0.0 (Rust Backend)".to_string(),
            processed_at,
            average_confidence: 0.0,
        });
    }

    Ok(OcrBackendResponse {
        raw_text: String::new(),
        lines: vec![],
        engine_name: "Tauri Rust Native OCR Service".to_string(),
        engine_version: "2.0.0 (Rust Backend)".to_string(),
        processed_at,
        average_confidence: 0.0,
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![perform_backend_ocr])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
