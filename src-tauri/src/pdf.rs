use std::ffi::CString;
use std::fs;
use xmp_toolkit::{OpenFileOptions, XmpFile, XmpMeta, XmpValue};

/// Open Legato's custom XMP namespace
const LEGATO_NS: &str = "http://ns.openlegato.app/1.0/";
const LEGATO_PREFIX: &str = "legato";

/// XMP packet with substantial padding for in-place updates by xmp_toolkit
/// The padding (whitespace) allows xmp_toolkit to expand the metadata without restructuring
const EMPTY_XMP_PACKET: &str = concat!(
    r#"<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>"#, "\n",
    r#"<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Open Legato 1.0">"#, "\n",
    r#"  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">"#, "\n",
    r#"    <rdf:Description rdf:about=""/>"#, "\n",
    r#"  </rdf:RDF>"#, "\n",
    r#"</x:xmpmeta>"#, "\n",
    // 2KB of padding for future edits (xmp_toolkit needs this for in-place updates)
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    "                                                                                \n",
    r#"<?xpacket end="w"?>"#
);

/// Register our custom namespace (call once at startup)
fn register_namespace() {
    let _ = XmpMeta::register_namespace(LEGATO_NS, LEGATO_PREFIX);
}

/// Settings stored in PDF XMP metadata
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct LegatoMetadata {
    #[serde(default)]
    pub starts_on_left: Option<bool>,
    // Future: annotations, bookmarks, setlist info, etc.
}

