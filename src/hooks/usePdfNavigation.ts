import { useEffect } from "react"

interface UsePdfNavigationProps {
  currentPage: number
  totalPages: number
  onNextPage: () => void
  onPrevPage: () => void
}

export function usePdfNavigation({
  currentPage,
  totalPages,
  onNextPage,
  onPrevPage,
}: UsePdfNavigationProps) {
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onNextPage()
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      onPrevPage()
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault()
        goToNextPage()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        goToPrevPage()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentPage, totalPages])

  return {
    goToNextPage,
    goToPrevPage,
    canGoNext: currentPage < totalPages,
    canGoPrev: currentPage > 1,
  }
}
