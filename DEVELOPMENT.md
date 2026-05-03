# Development

## Architecture

Tauri v2 desktop app. The React frontend handles the UI, PDF rendering (via PDF.js), and annotations. The Rust backend handles the file system and `.olscore` archive management.

### .olscore Document Format

`.olscore` is a ZIP archive containing the PDF(s) plus `manifest.json` (metadata + display settings) and `notes.json` (annotations and bookmarks). PDFs inside are never modified. See [`docs/olscore-format.md`](docs/olscore-format.md) for the full spec.

## Tech Stack

| Layer           | Technology                 |
| --------------- | -------------------------- |
| Framework       | Tauri v2.5                 |
| Frontend        | React 19, TypeScript, Vite |
| PDF Rendering   | PDF.js (pdfjs-dist v5.4)   |
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

Working today:

- PDF rendering (PDF.js)
- Horizontal snap-to-page layout with GPU transforms
- Page cache: asymmetric sliding window, 9 pages, disk WebP + memory layer
- Touch/swipe gestures, fullscreen mode, dual-page spread
- Settings persistence, customizable touch buttons with edit mode
- Stylus detection (Linux evdev)

Next (MVP v0.1):

- `.olscore` format
- PDF import + library management
- Canvas pen tool
- Annotation persistence

Later:

- Library browser UI (search, tags, thumbnails)
- More annotation tools (highlight, text, shapes)
- Undo/redo
- Setlist manager
- External pedal mapping (USB/Bluetooth)
