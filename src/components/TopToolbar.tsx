import { open } from "@tauri-apps/plugin-dialog"

interface TopToolbarProps {
  pdfPath?: string
  onOpenPdf: (path: string) => void
}

export function TopToolbar({ pdfPath, onOpenPdf }: TopToolbarProps) {
  const handleOpenPdf = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      })

      if (selected && typeof selected === "string") {
        onOpenPdf(selected)
      }
    } catch (err) {
      console.error("Failed to open file:", err)
    }
  }

  return (
    <div
      style={{
        padding: "1rem",
        background: "#2a2a2a",
        borderBottom: "1px solid #444",
      }}
    >
      <button
        onClick={handleOpenPdf}
        style={{
          padding: "0.5rem 1rem",
          background: "#0066cc",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        Open PDF
      </button>
      {pdfPath && (
        <span style={{ marginLeft: "1rem", color: "#ccc", fontSize: "14px" }}>
          {pdfPath.split("/").pop()}
        </span>
      )}
    </div>
  )
}
