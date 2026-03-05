import { X } from "lucide-react"
import { useState } from "react"
import type { AppSettings } from "../config/settings"

type DocumentSettings = {
  startsOnLeft: boolean | null
  setStartsOnLeft: (value: boolean) => Promise<void>
  title: string
  onTitleChange: (title: string) => void
}

type SettingsPopupProps = {
  settings: AppSettings
  onSettingsChange: (settings: AppSettings) => void
  documentSettings?: DocumentSettings
  onClose: () => void
}

export function SettingsPopup({
  settings,
  onSettingsChange,
  documentSettings,
  onClose,
}: SettingsPopupProps) {
  const [titleDraft, setTitleDraft] = useState(documentSettings?.title ?? "")

  const commitTitle = () => {
    if (documentSettings && titleDraft !== documentSettings.title) {
      documentSettings.onTitleChange(titleDraft)
    }
  }

  const handleToggle = (key: keyof AppSettings) => {
    onSettingsChange({ ...settings, [key]: !settings[key] })
  }

  const handleStartsOnLeftChange = async (value: boolean) => {
    if (documentSettings) {
      try {
        await documentSettings.setStartsOnLeft(value)
      } catch (e) {
        console.error("Failed to save page layout:", e)
      }
    }
  }

  return (
    <div
      className="settings-backdrop"
      onClick={() => {
        commitTitle()
        onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          commitTitle()
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation on popup container */}
      <div
        className="settings-popup"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h2>Settings</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={32} />
          </button>
        </div>
        <div className="settings-content">
          {/* App settings */}
          <label className="settings-row">
            <span className="settings-label">Show touch buttons</span>
            <button
              className={`settings-toggle ${settings.showTouchButtons ? "settings-toggle--on" : ""}`}
              type="button"
              onClick={() => handleToggle("showTouchButtons")}
              role="switch"
              aria-checked={settings.showTouchButtons}
            >
              <span className="settings-toggle-knob" />
            </button>
          </label>

          <label className="settings-row">
            <span className="settings-label">Symmetric pager buttons</span>
            <button
              className={`settings-toggle ${settings.mirrorPagerButtons ? "settings-toggle--on" : ""}`}
              type="button"
              onClick={() =>
                onSettingsChange({
                  ...settings,
                  mirrorPagerButtons: !settings.mirrorPagerButtons,
                })
              }
              role="switch"
              aria-checked={!!settings.mirrorPagerButtons}
            >
              <span className="settings-toggle-knob" />
            </button>
          </label>

          <div className="settings-row-center">
            <button
              type="button"
              className="pill-button"
              disabled={!settings.buttonOverrides}
              onClick={() => {
                const { buttonOverrides: _, ...rest } = settings
                onSettingsChange(rest)
              }}
            >
              Reset button positions &amp; sizes
            </button>
          </div>

          {/* Document settings - only shown when a PDF is loaded */}
          {documentSettings && (
            <>
              <div className="settings-divider" />
              <div className="settings-section-title">Document</div>
              <label className="settings-row">
                <span className="settings-label">Title</span>
                <input
                  type="text"
                  className="settings-title-input"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
              </label>
              <label className="settings-row">
                <span className="settings-label">First page on left</span>
                <button
                  className={`settings-toggle ${documentSettings.startsOnLeft === true ? "settings-toggle--on" : ""}`}
                  type="button"
                  onClick={() =>
                    handleStartsOnLeftChange(!documentSettings.startsOnLeft)
                  }
                  role="switch"
                  aria-checked={documentSettings.startsOnLeft === true}
                >
                  <span className="settings-toggle-knob" />
                </button>
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
