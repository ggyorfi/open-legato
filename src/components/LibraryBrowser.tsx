import type { LibraryEntry } from "../types/library"
import { Popup } from "./Popup"

type LibraryBrowserProps = {
  entries: LibraryEntry[]
  onOpenScore: (entry: LibraryEntry) => void
  onImportPdf: () => void
  onClose: () => void
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return iso
  }
}

export function LibraryBrowser({
  entries,
  onOpenScore,
  onImportPdf,
  onClose,
}: LibraryBrowserProps) {
  return (
    <Popup
      title="Library"
      onClose={onClose}
      action={
        <button type="button" className="pill-button" onClick={onImportPdf}>
          Import PDF
        </button>
      }
    >
      {entries.length === 0 && (
        <div className="list-popup-empty">
          No scores yet. Import a PDF to get started.
        </div>
      )}
      {entries.map((entry) => (
        <button
          type="button"
          key={entry.id}
          className="list-popup-item"
          onClick={() => onOpenScore(entry)}
        >
          <span className="list-popup-item-title">{entry.title}</span>
          <span className="list-popup-item-meta">
            {formatDate(entry.last_opened_at)}
          </span>
        </button>
      ))}
    </Popup>
  )
}
