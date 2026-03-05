# TODO — .olscore Migration & Rework

## Phase 1: Remove PDF Writer Dependencies

- [x] Remove `xmp_toolkit`, `qpdf`, `qpdf-sys` from `Cargo.toml`
- [x] Delete `src-tauri/src/pdf.rs` entirely
- [x] Remove `mod pdf` and the three pdf:: invoke handlers from `lib.rs`
- [x] Remove frontend calls to `get_pdf_content_id`, `get_pdf_legato_metadata`, `set_pdf_legato_metadata` in `usePdfDocument.ts`
- [x] Verify `cargo build` and `pnpm build` succeed after removal

## Phase 2: Implement .olscore Format (Rust Backend)

- [ ] Add `zip` crate to Cargo.toml
- [ ] Create `src-tauri/src/olscore.rs` module with:
  - [ ] `import_pdf(source_path) -> Result<String>` — copies PDF into new .olscore in library dir, returns score ID
  - [ ] `open_score(score_path) -> Result<ScoreManifest>` — reads manifest.json from .olscore
  - [ ] `read_pdf_from_score(score_path, pdf_filename) -> Result<Vec<u8>>` — extracts a PDF from the archive
  - [ ] `save_notes(score_path, notes_json)` — writes notes.json back into the .olscore
  - [ ] `update_manifest(score_path, manifest)` — updates manifest.json in the .olscore
- [ ] Register new Tauri commands in `lib.rs`
- [ ] Create library directory on first launch (platform app data dir)

## Phase 3: Rework Frontend

- [ ] Replace file-open flow: import dialog → `import_pdf` command → open from library
- [ ] Rework `usePdfDocument.ts`: load PDF bytes from .olscore via Tauri command instead of direct FS read
- [ ] Move `starts_on_left` and display settings to manifest.json (was XMP)
- [ ] Rework page cache keying: use score ID + pdf filename instead of PDF content ID
- [ ] Auto-save: debounced write of notes.json on annotation changes
- [ ] Update CLI arg handling: importing a PDF path creates .olscore, then opens it

## Phase 4: Library Management (Post-MVP)

- [ ] Library index (`library.json`) for fast browsing without opening each .olscore
- [ ] Library browser UI (grid/list view with thumbnails)
- [ ] Search by title, composer, tags
- [ ] Tag management
- [ ] Delete/rename scores from library
- [ ] Import multiple PDFs into one score (multi-movement)
- [ ] Export/share .olscore files

## Rework Impact Map

Files that need modification:

| File | Change |
|------|--------|
| `src-tauri/Cargo.toml` | Remove xmp_toolkit, qpdf, qpdf-sys; add zip |
| `src-tauri/src/pdf.rs` | **Delete** |
| `src-tauri/src/lib.rs` | Remove pdf module, add olscore module + commands |
| `src/hooks/usePdfDocument.ts` | Rework to load from .olscore |
| `src/util/pageImageCache.ts` | Update cache key strategy |
| `src/App.tsx` | Update file-open flow to import flow |
| `src-tauri/capabilities/default.json` | Update FS permissions for library dir |
| `src-tauri/tauri.conf.json` | Register .olscore file association |
