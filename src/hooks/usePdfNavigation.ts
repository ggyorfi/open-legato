import { useCallback, useEffect } from "react"

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
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onNextPage()
    }
  }, [currentPage, totalPages, onNextPage])

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      onPrevPage()
    }
  }, [currentPage, onPrevPage])

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
  }, [goToNextPage, goToPrevPage])

  return {
    goToNextPage,
    goToPrevPage,
    canGoNext: currentPage < totalPages,
    canGoPrev: currentPage > 1,
  }
}
