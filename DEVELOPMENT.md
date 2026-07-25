# Development

## Architecture

Tauri v2 desktop app. The React frontend handles the UI, PDF rendering (via PDF.js), and annotations. The Rust backend handles the file system and `.olscore` archive management.

### .olscore Document Format

`.olscore` is a ZIP archive containing the PDF(s) plus `manifest.json` (metadata + display settings) and `notes.json` (annotations and bookmarks). PDFs inside are never modified. See [`docs/olscore-format.md`](docs/olscore-format.md) for the full spec.

## Tech Stack

| Layer           | Technology                 |
| --------------- | -------------------------- |
| Framework       | Tauri v2.11                |
| Frontend        | React 19, TypeScript, Vite |
| PDF Rendering   | PDF.js (pdfjs-dist v5.7)   |
| Backend         | Rust                       |
| Package Manager | pnpm                       |

## Build & run

```bash
pnpm install
pnpm tauri dev                              # dev mode
pnpm tauri build                            # production build
cd src-tauri && cargo clippy && cargo test  # Rust checks
```

## Roadmap

Ticked items are in the app today. The rest is roughly in priority order. `TODO.md` has the effort estimates and the remaining `.olscore` migration detail.

- [x] PDF rendering (PDF.js)
- [x] Horizontal snap-to-page layout with GPU transforms
- [x] Page cache: asymmetric sliding window, 4 pages back and 5 ahead, disk PNG + memory layer
- [x] Touch/swipe gestures, fullscreen mode, dual-page spread
- [x] Display stays awake in fullscreen
- [x] Settings persistence, customizable touch buttons with edit mode
- [x] Stylus detection (Linux evdev)
- [x] `.olscore` format, PDF import, library list
- [x] Title picked up from PDF metadata
- [x] Open a PDF or `.olscore` from the command line
- [x] Repeat buttons
- [x] Bookmark manager
- [x] Hide pages: they stay in the PDF but are skipped while reading
- [ ] Library index so browsing does not open every `.olscore`
- [ ] Library search by title and composer
- [ ] IMSLP browser
- [ ] Library tags
- [ ] Shareable `.olscore` export
- [ ] Delete and rename scores from the library
- [ ] Thumbnails in the library browser
- [ ] Canvas pen tool
- [ ] Annotation persistence in notes.json
- [ ] Highlight, text and shape tools
- [ ] Undo/redo for annotations
- [ ] Multiple PDFs in one score (multi-movement)
- [ ] Setlist manager
- [ ] External pedal mapping (USB/Bluetooth)
- [ ] Render scale that follows the window size
- [ ] Integrated group chat
