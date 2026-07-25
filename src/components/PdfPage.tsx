import { useEffect, useState } from "react"
import type { PdfDocumentApi } from "../hooks/usePdfDocument"

type PdfPageProps = {
  getPageImageUrl: PdfDocumentApi["getPageImageUrl"]
  pageNum: number
  shouldRender: boolean
}

export const PdfPage = ({
  getPageImageUrl,
  pageNum,
  shouldRender,
}: PdfPageProps) => {
  const [src, setSrc] = useState<string>()

  useEffect(() => {
    setSrc(undefined)

    if (!shouldRender) {
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const url = await getPageImageUrl(pageNum)
        if (cancelled || !url) return
        const img = new Image()
        img.src = url
        await img.decode()
        if (!cancelled) setSrc(url)
      } catch {
        // Page load failed
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pageNum, shouldRender, getPageImageUrl])

  return shouldRender && src ? (
    <img src={src} alt={`Page ${pageNum + 1}`} draggable={false} />
  ) : null
}
