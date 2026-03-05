import type { LibraryEntry } from "../types/library"

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
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
    // biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop
    <div className="library-backdrop" onClick={onClose}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation on panel container */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation on panel container */}
      <div className="library-panel" onClick={(e) => e.stopPropagation()}>
        <div className="library-header">
          <h2>Library</h2>
          <button type="button" className="pill-button" onClick={onImportPdf}>
            Import PDF
          </button>
        </div>
        <div className="library-list">
          {entries.length === 0 && (
            <div className="library-empty">
              No scores yet. Import a PDF to get started.
            </div>
          )}
          {entries.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className="library-item"
              onClick={() => onOpenScore(entry)}
            >
              <span className="library-item-title">{entry.title}</span>
              <span className="library-item-date">
                {formatDate(entry.last_opened_at)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
