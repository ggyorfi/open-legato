interface BottomToolbarProps {
  currentPage: number
  totalPages: number
  canGoPrev: boolean
  canGoNext: boolean
  onPrevPage: () => void
  onNextPage: () => void
}

export function BottomToolbar({
  currentPage,
  totalPages,
  canGoPrev,
  canGoNext,
  onPrevPage,
  onNextPage,
}: BottomToolbarProps) {
  return (
    <div
      style={{
        padding: "1rem",
        background: "#2a2a2a",
        borderTop: "1px solid #444",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
      }}
    >
      <button
        onClick={onPrevPage}
        disabled={!canGoPrev}
        style={{
          padding: "0.5rem 1rem",
          background: !canGoPrev ? "#555" : "#0066cc",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: !canGoPrev ? "not-allowed" : "pointer",
          fontSize: "14px",
        }}
      >
        ← Previous
      </button>
      <span
        style={{
          color: "#ccc",
          fontSize: "14px",
          minWidth: "100px",
          textAlign: "center",
        }}
      >
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={onNextPage}
        disabled={!canGoNext}
        style={{
          padding: "0.5rem 1rem",
          background: !canGoNext ? "#555" : "#0066cc",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: !canGoNext ? "not-allowed" : "pointer",
          fontSize: "14px",
        }}
      >
        Next →
      </button>
    </div>
  )
}
