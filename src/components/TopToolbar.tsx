import { getVersion } from "@tauri-apps/api/app"
import { BookOpen, LogOut, Move, Repeat, Settings } from "lucide-react"
import { useEffect, useState } from "react"

interface TopToolbarProps {
  scoreTitle?: string
  onOpenLibrary: () => void
  onOpenSettings: () => void
  onToggleEditButtons: () => void
  onToggleAddRepeat: () => void
  onQuit: () => void
  editButtonsMode: boolean
  addRepeatMode: boolean
  isVisible?: boolean
}

export function TopToolbar({
  scoreTitle,
  onOpenLibrary,
  onOpenSettings,
  onToggleEditButtons,
  onToggleAddRepeat,
  onQuit,
  editButtonsMode,
  addRepeatMode,
  isVisible = true,
}: TopToolbarProps) {
  const [version, setVersion] = useState<string>()

  useEffect(() => {
    getVersion().then(setVersion)
  }, [])

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
          onClick={onOpenLibrary}
          className="icon-button"
          aria-label="Library"
        >
          <BookOpen size={32} />
        </button>
        {scoreTitle && <span className="toolbar-filename">{scoreTitle}</span>}
        {version && <span className="toolbar-version">v{version}</span>}
        <button
          type="button"
          onClick={onToggleAddRepeat}
          className={`icon-button${addRepeatMode ? " icon-button--active" : ""}`}
          aria-label="Add repeat"
        >
          <Repeat size={32} />
        </button>
        <button
          type="button"
          onClick={onToggleEditButtons}
          className={`icon-button${editButtonsMode ? " icon-button--active" : ""}`}
          aria-label="Edit buttons"
        >
          <Move size={32} />
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="icon-button"
          aria-label="Settings"
        >
          <Settings size={32} />
        </button>
        <button
          type="button"
          onClick={onQuit}
          className="icon-button"
          aria-label="Quit"
        >
          <LogOut size={32} />
        </button>
      </div>
    </div>
  )
}
