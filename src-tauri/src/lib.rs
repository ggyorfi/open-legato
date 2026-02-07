mod pdf;
mod stylus;

#[tauri::command]
fn get_cli_file_arg() -> Option<String> {
    std::env::args()
        .nth(1)
        .filter(|arg| arg.to_lowercase().ends_with(".pdf"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_cli_file_arg,
            stylus::list_input_devices,
            stylus::find_stylus_device,
            stylus::read_stylus_events,
            stylus::read_raw_events,
            pdf::get_pdf_legato_metadata,
            pdf::set_pdf_legato_metadata,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
