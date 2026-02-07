# Open Legato – Project Handover Document (for Claude Code)

## 1. Project Overview

Open Legato is an open-source, cross-platform sheet‑music reader focused on live performance reliability and high-quality annotation. It is intended for pianists and other classical musicians who require:

* Instant, discrete page flipping (touch or pedal)
* Horizontal, snap-to-page layout
* Reliable fullscreen performance mode
* High-quality PDF rendering via PDF.js
* Natural pen annotations (pressure-sensitive where hardware allows)
* Optional setlist management for concerts and practice sessions

The project architecture is based on **Tauri v2.5**, with:

* **Rust backend** (file system access, annotation storage)
* **React frontend** (UI, PDF rendering via PDF.js, annotation layers, gestures)
* **PDF.js (pdfjs-dist)** for PDF parsing and rendering

The long-term goal is to provide a musician‑friendly alternative to forScore/MobileSheets on Linux, macOS, and Windows.

---

## 2. Core Requirements & UX Philosophy

### Performance Requirements

* Zero-latency page flips (under 16ms perceived)
* Stable memory usage
* Pre-render next/previous pages
* Prevent accidental zoom/scroll during performance

### UI/UX Requirements

* Horizontal layout with page snapping
* Touch or tap zones for next/previous page
* External pedal support (USB/Bluetooth mapping to page turn APIs)
* Fullscreen mode with no distractions
* Simple, intuitive interface suited for musicians under pressure

### Annotation Requirements

* Pen-based annotations (freehand, highlight, text)
* Layered annotation model storing vector data
* Undo/redo stack
* Non-destructive (sidecar JSON file, not PDF modification)

---

## 3. High-Level Architecture

### Frontend (React + PDF.js)

* Renders PDF pages using PDF.js (pdfjs-dist) in the browser
* Manages page cache using sliding window approach (currently ±1 page)
* Manages UI state: current page, zoom (disabled in performance mode), tool modes
* Gesture/touch handler layer for page turning and annotation
* Canvas layer for annotations overlaid on rendered pages

### Backend (Rust + Tauri)

Responsibilities:

* Provide file system access via Tauri plugins
* File dialog for opening PDFs
* Manage file I/O for annotations (planned)
* Minimal backend — all PDF rendering handled by frontend PDF.js

### Data Flow

1. User selects PDF via Tauri file dialog
2. Frontend reads PDF file using Tauri FS plugin
3. PDF.js loads and parses the PDF document in the browser
4. Frontend renders pages to Canvas elements using PDF.js
5. Page cache stores rendered canvases (currently ±1 page from current)
6. Annotation layer overlays on top of rendered pages
7. On save: frontend sends annotation JSON → Rust writes to sidecar file (planned)

---

## 4. Tech Stack

* **Rust** (stable)
* **Tauri v2.5**
* **PDF.js (pdfjs-dist v5.4)** for PDF parsing and rendering
* **React 19 + TypeScript** for UI
* **pnpm** as package manager
* **Canvas or Konva.js** for annotation layer (planned)
* **Zustand or Jotai** for lightweight state management (planned)

---

## 5. Current Implementation Status

### Completed ✅

* Open PDF file via file dialog
* Render pages using PDF.js
* Basic horizontal page navigation
* Page cache with sliding window (±1 page)
* Top and bottom toolbars with navigation controls

### Next Steps for MVP (v0.1)

* Fix horizontal snap-to-page layout
* Expand page cache (±2 or ±3 pages)
* Tap/swipe gestures for next/previous
* Fullscreen performance mode
* Annotation drawing (basic pen)
* Save/restore annotations

### Post-MVP

* Two-page spread mode
* Advanced annotation tools (highlight, text, shapes)
* Setlist manager
* Pedal mapping engine
* Metadata extraction
* Dynamic scale based on window size

---

## 6. Important Constraints & Lessons

* **Frontend-based rendering**. PDF.js handles all PDF parsing and rendering in the browser (tested faster than Rust-based pdfium-render).
* **Memory management is critical**. Limit page cache size to prevent bloat (currently 3 pages, expandable to 10-20).
* **Dispose of unused canvases**. Pages outside the viewport must be removed from cache to avoid memory leaks.
* **Touch performance must be deterministic**, not physics-based — snap-to-page navigation only.

---

## 7. Directory Structure

```
open-legato/
  src/                     # React UI
    components/            # TopToolbar, PdfViewerJs
    hooks/                 # usePdfDocument, usePdfNavigation
    annotation/            # (planned)
  src-tauri/
    src/
      main.rs              # Entry point
      lib.rs               # Tauri plugins initialization
      annotations.rs       # (planned) Annotation persistence
    tauri.conf.json
    capabilities/
  assets/
  README.md
  CLAUDE.md
```

---

## 8. Open Questions for Implementation

1. **Page cache size**: Expand from current ±1 (3 pages) to ±2 or ±3 (5-7 pages)? Max cache size (10-20)?
2. **Cache eviction strategy**: Keep simple sliding window or implement LRU for larger cache?
3. **Annotation storage format**: Per-page JSON files or single score JSON?
4. **Scale policy**: Fixed scale (1.5x) or dynamic based on window size?
5. **Annotation rendering**: Canvas2D or WebGL (Pixi/Konva)?

---

## 9. Development Notes

**Architecture Decision:**
After testing both approaches, we chose **PDF.js (frontend rendering)** over **pdfium-render (Rust rendering)** because PDF.js was significantly faster for our use case.

**Current Implementation:**
- ✅ PDF.js integrated with worker configuration
- ✅ Basic page navigation and caching (±1 page sliding window)
- ✅ File system access via Tauri plugins
- ⚠️ Horizontal snap-to-page layout needs refinement
- ⚠️ Cache size should be expanded for smoother navigation

**Next Development Focus:**
1. Fix snap-to-page layout issues
2. Expand page cache (currently too small at 3 pages)
3. Implement gesture controls
4. Build annotation system
5. Add fullscreen performance mode

This document represents the complete vision and technical state of the Open Legato project.
