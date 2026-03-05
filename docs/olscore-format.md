# .olscore File Format Specification

**Version:** 0.1 (draft)

## Overview

`.olscore` is Open Legato's native document format. It is a **ZIP archive** (`.zip` renamed to `.olscore`) containing one or more PDF files, a manifest, annotations, and optional metadata.

The app manages a library of `.olscore` files in its data directory. Users **import** PDFs, which are wrapped into `.olscore` automatically. All modifications (annotations, display settings, notes) are stored inside the `.olscore` — original PDFs are never modified.

## Directory Layout Inside the Archive

```
score.olscore (ZIP)
├── manifest.json          # Required — format version, PDF list, display settings
├── notes.json             # Optional — annotations, bookmarks, text notes
├── pdfs/
│   ├── score.pdf          # One or more PDF files
│   ├── part-violin.pdf    # e.g. separate movement or part
│   └── ...
└── thumbnails/            # Optional — pre-rendered page thumbnails
    ├── 0.webp
    ├── 1.webp
    └── ...
```

## manifest.json

```jsonc
{
  "format_version": "0.1",
  "created_at": "2026-02-23T12:00:00Z",
  "modified_at": "2026-02-23T12:00:00Z",

  // Score metadata
  "title": "Chopin - Ballade No. 1",
  "composer": "Frédéric Chopin",
  "tags": ["romantic", "piano", "competition"],

  // PDF files in this score (order matters)
  "pdfs": [
    {
      "filename": "pdfs/score.pdf",       // Path within the archive
      "title": "Full Score",              // Human-readable title
      "page_count": 12,
      "sha256": "abc123..."              // Integrity check
    }
  ],

  // Display settings
  "display": {
    "starts_on_left": false,              // First page is a right page (default)
    "default_spread": "auto"              // "auto" | "single" | "dual"
  }
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `format_version` | string | Semver-compatible format version |
| `pdfs` | array | At least one PDF entry with `filename` and `page_count` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Score title |
| `composer` | string | Composer name |
| `tags` | string[] | User-defined tags for library browsing |
| `display` | object | Display preferences |
| `created_at` | string | ISO 8601 timestamp |
| `modified_at` | string | ISO 8601 timestamp |

## notes.json

Stores all annotations and user notes. Keyed by PDF filename and page number.

```jsonc
{
  "format_version": "0.1",
  "pages": {
    "pdfs/score.pdf": {
      "0": {
        "strokes": [
          {
            "points": [[100, 200, 0.8], [102, 205, 0.9]],  // [x, y, pressure]
            "color": "#ff0000",
            "width": 2,
            "tool": "pen"                                     // "pen" | "highlighter"
          }
        ],
        "text_notes": [
          {
            "x": 150,
            "y": 300,
            "content": "Watch tempo here",
            "color": "#ffff00"
          }
        ],
        "bookmarks": ["Recapitulation"]
      }
    }
  }
}
```

### Annotation Types (Planned)

| Type | Description |
|------|-------------|
| `strokes` | Freehand pen/highlighter strokes with pressure data |
| `text_notes` | Positioned text annotations |
| `bookmarks` | Named markers for quick navigation |
| `shapes` | Rectangles, circles, arrows (post-MVP) |

## Design Principles

1. **Non-destructive**: PDFs inside the archive are never modified
2. **Portable**: A single `.olscore` file contains everything needed to open a score
3. **Standard ZIP**: Any ZIP tool can inspect/extract the contents
4. **Auto-save**: The app saves changes to the `.olscore` automatically
5. **Forward-compatible**: Unknown JSON fields are preserved on read, `format_version` enables migrations

## Library Storage

The app stores all `.olscore` files in the platform's standard app data directory:

| Platform | Path |
|----------|------|
| Linux | `~/.local/share/open-legato/library/` |
| macOS | `~/Library/Application Support/open-legato/library/` |
| Windows | `%APPDATA%/open-legato/library/` |

A separate `library.json` index file lives alongside the library folder for fast browsing/search without opening every `.olscore` file.
