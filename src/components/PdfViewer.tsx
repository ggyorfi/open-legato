import { usePdfDocument } from "../hooks/usePdfDocument"
import { useEffect, useState, useRef, useCallback } from "react"
import { PdfPage } from "./PdfPage"
import { usePageOrientation } from "../hooks/usePageOrientation"
import { useDrag } from "@use-gesture/react"

type PdfViewerProps = {
  pdfPath?: string
  scale?: number
}

export const PdfViewer = ({ pdfPath, scale = 1.5 }: PdfViewerProps) => {
  const { loading, error, totalPages, getPage } = usePdfDocument(pdfPath, scale)
  const [currentScreenNum, setCurrentPageNum] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const dualPages = usePageOrientation() === "landscape"
  const pagesPerScreen = dualPages ? 2 : 1
  const screenCount = Math.ceil(totalPages / pagesPerScreen)

  const screens = Array.from({ length: screenCount }, (_, i) => {
    const pages = []
    for (let j = 0; j < pagesPerScreen; j++) {
      const pageNum = i * pagesPerScreen + j
      if (pageNum < totalPages) {
        pages.push(pageNum)
      }
    }
    return pages
  })

  const bind = useDrag(
    (state) => {
      console.log("Drag event:", {
        first: state.first,
        last: state.last,
        active: state.active,
        movement: state.movement,
        velocity: state.velocity,
        xy: state.xy,
      })

      // Only process swipe when gesture ends
      if (!state.last) return

      console.log("Drag ended - checking swipe:", {
        swipe: state.swipe,
        movement: state.movement,
        velocity: state.velocity,
      })

      const [swipeX] = state.swipe
      if (swipeX === -1) {
        // Swiped left → next screen
        console.log("Swipe left detected")
        setCurrentPageNum((prev) => Math.min(prev + 1, screenCount - 1))
      } else if (swipeX === 1) {
        // Swiped right → previous screen
        console.log("Swipe right detected")
        setCurrentPageNum((prev) => Math.max(prev - 1, 0))
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

  const updateScrollPos = useCallback(() => {
    const container = containerRef.current
    if (container) {
      const scrollAmount = currentScreenNum * container.clientWidth
      container.scrollTo({ left: scrollAmount, behavior: "smooth" })
    }
  }, [currentScreenNum])

  useEffect(() => {
    updateScrollPos()
  }, [updateScrollPos])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      if (event.key === "ArrowRight") {
        setCurrentPageNum((prev) => Math.min(prev + 1, screenCount - 1))
      } else if (event.key === "ArrowLeft") {
        setCurrentPageNum((prev) => Math.max(prev - 1, 0))
      }
    }

    const handleResize = () => {
      updateScrollPos()
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", handleResize)
    }
  }, [screenCount, updateScrollPos])

  if (!pdfPath) {
    return <div>Click "Open PDF" to get started</div>
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>{error}</div>
  }

  return (
    <div ref={containerRef} {...bind()} className="document-wrap">
      {screens.map((pages, idx) => {
        const key = `${pdfPath}:${idx}`

        return (
          <div key={key} className="screen-wrap">
            {pages.map((page) => (
              <PdfPage
                key={page}
                getPage={getPage}
                pageNum={page}
                currentPageNum={currentScreenNum * pagesPerScreen}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
