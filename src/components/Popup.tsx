import type { ReactNode } from "react"

type PopupProps = {
  title: string
  action?: ReactNode
  onClose: () => void
  children: ReactNode
}

export function Popup({ title, action, onClose, children }: PopupProps) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
    // biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop
    <div
      className="list-popup-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation on panel container */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation on panel container */}
      <div className="list-popup-panel" onClick={(e) => e.stopPropagation()}>
        <div className="list-popup-header">
          <h2>{title}</h2>
          {action}
        </div>
        <div className="list-popup-list">{children}</div>
      </div>
    </div>
  )
}
