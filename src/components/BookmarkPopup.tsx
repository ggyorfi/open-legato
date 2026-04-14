import { Pencil } from "lucide-react"
import type { Bookmark } from "../types/library"
import { Popup } from "./Popup"

type BookmarkPopupProps = {
  bookmarks: Bookmark[]
  currentPage: number | null
  toDisplayPage: (internal: number) => number
  onJump: (page: number) => void
  onEdit: (bm: Bookmark) => void
  onAdd: () => void
  onClose: () => void
}

export function BookmarkPopup({
  bookmarks,
  currentPage,
  toDisplayPage,
  onJump,
  onEdit,
  onAdd,
  onClose,
}: BookmarkPopupProps) {
  const sorted = [...bookmarks].sort((a, b) => a.page - b.page)

  return (
    <Popup
      title="Bookmarks"
      onClose={onClose}
      action={
        <button
          type="button"
          className="pill-button"
          onClick={onAdd}
          disabled={currentPage === null}
        >
          {currentPage !== null
            ? `Add for p.${toDisplayPage(currentPage)}`
            : "Add bookmark"}
        </button>
      }
    >
      {sorted.length === 0 && (
        <div className="list-popup-empty">No bookmarks yet.</div>
      )}
      {sorted.map((bm) => (
        <div key={bm.id} className="list-popup-item-row">
          <button
            type="button"
            className="list-popup-item"
            onClick={() => {
              onJump(bm.page)
              onClose()
            }}
          >
            <span className="list-popup-item-title">{bm.label}</span>
            <span className="list-popup-item-meta">
              p.{toDisplayPage(bm.page)}
            </span>
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => onEdit(bm)}
            aria-label={`Edit ${bm.label}`}
          >
            <Pencil size={20} />
          </button>
        </div>
      ))}
    </Popup>
  )
}
