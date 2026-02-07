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
* Manages page cache using asymmetric sliding window (±4 back, ±5 ahead, disk WebP + memory)
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
5. Page cache stores rendered pages (asymmetric sliding window with disk + memory layers)
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

* Open PDF file via file dialog or CLI argument
* Render pages using PDF.js with disk-based WebP caching
* Horizontal snap-to-page layout (CSS GPU-accelerated transforms)
* Page cache with asymmetric sliding window (±4 back, ±5 ahead = 9 pages, disk + memory layers)
* Floating top toolbar (notch-style, auto-hides in fullscreen)
* Tap/swipe gestures for page navigation (@use-gesture/react)
* Fullscreen performance mode (F5 key, 4-finger touch toggle)
* Dual-page spread mode (auto-activates in landscape)
* PDF metadata persistence via XMP (stores `starts_on_left`)
* Settings system with JSON persistence (~/.config/open-legato/settings.json)
* Configurable touch buttons (toolbar toggle, prev/next page)
* Edit buttons mode — drag to reposition, pinch/scroll-wheel to resize, persisted to settings
* Reset button customizations from Settings popup
* Quit button in toolbar + Ctrl+Q shortcut (with confirmation dialog)
* Pinch-to-zoom prevention (global touch event interception)
* Unified button component styles (pill-button primary/secondary/destructive, icon-button)
* Stylus/pen detection infrastructure (Linux evdev in Rust)
* Pointer debug overlay (Shift+D) for input device testing

### Next Steps for MVP (v0.1)

* Canvas pen tool for annotations (stylus infra done, drawing/rendering not yet connected)
* Annotation persistence to sidecar storage (XMP infra exists, need to extend schema)
* Cache invalidation refinement

### Post-MVP

* Advanced annotation tools (highlight, text, shapes)
* Undo/redo stack for annotations
* Setlist manager
* External pedal mapping (USB/Bluetooth)
* Metadata extraction (composer, title from PDF)
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

1. **Annotation storage format**: Per-page JSON files or single score JSON?
2. **Annotation rendering**: Canvas2D or WebGL (Pixi/Konva)?
3. **Dynamic scale**: Currently renders at fullscreen size — add dynamic scaling based on window size?

---

## 9. Development Notes

**Architecture Decision:**
After testing both approaches, we chose **PDF.js (frontend rendering)** over **pdfium-render (Rust rendering)** because PDF.js was significantly faster for our use case.

**Current Implementation:**
- ✅ PDF.js integrated with worker configuration
- ✅ Snap-to-page horizontal layout with GPU-accelerated transforms
- ✅ Asymmetric page cache (9 pages, disk WebP + memory layer)
- ✅ Touch/swipe gestures, fullscreen mode, dual-page spreads
- ✅ Settings persistence, customizable touch buttons with edit mode
- ✅ Quit with confirmation dialog + Ctrl+Q shortcut

**Next Development Focus:**
1. Canvas pen tool for annotations
2. Annotation persistence (sidecar JSON)
3. Cache invalidation refinement
