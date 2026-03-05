# Open Legato

An open-source, cross-platform sheet-music reader for pianists and classical musicians.

## Features

- **Instant page flips** — zero-latency touch, tap, or pedal page turning
- **Horizontal snap-to-page layout** — no scroll drift, deterministic navigation
- **Fullscreen performance mode** — distraction-free with auto-hiding toolbar
- **High-quality PDF rendering** — powered by PDF.js
- **Natural pen annotations** — pressure-sensitive freehand drawing (planned)
- **Library management** — import PDFs, organize with tags, search (planned)
- **Cross-platform** — Linux, macOS, Windows

## Architecture

**Tauri v2** desktop app with:
- **React 19 + TypeScript** frontend (UI, PDF rendering via PDF.js, annotations)
- **Rust** backend (file system, .olscore archive management)

### .olscore Document Format

Open Legato uses its own `.olscore` format — a ZIP archive containing:
- One or more PDF files (never modified)
- `manifest.json` — metadata, display settings
- `notes.json` — annotations, bookmarks, text notes

Users **import** PDFs into the app's managed library. All changes are auto-saved to the `.olscore` file. See [`docs/olscore-format.md`](docs/olscore-format.md) for the full spec.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Tauri v2.5 |
| Frontend | React 19, TypeScript, Vite |
| PDF Rendering | PDF.js (pdfjs-dist v5.4) |
| Backend | Rust |
| Package Manager | pnpm |

## Development

```bash
# Install dependencies
pnpm install

# Run in dev mode (starts both Vite + Tauri)
pnpm tauri dev

# Build for production
pnpm tauri build

# Rust checks
cd src-tauri && cargo clippy && cargo test
```

## Current Status

**Working:**
- PDF loading and rendering (PDF.js)
- Horizontal snap-to-page layout with GPU-accelerated transforms
- Page cache with asymmetric sliding window (9 pages, disk WebP + memory)
- Touch/swipe gestures, fullscreen mode, dual-page spreads
- Settings persistence, customizable touch buttons with edit mode
- Stylus/pen detection infrastructure (Linux evdev)

**In Progress (MVP v0.1):**
- .olscore format implementation
- PDF import flow + library management
- Canvas pen tool for annotations
- Annotation persistence

**Planned:**
- Library browser UI (search, tags, thumbnails)
- Advanced annotation tools (highlight, text, shapes)
- Undo/redo for annotations
- Setlist manager
- External pedal mapping (USB/Bluetooth)

## License

TBD

## Long-term Goal

A musician-friendly alternative to forScore / MobileSheets on Linux, macOS, and Windows.
