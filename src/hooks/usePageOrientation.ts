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
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return isLandscape ? "landscape" : "portrait"
}
