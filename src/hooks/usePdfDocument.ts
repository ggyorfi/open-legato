import { useState, useEffect, useCallback } from "react"
import { readFile } from "@tauri-apps/plugin-fs"
import * as pdfjsLib from "pdfjs-dist"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { getPage, setPage } from "../util/pageCache"
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"

export type PdfDocumentApi = {
  loading: boolean
  error: string | undefined
  totalPages: number
  getPage: (pageNumber: number) => Promise<HTMLCanvasElement | undefined>
}

const renderPage = async (
  pdfDoc: PDFDocumentProxy,
  pageNum: number,
  scale: number
): Promise<HTMLCanvasElement> => {
  if (!pdfDoc) throw new Error("No PDF loaded")

  const key = `${pdfDoc}:${pageNum}:${scale}`

  let canvas = getPage(key)

  if (canvas == null) {
    const page = await pdfDoc.getPage(pageNum + 1)
    const viewport = page.getViewport({ scale })

    canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Failed to get canvas context")

    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({ canvasContext: context, viewport, canvas }).promise
  }

  setPage(key, canvas)

  return canvas
}

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export const usePdfDocument = (
  pdfPath: string | undefined,
  scale: number
): PdfDocumentApi => {
  const [loading, setLoading] = useState(false)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy>()
  const [totalPages, setTotalPages] = useState(0)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!pdfPath) return

    const loadPdf = async () => {
      try {
        setLoading(true)
        const data = await readFile(pdfPath)
        const loadingTask = pdfjsLib.getDocument({ data })
        const pdf = await loadingTask.promise
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
      } catch (err) {
        setError(`Failed to load PDF: ${err}`)
      } finally {
        setLoading(false)
      }
    }

    loadPdf()
  }, [pdfPath])

  const getPage = useCallback(
    async (pageNumber: number) => {
      if (pdfDoc == null) return

      return renderPage(pdfDoc, pageNumber, scale)
    },
    [pdfDoc, scale]
  )

  return { loading, error, totalPages, getPage }
}