/// Use qpdf low-level API to inject XMP metadata stream into PDF
fn inject_xmp_with_qpdf(path: &str) -> Result<(), String> {
    use qpdf_sys::*;

    println!("[PDF] Injecting XMP metadata stream using qpdf low-level API...");

    unsafe {
        // Initialize qpdf
        let qpdf = qpdf_init();
        if qpdf.is_null() {
            return Err("Failed to initialize qpdf".to_string());
        }

        // Read the PDF file
        let path_cstr = CString::new(path).map_err(|_| "Invalid path")?;
        let password_cstr = CString::new("").unwrap();
        println!("[PDF] qpdf reading file: {}", path);
        let result = qpdf_read(qpdf, path_cstr.as_ptr(), password_cstr.as_ptr());
        println!("[PDF] qpdf_read returned: {} (SUCCESS=0, WARNINGS=1, ERRORS=2)", result);
        // QPDF_WARNINGS (1) means success with warnings - PDF was repaired
        if result == QPDF_ERRORS as i32 {
            let err = get_qpdf_error(qpdf);
            println!("[PDF] qpdf error details: {}", err);
            qpdf_cleanup(&mut (qpdf as *mut _));
            return Err(format!("Failed to read PDF: {}", err));
        }
        if result == QPDF_WARNINGS as i32 {
            println!("[PDF] qpdf read PDF with warnings (file was repaired)");
        } else {
            println!("[PDF] qpdf successfully read PDF");
        }

        // Get the root/catalog
        let root = qpdf_get_root(qpdf);
        println!("[PDF] root handle: {}", root);
        if root == 0 {
            qpdf_cleanup(&mut (qpdf as *mut _));
            return Err("Failed to get PDF root/catalog".to_string());
        }

        // Check if /Metadata already exists - we'll replace it with properly padded XMP
        let metadata_key = CString::new("/Metadata").unwrap();
        let existing_metadata = qpdf_oh_get_key(qpdf, root, metadata_key.as_ptr());
        if qpdf_oh_is_initialized(qpdf, existing_metadata) != 0
           && qpdf_oh_get_type_code(qpdf, existing_metadata) != qpdf_object_type_e_ot_null {
            println!("[PDF] PDF has existing /Metadata, will replace with padded XMP");
            // Remove the existing metadata so we can add our properly padded version
            qpdf_oh_remove_key(qpdf, root, metadata_key.as_ptr());
        }

        // Create a new stream for the XMP metadata
        let metadata_stream = qpdf_oh_new_stream(qpdf);
        println!("[PDF] new stream handle: {}", metadata_stream);
        if metadata_stream == 0 {
            qpdf_cleanup(&mut (qpdf as *mut _));
            return Err("Failed to create metadata stream".to_string());
        }

        // Set the stream data (use null objects for no filter/decode_parms)
        let xmp_data = EMPTY_XMP_PACKET.as_bytes();
        let null_obj = qpdf_oh_new_null(qpdf);
        println!("[PDF] replacing stream data ({} bytes), null_obj={}", xmp_data.len(), null_obj);
        qpdf_oh_replace_stream_data(
            qpdf,
            metadata_stream,
            xmp_data.as_ptr(),
            xmp_data.len(),
            null_obj, // no filter
            null_obj, // no decode parms
        );

        // Get the stream's dictionary and set /Type and /Subtype
        let stream_dict = qpdf_oh_get_dict(qpdf, metadata_stream);
        println!("[PDF] stream dict handle: {}", stream_dict);

        let type_key = CString::new("/Type").unwrap();
        let type_name = CString::new("/Metadata").unwrap();
        let type_value = qpdf_oh_new_name(qpdf, type_name.as_ptr());
        println!("[PDF] type_value handle: {}", type_value);
        qpdf_oh_replace_key(qpdf, stream_dict, type_key.as_ptr(), type_value);

        let subtype_key = CString::new("/Subtype").unwrap();
        let subtype_name = CString::new("/XML").unwrap();
        let subtype_value = qpdf_oh_new_name(qpdf, subtype_name.as_ptr());
        println!("[PDF] subtype_value handle: {}", subtype_value);
        qpdf_oh_replace_key(qpdf, stream_dict, subtype_key.as_ptr(), subtype_value);

        // Add /Metadata to the root catalog pointing to our stream
        // Need to make it an indirect reference first
        let metadata_indirect = qpdf_make_indirect_object(qpdf, metadata_stream);
        println!("[PDF] metadata_indirect handle: {}", metadata_indirect);
        qpdf_oh_replace_key(qpdf, root, metadata_key.as_ptr(), metadata_indirect);
        println!("[PDF] added /Metadata to root catalog");

        // Write to a temp file
        let temp_path = format!("{}.tmp", path);
        let temp_path_cstr = CString::new(temp_path.as_str()).map_err(|_| "Invalid temp path")?;

        // Initialize writer
        qpdf_init_write(qpdf, temp_path_cstr.as_ptr());
        qpdf_set_static_ID(qpdf, QPDF_FALSE as i32); // Generate new ID
        qpdf_set_preserve_unreferenced_objects(qpdf, QPDF_FALSE as i32);

        let write_result = qpdf_write(qpdf);
        println!("[PDF] qpdf_write returned: {} (SUCCESS=0, WARNINGS=1, ERRORS=2)", write_result);
        if write_result == QPDF_ERRORS as i32 {
            let err = get_qpdf_error(qpdf);
            qpdf_cleanup(&mut (qpdf as *mut _));
            fs::remove_file(&temp_path).ok();
            return Err(format!("Failed to write PDF: {}", err));
        }
        if write_result == QPDF_WARNINGS as i32 {
            println!("[PDF] qpdf wrote PDF with warnings");
        }

        // Cleanup qpdf
        qpdf_cleanup(&mut (qpdf as *mut _));

        // Move temp file to original
        fs::rename(&temp_path, path)
            .map_err(|e| format!("Failed to replace original PDF: {}", e))?;

        println!("[PDF] Successfully injected XMP metadata stream");
        Ok(())
    }
}

/// Helper to get error message from qpdf
unsafe fn get_qpdf_error(qpdf: qpdf_sys::qpdf_data) -> String {
    // Check for error
    if qpdf_sys::qpdf_has_error(qpdf) != 0 {
        let err = qpdf_sys::qpdf_get_error(qpdf);
        if !err.is_null() {
            let msg = qpdf_sys::qpdf_get_error_full_text(qpdf, err);
            if !msg.is_null() {
                return std::ffi::CStr::from_ptr(msg)
                    .to_string_lossy()
                    .to_string();
            }
        }
    }

    // Check for warnings that might explain the issue
    while qpdf_sys::qpdf_more_warnings(qpdf) != 0 {
        let warn = qpdf_sys::qpdf_next_warning(qpdf);
        if !warn.is_null() {
            let msg = qpdf_sys::qpdf_get_error_full_text(qpdf, warn);
            if !msg.is_null() {
                let warning = std::ffi::CStr::from_ptr(msg).to_string_lossy();
                println!("[PDF] qpdf warning: {}", warning);
            }
        }
    }

    "Unknown error (no error details available)".to_string()
}

