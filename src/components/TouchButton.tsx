import type { TouchButtonConfig } from "../config/touchButtons"

type TouchButtonProps = {
  config: TouchButtonConfig
  onClick: () => void
  visible?: boolean
}

function getPositionStyles(config: TouchButtonConfig): React.CSSProperties {
  const { anchor, offsetX, offsetY } = config

  const style: React.CSSProperties = {
    position: "fixed",
  }

  // Handle horizontal positioning
  if (anchor.includes("left")) {
    style.left = `${offsetX}%`
  } else if (anchor.includes("right")) {
    style.right = `${offsetX}%`
  } else if (anchor.includes("center")) {
    style.left = "50%"
    style.transform = "translateX(-50%)"
  }

  // Handle vertical positioning
  if (anchor.includes("top")) {
    style.top = `${offsetY}%`
  } else if (anchor.includes("bottom")) {
    style.bottom = `${offsetY}%`
  }

  return style
}

export const TouchButton = ({
  config,
  onClick,
  visible = true,
}: TouchButtonProps) => {
  const positionStyles = getPositionStyles(config)

  return (
    <button
      type="button"
      className="touch-button"
      onClick={onClick}
      style={{
        ...positionStyles,
        width: config.size,
        height: config.size,
        backgroundColor: config.color,
        opacity: visible ? config.opacity : 0,
      }}
      aria-label={config.id}
    />
  )
}
