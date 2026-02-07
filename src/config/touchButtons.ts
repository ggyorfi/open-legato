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

import type { TouchButtonOverride } from "./settings"

export function resolveButtons(
  defaults: TouchButtonConfig[],
  overrides?: Record<string, TouchButtonOverride>,
): TouchButtonConfig[] {
  if (!overrides) return defaults
  return defaults.map((btn) => {
    const o = overrides[btn.id]
    if (!o) return btn
    return {
      ...btn,
      ...(o.offsetX !== undefined && { offsetX: o.offsetX }),
      ...(o.offsetY !== undefined && { offsetY: o.offsetY }),
      ...(o.size !== undefined && { size: o.size }),
    }
  })
}

export const defaultTouchButtons: TouchButtonConfig[] = [
  {
    id: "toolbar-toggle",
    anchor: "top-center",
    offsetX: 0,
    offsetY: 2,
    relativeTo: "viewport",
    size: 400,
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
    size: 600,
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
    size: 600,
    color: "cyan",
    opacity: 0.15,
    action: "nextPage",
  },
]
