export type ButtonAnchor =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "bottom-center"

export type ButtonAction = "nextPage" | "prevPage" | "toggleToolbar"

export type TouchButtonConfig = {
  id: string
  anchor: ButtonAnchor
  offsetX: number // percentage (0-100)
  offsetY: number // percentage (0-100)
  relativeTo: "viewport" | "page"
  size: number // pixels
  color: string
  opacity: number
  action: ButtonAction
}

export const defaultTouchButtons: TouchButtonConfig[] = [
  {
    id: "toolbar-toggle",
    anchor: "top-center",
    offsetX: 0,
    offsetY: 2,
    relativeTo: "viewport",
    size: 200,
    color: "red",
    opacity: 0.15,
    action: "toggleToolbar",
  },
  {
    id: "prev-page",
    anchor: "bottom-left",
    offsetX: 2,
    offsetY: 2,
    relativeTo: "viewport",
    size: 300,
    color: "cyan",
    opacity: 0.15,
    action: "prevPage",
  },
  {
    id: "next-page",
    anchor: "bottom-right",
    offsetX: 2,
    offsetY: 2,
    relativeTo: "viewport",
    size: 300,
    color: "cyan",
    opacity: 0.15,
    action: "nextPage",
  },
]
