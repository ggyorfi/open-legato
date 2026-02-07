import { useEffect, useState } from "react"

export type PageOrientation = "landscape" | "portrait"

export const usePageOrientation = (): PageOrientation => {
  const [isLandscape, setIsLandscape] = useState(
    window.innerWidth > window.innerHeight
  )

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight)
    }

    window.addEventListener("resize", handleResize)
    screen.orientation?.addEventListener("change", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      screen.orientation?.removeEventListener("change", handleResize)
    }
  }, [])

  return isLandscape ? "landscape" : "portrait"
}
