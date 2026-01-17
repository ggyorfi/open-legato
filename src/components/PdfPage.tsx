import { type PdfDocumentApi } from "../hooks/usePdfDocument"
import { useEffect, useRef, useState } from "react"

type PdfPageProps = {
  getPage: PdfDocumentApi["getPage"]
  pageNum: number
  currentPageNum: number
}

export const PdfPage = ({ getPage, pageNum, currentPageNum }: PdfPageProps) => {
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const renderPage =
    pageNum >= currentPageNum - 2 && pageNum <= currentPageNum + 2

  useEffect(() => {
    ; (async () => {
      try {
        if (renderPage) {
          const page = await getPage(pageNum)
          if (page) {
            setSourceCanvas(page)
          }
        } else {
          setSourceCanvas(undefined)
        }
      } catch (error) {
        console.error(error)
      }
    })()
  }, [pageNum, renderPage, getPage])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && sourceCanvas) {
      canvas.width = sourceCanvas.width
      canvas.height = sourceCanvas.height
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(sourceCanvas, 0, 0)
      }
    }
  }, [sourceCanvas])

  if (!renderPage) {
    return <div className="page-wrap" />
  }

  return (
    <div className="page-wrap">
      {sourceCanvas ? <canvas ref={canvasRef} /> : <div>Loading...</div>}
    </div>
  )
}
