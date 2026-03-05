use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::time::SystemTime;
use tauri::{AppHandle, Manager};
use uuid::Uuid;
use zip::write::FileOptions;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdfEntry {
    pub filename: String,
    pub title: String,
    pub page_count: u32,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplaySettings {
    #[serde(default)]
    pub starts_on_left: bool,
}

impl Default for DisplaySettings {
    fn default() -> Self {
        Self {
            starts_on_left: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreManifest {
    pub format_version: String,
    pub pdfs: Vec<PdfEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub composer: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(default)]
    pub display: DisplaySettings,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pdf_metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryEntry {
    pub id: String,
    pub title: String,
    pub sha256: String,
    pub created_at: String,
    pub last_opened_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryIndex {
    pub scores: Vec<LibraryEntry>,
}

fn iso8601_now() -> String {
    let duration = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();
    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let minutes = (time_secs % 3600) / 60;
    let seconds = time_secs % 60;

    // Simple date calculation from days since epoch
    let mut y = 1970i64;
    let mut remaining_days = days as i64;
    loop {
        let year_days = if y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) {
            366
        } else {
            365
        };
        if remaining_days < year_days {
            break;
        }
        remaining_days -= year_days;
        y += 1;
    }
    let leap = y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
    let month_days = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    let mut m = 0usize;
    for md in &month_days {
        if remaining_days < *md as i64 {
            break;
        }
        remaining_days -= *md as i64;
        m += 1;
    }

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        y,
        m + 1,
        remaining_days + 1,
        hours,
        minutes,
        seconds
    )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepeatButton {
    pub id: String,
    pub page: u32,
    pub target_page: u32,
    pub label: String,
    #[serde(alias = "x")]
    pub offset_x: f64,
    #[serde(alias = "y")]
    pub offset_y: f64,
    pub size: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotesData {
    pub format_version: String,
    #[serde(default)]
    pub repeat_buttons: Vec<RepeatButton>,
}

impl Default for NotesData {
    fn default() -> Self {
        Self {
            format_version: "0.1".into(),
            repeat_buttons: Vec::new(),
        }
    }
}

fn library_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {e}"))?;
    Ok(data_dir.join("library"))
}

fn library_index_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(library_dir(app)?.join("library.json"))
}

fn read_library_index(app: &AppHandle) -> Result<LibraryIndex, String> {
    let path = library_index_path(app)?;
    if !path.exists() {
        return Ok(LibraryIndex {
            scores: Vec::new(),
        });
    }
    let data = fs::read_to_string(&path).map_err(|e| format!("Failed to read library.json: {e}"))?;
    serde_json::from_str(&data).map_err(|e| format!("Failed to parse library.json: {e}"))
}

fn write_library_index(app: &AppHandle, index: &LibraryIndex) -> Result<(), String> {
    let path = library_index_path(app)?;
    let data =
        serde_json::to_string_pretty(index).map_err(|e| format!("Failed to serialize: {e}"))?;
    fs::write(&path, data).map_err(|e| format!("Failed to write library.json: {e}"))
}

fn cache_dir_for_score(app: &AppHandle, score_id: &str) -> Result<PathBuf, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Failed to get cache dir: {e}"))?;
    Ok(cache_dir.join("extracted").join(score_id))
}

fn score_path(app: &AppHandle, score_id: &str) -> Result<PathBuf, String> {
    Ok(library_dir(app)?.join(format!("{score_id}.olscore")))
}

fn extract_pdf_if_needed(
    app: &AppHandle,
    score_id: &str,
    pdf_filename: &str,
) -> Result<PathBuf, String> {
    let extract_dir = cache_dir_for_score(app, score_id)?;
    let extracted_path = extract_dir.join(pdf_filename);

    if extracted_path.exists() {
        return Ok(extracted_path);
    }

    let olscore_path = score_path(app, score_id)?;
    let file =
        fs::File::open(&olscore_path).map_err(|e| format!("Failed to open .olscore: {e}"))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP: {e}"))?;

    let archive_path = format!("pdfs/{pdf_filename}");
    let mut entry = archive
        .by_name(&archive_path)
        .map_err(|e| format!("PDF not found in archive: {e}"))?;

    fs::create_dir_all(&extract_dir)
        .map_err(|e| format!("Failed to create extract dir: {e}"))?;

    let mut out =
        fs::File::create(&extracted_path).map_err(|e| format!("Failed to create file: {e}"))?;
    std::io::copy(&mut entry, &mut out).map_err(|e| format!("Failed to extract PDF: {e}"))?;

    Ok(extracted_path)
}

#[tauri::command]
pub fn ensure_library(app: AppHandle) -> Result<String, String> {
    let lib_dir = library_dir(&app)?;
    fs::create_dir_all(&lib_dir).map_err(|e| format!("Failed to create library dir: {e}"))?;

    let index_path = library_index_path(&app)?;
    if !index_path.exists() {
        write_library_index(
            &app,
            &LibraryIndex {
                scores: Vec::new(),
            },
        )?;
    }

    lib_dir
        .to_str()
        .map(String::from)
        .ok_or_else(|| "Invalid library path".into())
}

#[tauri::command]
pub fn import_pdf(app: AppHandle, source_path: String) -> Result<LibraryEntry, String> {
    let pdf_bytes =
        fs::read(&source_path).map_err(|e| format!("Failed to read PDF: {e}"))?;

    let mut hasher = Sha256::new();
    hasher.update(&pdf_bytes);
    let sha256 = format!("{:x}", hasher.finalize());

    // Dedup check
    let mut index = read_library_index(&app)?;
    if let Some(pos) = index.scores.iter().position(|s| s.sha256 == sha256) {
        index.scores[pos].last_opened_at = iso8601_now();
        let entry = index.scores[pos].clone();
        write_library_index(&app, &index)?;
        return Ok(entry);
    }

    let score_id = Uuid::new_v4().to_string();
    let now = iso8601_now();

    let pdf_filename = std::path::Path::new(&source_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("score.pdf")
        .to_string();

    let title = pdf_filename
        .strip_suffix(".pdf")
        .or_else(|| pdf_filename.strip_suffix(".PDF"))
        .unwrap_or(&pdf_filename)
        .to_string();

    let manifest = ScoreManifest {
        format_version: "0.1".into(),
        pdfs: vec![PdfEntry {
            filename: pdf_filename.clone(),
            title: title.clone(),
            page_count: 0, // Frontend determines this via PDF.js
            sha256: sha256.clone(),
        }],
        title: Some(title.clone()),
        composer: None,
        tags: Vec::new(),
        display: DisplaySettings::default(),
        created_at: Some(now.clone()),
        modified_at: Some(now.clone()),
        pdf_metadata: None,
    };

    // Create .olscore ZIP
    let olscore_path = score_path(&app, &score_id)?;
    let lib_dir = library_dir(&app)?;
    fs::create_dir_all(&lib_dir).map_err(|e| format!("Failed to create library dir: {e}"))?;

    let file =
        fs::File::create(&olscore_path).map_err(|e| format!("Failed to create .olscore: {e}"))?;
    let mut zip = zip::ZipWriter::new(file);
    let options: FileOptions<'_, ()> =
        FileOptions::default().compression_method(zip::CompressionMethod::Stored);

    let manifest_json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("Failed to serialize manifest: {e}"))?;
    zip.start_file("manifest.json", options)
        .map_err(|e| format!("Failed to write manifest: {e}"))?;
    zip.write_all(manifest_json.as_bytes())
        .map_err(|e| format!("Failed to write manifest data: {e}"))?;

    let pdf_archive_path = format!("pdfs/{pdf_filename}");
    zip.start_file(&pdf_archive_path, options)
        .map_err(|e| format!("Failed to add PDF to archive: {e}"))?;
    zip.write_all(&pdf_bytes)
        .map_err(|e| format!("Failed to write PDF data: {e}"))?;

    zip.finish()
        .map_err(|e| format!("Failed to finalize ZIP: {e}"))?;

    // Extract PDF to cache for immediate use
    extract_pdf_if_needed(&app, &score_id, &pdf_filename)?;

    let entry = LibraryEntry {
        id: score_id,
        title,
        sha256: sha256.clone(),
        created_at: now.clone(),
        last_opened_at: now,
    };

    index.scores.push(entry.clone());
    write_library_index(&app, &index)?;

    Ok(entry)
}

#[tauri::command]
pub fn open_score(app: AppHandle, score_id: String) -> Result<ScoreManifest, String> {
    let olscore_path = score_path(&app, &score_id)?;
    let file =
        fs::File::open(&olscore_path).map_err(|e| format!("Failed to open .olscore: {e}"))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP: {e}"))?;

    let manifest: ScoreManifest = {
        let mut entry = archive
            .by_name("manifest.json")
            .map_err(|e| format!("manifest.json not found: {e}"))?;
        let mut buf = String::new();
        entry
            .read_to_string(&mut buf)
            .map_err(|e| format!("Failed to read manifest: {e}"))?;
        serde_json::from_str(&buf).map_err(|e| format!("Failed to parse manifest: {e}"))?
    };

    // Extract PDFs to cache
    for pdf in &manifest.pdfs {
        extract_pdf_if_needed(&app, &score_id, &pdf.filename)?;
    }

    // Update last_opened_at
    let mut index = read_library_index(&app)?;
    if let Some(entry) = index.scores.iter_mut().find(|s| s.id == score_id) {
        entry.last_opened_at = iso8601_now();
        write_library_index(&app, &index)?;
    }

    Ok(manifest)
}

#[tauri::command]
pub fn get_extracted_pdf_path(
    app: AppHandle,
    score_id: String,
    pdf_filename: String,
) -> Result<String, String> {
    let path = extract_pdf_if_needed(&app, &score_id, &pdf_filename)?;
    path.to_str()
        .map(String::from)
        .ok_or_else(|| "Invalid path".into())
}

#[tauri::command]
pub fn list_library(app: AppHandle) -> Result<Vec<LibraryEntry>, String> {
    let mut index = read_library_index(&app)?;
    index
        .scores
        .sort_by(|a, b| b.last_opened_at.cmp(&a.last_opened_at));
    Ok(index.scores)
}

#[tauri::command]
pub fn update_manifest(
    app: AppHandle,
    score_id: String,
    manifest: ScoreManifest,
) -> Result<(), String> {
    let olscore_path = score_path(&app, &score_id)?;

    // Read all existing entries
    let file =
        fs::File::open(&olscore_path).map_err(|e| format!("Failed to open .olscore: {e}"))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP: {e}"))?;

    let tmp_path = olscore_path.with_extension("olscore.tmp");
    let tmp_file =
        fs::File::create(&tmp_path).map_err(|e| format!("Failed to create temp file: {e}"))?;
    let mut writer = zip::ZipWriter::new(tmp_file);
    let options: FileOptions<'_, ()> =
        FileOptions::default().compression_method(zip::CompressionMethod::Stored);

    // Copy all entries except manifest.json
    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read entry: {e}"))?;
        if entry.name() == "manifest.json" {
            continue;
        }
        let mut buf = Vec::new();
        entry
            .read_to_end(&mut buf)
            .map_err(|e| format!("Failed to read entry data: {e}"))?;
        writer
            .start_file(entry.name(), options)
            .map_err(|e| format!("Failed to start file: {e}"))?;
        writer
            .write_all(&buf)
            .map_err(|e| format!("Failed to write entry: {e}"))?;
    }

    // Write updated manifest
    let mut updated_manifest = manifest;
    updated_manifest.modified_at = Some(iso8601_now());
    let manifest_json = serde_json::to_string_pretty(&updated_manifest)
        .map_err(|e| format!("Failed to serialize manifest: {e}"))?;
    writer
        .start_file("manifest.json", options)
        .map_err(|e| format!("Failed to write manifest: {e}"))?;
    writer
        .write_all(manifest_json.as_bytes())
        .map_err(|e| format!("Failed to write manifest data: {e}"))?;

    writer
        .finish()
        .map_err(|e| format!("Failed to finalize ZIP: {e}"))?;

    fs::rename(&tmp_path, &olscore_path)
        .map_err(|e| format!("Failed to replace .olscore: {e}"))?;

    // Sync title to library index
    if let Some(title) = &updated_manifest.title {
        let mut index = read_library_index(&app)?;
        if let Some(entry) = index.scores.iter_mut().find(|s| s.id == score_id) {
            if entry.title != *title {
                entry.title = title.clone();
                write_library_index(&app, &index)?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn read_notes(app: AppHandle, score_id: String) -> Result<NotesData, String> {
    let olscore_path = score_path(&app, &score_id)?;
    let file =
        fs::File::open(&olscore_path).map_err(|e| format!("Failed to open .olscore: {e}"))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP: {e}"))?;

    let result = match archive.by_name("notes.json") {
        Ok(mut entry) => {
            let mut buf = String::new();
            entry
                .read_to_string(&mut buf)
                .map_err(|e| format!("Failed to read notes.json: {e}"))?;
            serde_json::from_str(&buf).map_err(|e| format!("Failed to parse notes.json: {e}"))
        }
        Err(_) => Ok(NotesData::default()),
    };
    result
}

#[tauri::command]
pub fn save_notes(app: AppHandle, score_id: String, notes: NotesData) -> Result<(), String> {
    let olscore_path = score_path(&app, &score_id)?;

    let file =
        fs::File::open(&olscore_path).map_err(|e| format!("Failed to open .olscore: {e}"))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP: {e}"))?;

    let tmp_path = olscore_path.with_extension("olscore.tmp");
    let tmp_file =
        fs::File::create(&tmp_path).map_err(|e| format!("Failed to create temp file: {e}"))?;
    let mut writer = zip::ZipWriter::new(tmp_file);
    let options: FileOptions<'_, ()> =
        FileOptions::default().compression_method(zip::CompressionMethod::Stored);

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read entry: {e}"))?;
        if entry.name() == "notes.json" {
            continue;
        }
        let mut buf = Vec::new();
        entry
            .read_to_end(&mut buf)
            .map_err(|e| format!("Failed to read entry data: {e}"))?;
        writer
            .start_file(entry.name(), options)
            .map_err(|e| format!("Failed to start file: {e}"))?;
        writer
            .write_all(&buf)
            .map_err(|e| format!("Failed to write entry: {e}"))?;
    }

    let notes_json = serde_json::to_string_pretty(&notes)
        .map_err(|e| format!("Failed to serialize notes: {e}"))?;
    writer
        .start_file("notes.json", options)
        .map_err(|e| format!("Failed to write notes.json: {e}"))?;
    writer
        .write_all(notes_json.as_bytes())
        .map_err(|e| format!("Failed to write notes data: {e}"))?;

    writer
        .finish()
        .map_err(|e| format!("Failed to finalize ZIP: {e}"))?;

    fs::rename(&tmp_path, &olscore_path)
        .map_err(|e| format!("Failed to replace .olscore: {e}"))?;

    Ok(())
}
