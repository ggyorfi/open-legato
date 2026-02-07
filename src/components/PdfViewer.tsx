import { useDrag } from "@use-gesture/react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react"
import { usePageOrientation } from "../hooks/usePageOrientation"
import { usePdfDocument } from "../hooks/usePdfDocument"
import { PdfPage } from "./PdfPage"

type PdfViewerProps = {
  pdfPath?: string
  onStartsOnLeftChange?: (value: boolean | null) => void
}

export type PdfViewerHandle = {
  goNext: () => void
  goPrev: () => void
  startsOnLeft: boolean | null
  setStartsOnLeft: (value: boolean) => Promise<void>
}

export const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(
  ({ pdfPath, onStartsOnLeftChange }, ref) => {
    const {
      loading,
      error,
      totalPages,
      startsOnLeft,
      setStartsOnLeft,
      getPageImageUrl,
    } = usePdfDocument(pdfPath)

    // Notify parent when startsOnLeft changes
    useEffect(() => {
      onStartsOnLeftChange?.(startsOnLeft)
    }, [startsOnLeft, onStartsOnLeftChange])

    const [currentScreenNum, setCurrentScreenNum] = useState(0)

    // Reset to first page when PDF changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on pdfPath change
    useEffect(() => {
      setCurrentScreenNum(0)
    }, [pdfPath])
    // Debounced version - only updates after animation settles, used for pre-rendering decisions
    const [settledScreenNum, setSettledScreenNum] = useState(0)

    const dualPages = usePageOrientation() === "landscape"
    const pagesPerScreen = dualPages ? 2 : 1

    // When startsOnLeft is false (default), first page is alone on the right
    // This affects screen count and page distribution in dual-page mode
    const firstPageAlone = dualPages && startsOnLeft === false

    // Calculate screen count accounting for first page being alone
    const screenCount = dualPages
      ? (firstPageAlone ? 1 : 0) +
        Math.ceil((totalPages - (firstPageAlone ? 1 : 0)) / 2)
      : totalPages

    // Debounce settledScreenNum to avoid pre-rendering during animation
    useEffect(() => {
      const timeout = setTimeout(() => {
        setSettledScreenNum(currentScreenNum)
      }, 250) // Match CSS transition duration
      return () => clearTimeout(timeout)
    }, [currentScreenNum])

    // Build screens array with proper page distribution
    const screens: (number | null)[][] = []
    if (dualPages) {
      if (firstPageAlone) {
        // First screen: blank on left, page 0 on right
        screens.push([null, 0])
        // Remaining screens: pairs starting from page 1
        for (let pageNum = 1; pageNum < totalPages; pageNum += 2) {
          const pair: (number | null)[] = [pageNum]
          if (pageNum + 1 < totalPages) {
            pair.push(pageNum + 1)
          }
          screens.push(pair)
        }
      } else {
        // startsOnLeft: true - pages paired from the start
        for (let pageNum = 0; pageNum < totalPages; pageNum += 2) {
          const pair: (number | null)[] = [pageNum]
          if (pageNum + 1 < totalPages) {
            pair.push(pageNum + 1)
          }
          screens.push(pair)
        }
      }
    } else {
      // Single page mode - one page per screen
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

    useImperativeHandle(
      ref,
      () => ({ goNext, goPrev, startsOnLeft, setStartsOnLeft }),
      [goNext, goPrev, startsOnLeft, setStartsOnLeft]
    )

    const bind = useDrag(
      (state) => {
        // Only process swipe when gesture ends
        if (!state.last) return

        const [swipeX] = state.swipe
        if (swipeX === -1) {
          // Swiped left → next screen
          goNext()
        } else if (swipeX === 1) {
          // Swiped right → previous screen
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

    if (!pdfPath) {
      return <div>Click "Open PDF" to get started</div>
    }

    if (loading) {
      return <div>Loading...</div>
    }

    if (error) {
      return <div>{error}</div>
    }

    // CSS transform for GPU-accelerated animation
    const translateX = -(currentScreenNum * 100)

    return (
      <div {...bind()} className="document-wrap">
        <div
          className="document-track"
          style={{ transform: `translateX(${translateX}%)` }}
        >
          {screens.map((pages, idx) => {
            const key = `${pdfPath}:screen-${idx}`

            return (
              <div key={key} className="screen-wrap">
                {pages.map((page) =>
                  page === null ? (
                    <div key="blank" className="page-blank" />
                  ) : (
                    <PdfPage
                      key={page}
                      getPageImageUrl={getPageImageUrl}
                      pageNum={page}
                      currentPageNum={settledScreenNum * pagesPerScreen}
                    />
                  )
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
