import { useDrag } from "@use-gesture/react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePageOrientation } from "../hooks/usePageOrientation"
import { usePdfDocument } from "../hooks/usePdfDocument"
import type { RepeatButton, ScoreRef } from "../types/library"
import { PdfPage } from "./PdfPage"

type PdfViewerProps = {
  scoreRef?: ScoreRef
  onStartsOnLeftChange?: (value: boolean | null) => void
  addRepeatMode?: boolean
  onAddRepeat?: (page: number, x: number, y: number) => void
  onVisiblePagesChange?: (pages: number[]) => void
  repeatButtons?: RepeatButton[]
  showTouchButtons?: boolean
  editButtonsMode?: boolean
  selectedButtonId?: string | null
  onSelectButton?: (id: string | null) => void
  repeatSizeOverride?: number | null
  onRepeatClick?: (rb: RepeatButton) => void
  onRepeatDetails?: (rb: RepeatButton) => void
  onRepeatMove?: (id: string, offsetX: number, offsetY: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

export type PdfViewerHandle = {
  goNext: () => void
  goPrev: () => void
  goToPage: (pageNum: number) => void
  startsOnLeft: boolean | null
  setStartsOnLeft: (value: boolean) => Promise<void>
}

export const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(
  (
    {
      scoreRef,
      onStartsOnLeftChange,
      addRepeatMode = false,
      onAddRepeat,
      onVisiblePagesChange,
      repeatButtons,
      showTouchButtons = true,
      editButtonsMode = false,
      selectedButtonId,
      onSelectButton,
      repeatSizeOverride,
      onRepeatClick,
      onRepeatDetails,
      onRepeatMove,
      onDragStart,
      onDragEnd,
    },
    ref
  ) => {
    const {
      loading,
      error,
      totalPages,
      startsOnLeft,
      setStartsOnLeft,
      getPageImageUrl,
    } = usePdfDocument(scoreRef)

    useEffect(() => {
      onStartsOnLeftChange?.(startsOnLeft)
    }, [startsOnLeft, onStartsOnLeftChange])

    const [currentScreenNum, setCurrentScreenNum] = useState(0)
    const currentScreenNumRef = useRef(0)
    currentScreenNumRef.current = currentScreenNum
    const trackRef = useRef<HTMLDivElement>(null)

    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on score change
    useEffect(() => {
      setCurrentScreenNum(0)
    }, [scoreRef?.scoreId])
    const [settledScreenNum, setSettledScreenNum] = useState(0)

    const dualPages = usePageOrientation() === "landscape"
    const pagesPerScreen = dualPages ? 2 : 1

    const firstPageAlone = dualPages && startsOnLeft === false

    const pageNumOffset = dualPages && startsOnLeft === false ? 1 : 0
    const toDisplayPage = (internal: number) => internal + 1 + pageNumOffset

    const screenCount = dualPages
      ? (firstPageAlone ? 1 : 0) +
        Math.ceil((totalPages - (firstPageAlone ? 1 : 0)) / 2)
      : totalPages

    useEffect(() => {
      const timeout = setTimeout(() => {
        setSettledScreenNum(currentScreenNum)
      }, 250)
      return () => clearTimeout(timeout)
    }, [currentScreenNum])

    const screens: (number | null)[][] = []
    if (dualPages) {
      if (firstPageAlone) {
        screens.push([null, 0])
        for (let pageNum = 1; pageNum < totalPages; pageNum += 2) {
          const pair: (number | null)[] = [pageNum]
          pair.push(pageNum + 1 < totalPages ? pageNum + 1 : null)
          screens.push(pair)
        }
      } else {
        for (let pageNum = 0; pageNum < totalPages; pageNum += 2) {
          const pair: (number | null)[] = [pageNum]
          pair.push(pageNum + 1 < totalPages ? pageNum + 1 : null)
          screens.push(pair)
        }
      }
    } else {
      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        screens.push([pageNum])
      }
    }

    const goNext = useCallback(
      () => setCurrentScreenNum((prev) => Math.min(prev + 1, screenCount - 1)),
      [screenCount]
    )
    const goPrev = useCallback(
      () => setCurrentScreenNum((prev) => Math.max(prev - 1, 0)),
      []
    )

    // biome-ignore lint/correctness/useExhaustiveDependencies: depends on screen layout, not full screens array
    const goToPage = useCallback(
      (pageNum: number) => {
        const idx = screens.findIndex((s) => s.includes(pageNum))
        if (idx < 0) return

        const track = trackRef.current
        const distance = Math.abs(idx - currentScreenNumRef.current)
        if (distance > 1 && track) {
          const direction = idx > currentScreenNumRef.current ? 1 : -1
          const preJump = idx - direction
          track.style.transition = "none"
          track.style.transform = `translateX(${-(preJump * 100)}%)`
          void track.offsetHeight
          track.style.transition = ""
        }

        setCurrentScreenNum(idx)
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [screens.length, firstPageAlone, dualPages]
    )

    const visiblePages =
      screens[currentScreenNum]?.filter((p): p is number => p !== null) ?? []
    const visiblePagesKey = visiblePages.join(",")
    // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by visiblePagesKey to avoid reference identity issues
    useEffect(() => {
      onVisiblePagesChange?.(visiblePages)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visiblePagesKey, onVisiblePagesChange])

    useImperativeHandle(
      ref,
      () => ({ goNext, goPrev, goToPage, startsOnLeft, setStartsOnLeft }),
      [goNext, goPrev, goToPage, startsOnLeft, setStartsOnLeft]
    )

    const bind = useDrag(
      (state) => {
        if (!state.last || editButtonsMode) return

        const [swipeX] = state.swipe
        if (swipeX === -1) {
          goNext()
        } else if (swipeX === 1) {
          goPrev()
        }
      },
      {
        swipe: {
          distance: 50,
          velocity: 0.3,
        },
        pointer: {
          touch: true,
        },
      }
    )

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        const tag = (event.target as HTMLElement)?.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
        if (event.key === "ArrowRight") {
          event.preventDefault()
          goNext()
        } else if (event.key === "ArrowLeft") {
          event.preventDefault()
          goPrev()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [goNext, goPrev])

    const handlePageClick = (pageNum: number, e: React.MouseEvent) => {
      if (!addRepeatMode || !onAddRepeat) return
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      onAddRepeat(pageNum, x, y)
    }

    // Repeat button drag state
    const [repeatDrag, setRepeatDrag] = useState<{
      id: string
      dx: number
      dy: number
    } | null>(null)
    const repeatDragRef = useRef<{
      id: string
      startX: number
      startY: number
      pageEl: HTMLElement
      offsetX: number
      offsetY: number
      dx: number
      dy: number
    } | null>(null)

    const startRepeatDrag = (
      clientX: number,
      clientY: number,
      rb: RepeatButton,
      el: HTMLElement
    ) => {
      const pageEl = el.closest(".page-wrap") as HTMLElement
      if (!pageEl) return
      repeatDragRef.current = {
        id: rb.id,
        startX: clientX,
        startY: clientY,
        pageEl,
        offsetX: rb.offset_x,
        offsetY: rb.offset_y,
        dx: 0,
        dy: 0,
      }
      onSelectButton?.(rb.id)
      onDragStart?.()

      const onMouseMove = (ev: MouseEvent) => {
        if (!repeatDragRef.current) return
        const dx = ev.clientX - repeatDragRef.current.startX
        const dy = ev.clientY - repeatDragRef.current.startY
        repeatDragRef.current.dx = dx
        repeatDragRef.current.dy = dy
        setRepeatDrag({ id: rb.id, dx, dy })
      }

      const onTouchMove = (ev: TouchEvent) => {
        if (!repeatDragRef.current || ev.touches.length !== 1) return
        const dx = ev.touches[0].clientX - repeatDragRef.current.startX
        const dy = ev.touches[0].clientY - repeatDragRef.current.startY
        repeatDragRef.current.dx = dx
        repeatDragRef.current.dy = dy
        setRepeatDrag({ id: rb.id, dx, dy })
      }

      const onEnd = () => {
        onDragEnd?.()
        const drag = repeatDragRef.current
        if (drag && (Math.abs(drag.dx) > 3 || Math.abs(drag.dy) > 3)) {
          const rect = drag.pageEl.getBoundingClientRect()
          const dxPct = (drag.dx / rect.width) * 100
          const dyPct = (drag.dy / rect.height) * 100
          const clamp = (v: number) => Math.max(0, Math.min(100, v))
          onRepeatMove?.(
            drag.id,
            clamp(drag.offsetX + dxPct),
            clamp(drag.offsetY + dyPct)
          )
        }
        repeatDragRef.current = null
        setRepeatDrag(null)
        window.removeEventListener("mousemove", onMouseMove)
        window.removeEventListener("mouseup", onEnd)
        window.removeEventListener("touchmove", onTouchMove)
        window.removeEventListener("touchend", onEnd)
      }

      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", onEnd)
      window.addEventListener("touchmove", onTouchMove)
      window.addEventListener("touchend", onEnd)
    }

    // biome-ignore lint/correctness/useExhaustiveDependencies: screens is a local computed value used inside
    const repeatTargetPages = useMemo(() => {
      const pages = new Set<number>()
      for (const rb of repeatButtons ?? []) {
        const screenIdx = screens.findIndex((s) => s.includes(rb.target_page))
        if (screenIdx >= 0) {
          for (const p of screens[screenIdx]) {
            if (p !== null) pages.add(p)
          }
        }
      }
      return pages
    }, [repeatButtons, screens])

    if (!scoreRef) {
      return <div>Import a PDF to get started</div>
    }

    if (loading) {
      return <div>Loading...</div>
    }

    if (error) {
      return <div>{error}</div>
    }

    const translateX = -(currentScreenNum * 100)

    return (
      <div {...bind()} className="document-wrap">
        <div
          ref={trackRef}
          className="document-track"
          style={{ transform: `translateX(${translateX}%)` }}
        >
          {screens.map((pages, idx) => {
            const key = `${scoreRef.scoreId}:screen-${idx}`
            const baseDisplayNum = idx * (dualPages ? 2 : 1) + 1

            return (
              <div key={key} className="screen-wrap">
                {pages.map((page, slotIdx) => {
                  const displayNum = baseDisplayNum + slotIdx
                  const isLeft = dualPages && slotIdx === 0
                  return page === null ? (
                    <div key="blank" className="page-blank">
                      <span
                        className={`page-number ${isLeft ? "page-number--left" : "page-number--right"}`}
                      >
                        {displayNum}
                      </span>
                    </div>
                  ) : (
                    // biome-ignore lint/a11y/noStaticElementInteractions: page click for repeat placement
                    // biome-ignore lint/a11y/useKeyWithClickEvents: page click for repeat placement
                    <div
                      key={page}
                      className={`page-wrap${addRepeatMode ? " repeat-button--add-mode" : ""}`}
                      onClick={(e) => handlePageClick(page, e)}
                    >
                      <span
                        className={`page-number ${isLeft ? "page-number--left" : "page-number--right"}`}
                      >
                        {displayNum}
                      </span>
                      {repeatButtons?.some((rb) => rb.target_page === page) && (
                        <svg
                          className={`bookmark-indicator ${isLeft ? "bookmark-indicator--left" : "bookmark-indicator--right"}`}
                          viewBox="0 0 14 36"
                          fill="#e6b800"
                          xmlns="http://www.w3.org/2000/svg"
                          role="img"
                          aria-label="Repeat target"
                        >
                          <path d="M1 0h12a1 1 0 0 1 1 1v34.2a.5.5 0 0 1-.8.4L7 31.5l-6.2 4.1a.5.5 0 0 1-.8-.4V1a1 1 0 0 1 1-1z" />
                        </svg>
                      )}
                      <PdfPage
                        getPageImageUrl={getPageImageUrl}
                        pageNum={page}
                        currentPageNum={settledScreenNum * pagesPerScreen}
                        preloadPages={repeatTargetPages}
                      />
                      {repeatButtons
                        ?.filter((rb) => rb.page === page)
                        .map((rb) => {
                          const isSelected = selectedButtonId === rb.id
                          const size =
                            isSelected && repeatSizeOverride != null
                              ? repeatSizeOverride
                              : rb.size
                          const alpha = editButtonsMode
                            ? isSelected
                              ? 0.5
                              : 0.35
                            : showTouchButtons
                              ? 0.15
                              : 0
                          const drag =
                            repeatDrag?.id === rb.id ? repeatDrag : null
                          let className = "repeat-button"
                          if (editButtonsMode)
                            className += " repeat-button--editing"
                          if (isSelected)
                            className += " repeat-button--selected"
                          return (
                            // biome-ignore lint/a11y/noStaticElementInteractions: custom interactive button component
                            // biome-ignore lint/a11y/useKeyWithClickEvents: custom interactive button component
                            <div
                              key={rb.id}
                              className={className}
                              style={{
                                left: `${rb.offset_x}%`,
                                top: `${rb.offset_y}%`,
                                width: size,
                                height: size,
                                background: `rgba(128, 0, 128, ${alpha})`,
                                transform: `translate(-50%, -50%)${drag ? ` translate(${drag.dx}px, ${drag.dy}px)` : ""}`,
                              }}
                              onMouseDown={(e) => {
                                if (!editButtonsMode) return
                                e.stopPropagation()
                                e.preventDefault()
                                startRepeatDrag(
                                  e.clientX,
                                  e.clientY,
                                  rb,
                                  e.currentTarget as HTMLElement
                                )
                              }}
                              onTouchStart={(e) => {
                                if (!editButtonsMode || e.touches.length !== 1)
                                  return
                                e.stopPropagation()
                                startRepeatDrag(
                                  e.touches[0].clientX,
                                  e.touches[0].clientY,
                                  rb,
                                  e.currentTarget as HTMLElement
                                )
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (editButtonsMode) {
                                  onSelectButton?.(rb.id)
                                  return
                                }
                                onRepeatClick?.(rb)
                              }}
                            >
                              <div className="repeat-icon">
                                <span className="repeat-icon-label">
                                  {rb.label}
                                </span>
                                <span className="repeat-icon-target">
                                  Page {toDisplayPage(rb.target_page)}
                                </span>
                              </div>
                              {editButtonsMode && (
                                <button
                                  type="button"
                                  className="touch-button-details"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onTouchStart={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onRepeatDetails?.(rb)
                                  }}
                                >
                                  <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    role="img"
                                    aria-label="More options"
                                  >
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="19" r="1" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
