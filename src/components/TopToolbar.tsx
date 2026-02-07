import { getVersion } from "@tauri-apps/api/app"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { open } from "@tauri-apps/plugin-dialog"
import { Settings } from "lucide-react"
import { useEffect, useState } from "react"

interface TopToolbarProps {
  pdfPath?: string
  onOpenPdf: (path: string) => void
  onOpenSettings: () => void
  isVisible?: boolean
}

export function TopToolbar({
  pdfPath,
  onOpenPdf,
  onOpenSettings,
  isVisible = true,
}: TopToolbarProps) {
  const [version, setVersion] = useState<string>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    getVersion().then(setVersion)
  }, [])

  const handleOpenPdf = async () => {
    if (isDialogOpen) return

    setIsDialogOpen(true)
    const appWindow = getCurrentWindow()
    let wasFullscreen = false

    try {
      wasFullscreen = await appWindow.isFullscreen()

      // Temporarily exit fullscreen so dialog appears on top
      if (wasFullscreen) {
        await appWindow.setFullscreen(false)
      }

      const selected = await open({
        multiple: false,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      })

      if (selected && typeof selected === "string") {
        onOpenPdf(selected)
      }
    } catch (err) {
      console.error("Failed to open file:", err)
    } finally {
      // Restore fullscreen if it was active
      if (wasFullscreen) {
        await appWindow.setFullscreen(true)
      }
      setIsDialogOpen(false)
    }
  }

  const containerClass = `floating-toolbar-container${isVisible ? "" : " floating-toolbar-container--hidden"}`

  return (
    <div className={containerClass}>
      <div className="floating-toolbar">
        <svg
          className="floating-toolbar-bg"
          viewBox="0 0 200 56"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,0 L10,44 Q12,56 24,56 L176,56 Q188,56 190,44 L200,0 Z"
            fill="#2a2a2a"
          />
        </svg>
        <button
          type="button"
          onClick={handleOpenPdf}
          className="toolbar-button"
        >
          Open PDF
        </button>
        {pdfPath && (
          <span className="toolbar-filename">{pdfPath.split("/").pop()}</span>
        )}
        {version && <span className="toolbar-version">v{version}</span>}
        <button
          type="button"
          onClick={onOpenSettings}
          className="settings-button"
          aria-label="Settings"
        >
          <Settings size={32} />
        </button>
      </div>
    </div>
  )
}
