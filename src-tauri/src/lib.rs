mod olscore;
mod stylus;

#[tauri::command]
fn get_cli_file_arg() -> Option<String> {
    std::env::args().nth(1).filter(|arg| {
        let lower = arg.to_lowercase();
        lower.ends_with(".pdf") || lower.ends_with(".olscore")
    })
}

#[cfg(target_os = "linux")]
fn disable_pinch_zoom(app: &tauri::App) {
    use tauri::Manager;
    use webkit2gtk::glib::prelude::ObjectExt;
    let webview = app.get_webview_window("main").expect("main window");
    webview
        .with_webview(|wv| unsafe {
            let inner = wv.inner();
            if let Some(data) = inner.data::<u8>("wk-view-zoom-gesture") {
                gobject_sys::g_signal_handlers_destroy(data.as_ptr() as *mut gobject_sys::GObject);
            }
        })
        .ok();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_keepawake::init())
        .invoke_handler(tauri::generate_handler![
            get_cli_file_arg,
            stylus::list_input_devices,
            stylus::find_stylus_device,
            stylus::read_stylus_events,
            stylus::read_raw_events,
            olscore::ensure_library,
            olscore::import_pdf,
            olscore::open_score,
            olscore::get_extracted_pdf_path,
            olscore::list_library,
            olscore::update_manifest,
            olscore::read_notes,
            olscore::save_notes,
        ])
        .setup(|app| {
            #[cfg(target_os = "linux")]
            disable_pinch_zoom(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
