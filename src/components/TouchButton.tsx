import { useMemo, useRef, useState } from "react"
import type { TouchButtonConfig } from "../config/touchButtons"

const rgbCache = new Map<string, [number, number, number]>()

function colorToRgb(color: string): [number, number, number] {
  const cached = rgbCache.get(color)
  if (cached) return cached
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  const rgb: [number, number, number] = [r, g, b]
  rgbCache.set(color, rgb)
  return rgb
}

type TouchButtonProps = {
  config: TouchButtonConfig
  onClick: () => void
  visible?: boolean
  editMode?: boolean
  selected?: boolean
  onSelect?: () => void
  onMove?: (offsetX: number, offsetY: number) => void
  onResize?: (newSize: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

function getPositionStyles(config: TouchButtonConfig) {
  const { anchor, offsetX, offsetY } = config

  const style: React.CSSProperties = {
    position: "fixed",
  }

  // Translate to center the button on its position point
  let tx = "-50%"
  let ty = "-50%"

  if (anchor.includes("left")) {
    style.left = `${offsetX}%`
  } else if (anchor.includes("right")) {
    style.right = `${offsetX}%`
    tx = "50%"
  } else if (anchor.includes("center")) {
    style.left = "50%"
  }

  if (anchor.includes("top")) {
    style.top = `${offsetY}%`
  } else if (anchor.includes("bottom")) {
    style.bottom = `${offsetY}%`
    ty = "50%"
  }

  return { style, baseTransform: `translate(${tx}, ${ty})` }
}

export const TouchButton = ({
  config,
  onClick,
  visible = true,
  editMode = false,
  selected = false,
  onSelect,
  onMove,
  onDragStart,
  onDragEnd,
  sizeOverride,
}: TouchButtonProps & { sizeOverride?: number | null }) => {
  const { style: positionStyles, baseTransform } = getPositionStyles(config)
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 })
  const [r, g, b] = useMemo(() => colorToRgb(config.color), [config.color])
  const dragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  const dragDeltaRef = useRef({ x: 0, y: 0 })

  const startDrag = (x: number, y: number) => {
    dragging.current = true
    startPos.current = { x, y }
    onSelect?.()
    onDragStart?.()
  }

  const moveDrag = (x: number, y: number) => {
    if (!dragging.current) return
    const delta = { x: x - startPos.current.x, y: y - startPos.current.y }
    dragDeltaRef.current = delta
    setDragDelta(delta)
  }

  const endDrag = () => {
    if (!dragging.current) return
    dragging.current = false
    onDragEnd?.()

    const { x: dx, y: dy } = dragDeltaRef.current
    const vw = window.innerWidth
    const vh = window.innerHeight
    const dxPct = (dx / vw) * 100
    const dyPct = (dy / vh) * 100

    const signX = config.anchor.includes("right") ? -1 : 1
    const signY = config.anchor.includes("bottom") ? -1 : 1

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      onMove?.(config.offsetX + dxPct * signX, config.offsetY + dyPct * signY)
    }
    dragDeltaRef.current = { x: 0, y: 0 }
    setDragDelta({ x: 0, y: 0 })
  }

  const startMouseDrag = (e: React.MouseEvent) => {
    if (!editMode) return
    startDrag(e.clientX, e.clientY)
    e.preventDefault()

    const onMouseMove = (ev: MouseEvent) => moveDrag(ev.clientX, ev.clientY)
    const onMouseUp = () => {
      endDrag()
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }

  const alpha = editMode ? (selected ? 0.5 : 0.35) : !visible ? 0 : config.opacity
  const bgColor = `rgba(${r}, ${g}, ${b}, ${alpha})`

  let className = "touch-button"
  if (editMode) className += " touch-button--editing"
  if (selected) className += " touch-button--selected"

  return (
    <div
      className={className}
      onTouchStart={(e) => {
        if (!editMode || e.touches.length !== 1) return
        startDrag(e.touches[0].clientX, e.touches[0].clientY)
      }}
      onTouchMove={(e) => {
        if (!editMode || e.touches.length !== 1) return
        moveDrag(e.touches[0].clientX, e.touches[0].clientY)
      }}
      onTouchEnd={() => endDrag()}
      onMouseDown={startMouseDrag}
      onClick={(e) => {
        if (editMode) {
          e.preventDefault()
          onSelect?.()
          return
        }
        onClick()
      }}
      style={{
        ...positionStyles,
        width: sizeOverride ?? config.size,
        height: sizeOverride ?? config.size,
        backgroundColor: bgColor,
        touchAction: editMode ? "none" : undefined,
        transform: [
          baseTransform,
          dragDelta.x !== 0 || dragDelta.y !== 0
            ? `translate(${dragDelta.x}px, ${dragDelta.y}px)`
            : undefined,
        ]
          .filter(Boolean)
          .join(" "),
      }}
    />
  )
}