/// Read Open Legato metadata from PDF's XMP
#[tauri::command]
pub fn get_pdf_legato_metadata(path: String) -> Result<LegatoMetadata, String> {
    register_namespace();

    let mut file = XmpFile::new().map_err(|e| format!("Failed to create XmpFile: {}", e))?;

    file.open_file(&path, OpenFileOptions::default().only_xmp())
        .map_err(|e| format!("Failed to open PDF for reading XMP: {}", e))?;

    let xmp = match file.xmp() {
        Some(xmp) => xmp,
        None => {
            println!("[PDF] No XMP metadata found in file");
            return Ok(LegatoMetadata::default());
        }
    };

    let mut metadata = LegatoMetadata::default();

    if let Some(XmpValue { value, .. }) = xmp.property(LEGATO_NS, "startsOnLeft") {
        metadata.starts_on_left = match value.as_str() {
            "true" => Some(true),
            "false" => Some(false),
            _ => None,
        };
        println!("[PDF] Found Open Legato metadata: {:?}", metadata);
    }

    Ok(metadata)
}

/// Write Open Legato metadata to PDF's XMP
#[tauri::command]
pub fn set_pdf_legato_metadata(path: String, metadata: LegatoMetadata) -> Result<(), String> {
    register_namespace();

    // Check file permissions
    let file_metadata = fs::metadata(&path)
        .map_err(|e| format!("Cannot access file: {}", e))?;

    if file_metadata.permissions().readonly() {
        return Err("File is read-only".to_string());
    }

    // First attempt: try xmp_toolkit directly
    match try_write_xmp(&path, &metadata) {
        Ok(()) => return Ok(()),
        Err(e) => println!("[PDF] Direct XMP write failed: {}", e),
    }

    // Second attempt: inject XMP structure with qpdf, then retry
    println!("[PDF] Attempting to inject XMP structure with qpdf...");
    if let Err(e) = inject_xmp_with_qpdf(&path) {
        println!("[PDF] qpdf injection failed: {}", e);
        return Err(format!("Cannot add XMP to this PDF: {}", e));
    }

    // Third attempt: retry xmp_toolkit after qpdf injection
    println!("[PDF] Retrying xmp_toolkit after qpdf injection...");
    match try_write_xmp(&path, &metadata) {
        Ok(()) => {
            println!("[PDF] Success! Metadata written after qpdf injection");
            Ok(())
        },
        Err(e) => {
            println!("[PDF] xmp_toolkit still failed after injection: {}", e);
            Err(format!(
                "XMP was injected but still cannot write: {}",
                e
            ))
        }
    }
}

/// Try to write XMP metadata using xmp_toolkit
fn try_write_xmp(path: &str, metadata: &LegatoMetadata) -> Result<(), String> {
    let mut file = XmpFile::new().map_err(|e| format!("Failed to create XmpFile: {}", e))?;

    file.open_file(
        path,
        OpenFileOptions::default()
            .for_update()
            .optimize_file_layout(),
    )
    .map_err(|e| format!("Failed to open PDF: {}", e))?;

    let mut xmp = file.xmp().unwrap_or_else(|| XmpMeta::new().unwrap());

    if let Some(starts_on_left) = metadata.starts_on_left {
        xmp.set_property(
            LEGATO_NS,
            "startsOnLeft",
            &XmpValue::new(if starts_on_left { "true" } else { "false" }.to_string()),
        )
        .map_err(|e| format!("Failed to set property: {}", e))?;
    }

    let can_put = file.can_put_xmp(&xmp);
    println!("[PDF] can_put_xmp: {}", can_put);

    if can_put {
        file.put_xmp(&xmp).map_err(|e| format!("Failed to write XMP: {}", e))?;
        file.close();
        println!("[PDF] Successfully saved metadata: {:?}", metadata);
        Ok(())
    } else {
        Err("PDF doesn't support XMP writes (no existing XMP packet)".to_string())
    }
}
