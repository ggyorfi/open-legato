import { useEffect, useState } from "react"
import type { PdfDocumentApi } from "../hooks/usePdfDocument"

type PdfPageProps = {
  getPageImageUrl: PdfDocumentApi["getPageImageUrl"]
  pageNum: number
  currentPageNum: number
}

export const PdfPage = ({
  getPageImageUrl,
  pageNum,
  currentPageNum,
}: PdfPageProps) => {
  const [imageUrl, setImageUrl] = useState<string>()

  // Asymmetric: 4 pages back, 5 pages ahead for smoother navigation
  const shouldRender =
    pageNum >= currentPageNum - 4 && pageNum <= currentPageNum + 5

  useEffect(() => {
    if (!shouldRender) {
      setImageUrl(undefined)
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const url = await getPageImageUrl(pageNum)
        if (!cancelled && url) {
          setImageUrl(url)
        }
      } catch (error) {
        console.error("Failed to load page image:", error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pageNum, shouldRender, getPageImageUrl])

  return (
    <div className="page-wrap">
      {shouldRender && imageUrl ? (
        <img src={imageUrl} alt={`Page ${pageNum + 1}`} draggable={false} />
      ) : shouldRender ? (
        <div>Loading...</div>
      ) : null}
    </div>
  )
}
