import { invoke } from "@tauri-apps/api/core"
import { readFile } from "@tauri-apps/plugin-fs"
import type { PDFDocumentProxy } from "pdfjs-dist"
import * as pdfjsLib from "pdfjs-dist"
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { useCallback, useEffect, useState } from "react"
import {
  getFullscreenRenderSize,
  hasCachedPage,
  loadCachedPage,
  saveCachedPage,
} from "../util/pageImageCache"

type LegatoMetadata = {
  starts_on_left: boolean | null
}

export type PdfDocumentApi = {
  loading: boolean
  error: string | undefined
  totalPages: number
  startsOnLeft: boolean | null
  setStartsOnLeft: (value: boolean) => Promise<void>
  getPageImageUrl: (pageNumber: number) => Promise<string | undefined>
}

// In-memory cache for blob URLs (to avoid re-reading from disk)
const memoryCache = new Map<string, string>()

const renderPageToCanvas = async (
  pdfDoc: PDFDocumentProxy,
  pageNum: number
): Promise<HTMLCanvasElement> => {
  const page = await pdfDoc.getPage(pageNum + 1)

  // Render at fullscreen size for caching
  const { width: targetWidth, height: targetHeight } = getFullscreenRenderSize()

  // Calculate scale to fit page in target size
  const baseViewport = page.getViewport({ scale: 1 })
  const scaleX = targetWidth / baseViewport.width
  const scaleY = targetHeight / baseViewport.height
  const scale = Math.min(scaleX, scaleY)

  const viewport = page.getViewport({ scale })

  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Failed to get canvas context")

  canvas.width = viewport.width
  canvas.height = viewport.height

  await page.render({ canvasContext: context, viewport, canvas }).promise

  return canvas
}

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export const usePdfDocument = (pdfPath: string | undefined): PdfDocumentApi => {
  const [loading, setLoading] = useState(false)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy>()
  const [totalPages, setTotalPages] = useState(0)
  const [startsOnLeft, setStartsOnLeftState] = useState<boolean | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!pdfPath) return

    const loadPdf = async () => {
      try {
        // Reset state before loading new PDF to avoid stale data
        setPdfDoc(undefined)
        setTotalPages(0)
        setError(undefined)
        setStartsOnLeftState(null)
        setLoading(true)

        const data = await readFile(pdfPath)
        const loadingTask = pdfjsLib.getDocument({
          data,
          isOffscreenCanvasSupported: false,
          disableFontFace: false,
        })
        const pdf = await loadingTask.promise
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)

        // Get Open Legato metadata from PDF via Rust backend (uses exiftool)
        try {
          const metadata = await invoke<LegatoMetadata>(
            "get_pdf_legato_metadata",
            { path: pdfPath }
          )
          console.log("[PDF] Open Legato metadata:", metadata)
          setStartsOnLeftState(metadata.starts_on_left)
        } catch (e) {
          console.log("[PDF] Could not read Open Legato metadata:", e)
          setStartsOnLeftState(null)
        }
      } catch (err) {
        setError(`Failed to load PDF: ${err}`)
      } finally {
        setLoading(false)
      }
    }

    loadPdf()
  }, [pdfPath])

  // TODO: In the future, ask for user consent before modifying the PDF
  const setStartsOnLeft = useCallback(
    async (value: boolean) => {
      if (!pdfPath) return

      try {
        await invoke("set_pdf_legato_metadata", {
          path: pdfPath,
          metadata: { starts_on_left: value },
        })
        setStartsOnLeftState(value)
        console.log("[PDF] Saved starts_on_left to PDF:", value)
      } catch (e) {
        console.error("[PDF] Failed to save metadata:", e)
        throw e
      }
    },
    [pdfPath]
  )

  const getPageImageUrl = useCallback(
    async (pageNumber: number): Promise<string | undefined> => {
      if (!pdfDoc || !pdfPath) return undefined

      const cacheKey = `${pdfPath}:${pageNumber}`

      // Check memory cache first
      if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey)
      }

      // Check disk cache
      try {
        if (await hasCachedPage(pdfPath, pageNumber)) {
          const url = await loadCachedPage(pdfPath, pageNumber)
          if (url) {
            memoryCache.set(cacheKey, url)
            return url
          }
        }
      } catch (err) {
        console.warn("Cache read failed, will re-render:", err)
      }

      // Render and cache
      try {
        const canvas = await renderPageToCanvas(pdfDoc, pageNumber)
        const url = await saveCachedPage(pdfPath, pageNumber, canvas)
        memoryCache.set(cacheKey, url)
        return url
      } catch (err) {
        console.error("Failed to render page:", err)
        return undefined
      }
    },
    [pdfDoc, pdfPath]
  )

  return {
    loading,
    error,
    totalPages,
    startsOnLeft,
    setStartsOnLeft,
    getPageImageUrl,
  }
}
