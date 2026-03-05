import { invoke } from "@tauri-apps/api/core"
import { readFile } from "@tauri-apps/plugin-fs"
import type { PDFDocumentProxy } from "pdfjs-dist"
import * as pdfjsLib from "pdfjs-dist"
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { useCallback, useEffect, useState } from "react"
import type { ScoreRef } from "../types/library"
import {
  getFullscreenRenderSize,
  hasCachedPage,
  loadCachedPage,
  saveCachedPage,
} from "../util/pageImageCache"

export type PdfDocumentApi = {
  loading: boolean
  error: string | undefined
  totalPages: number
  startsOnLeft: boolean | null
  setStartsOnLeft: (value: boolean) => Promise<void>
  getPageImageUrl: (pageNumber: number) => Promise<string | undefined>
}

const memoryCache = new Map<string, string>()
const inFlight = new Map<string, Promise<string | undefined>>()

const canvasToJpegUrl = (canvas: HTMLCanvasElement): Promise<string> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b
          ? resolve(URL.createObjectURL(b))
          : reject(new Error("JPEG blob failed")),
      "image/jpeg",
      0.9
    )
  })

const renderPageToCanvas = async (
  pdfDoc: PDFDocumentProxy,
  pageNum: number
): Promise<HTMLCanvasElement> => {
  const page = await pdfDoc.getPage(pageNum + 1)

  const { width: targetWidth, height: targetHeight } = getFullscreenRenderSize()

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

export const usePdfDocument = (
  scoreRef: ScoreRef | undefined
): PdfDocumentApi => {
  const [loading, setLoading] = useState(false)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy>()
  const [pdfDocScoreId, setPdfDocScoreId] = useState<string>()
  const [totalPages, setTotalPages] = useState(0)
  const [startsOnLeft, setStartsOnLeftState] = useState<boolean | null>(null)
  const [error, setError] = useState<string>()

  const scoreId = scoreRef?.scoreId
  const manifest = scoreRef?.manifest

  useEffect(() => {
    if (!scoreId || !manifest) return

    let cancelled = false

    const loadPdf = async () => {
      try {
        setPdfDoc(undefined)
        setPdfDocScoreId(undefined)
        memoryCache.clear()
        setTotalPages(0)
        setError(undefined)
        setStartsOnLeftState(manifest.display.starts_on_left)
        setLoading(true)

        const pdfFilename = manifest.pdfs[0].filename
        const extractedPath = await invoke<string>("get_extracted_pdf_path", {
          scoreId,
          pdfFilename,
        })

        const pdfBytes = await readFile(extractedPath)
        if (cancelled) return

        const loadingTask = pdfjsLib.getDocument({
          data: pdfBytes,
          isOffscreenCanvasSupported: false,
          disableFontFace: false,
        })
        const pdf = await loadingTask.promise
        if (cancelled) return

        setPdfDoc(pdf)
        setPdfDocScoreId(scoreId)
        setTotalPages(pdf.numPages)

        if (!manifest.pdf_metadata) {
          try {
            const { info } = await pdf.getMetadata()
            if (cancelled) return
            const updated = { ...manifest, pdf_metadata: info }
            const pdfTitle = (info as Record<string, unknown>).Title
            if (typeof pdfTitle === "string" && pdfTitle.trim()) {
              updated.title = pdfTitle.trim()
            }
            await invoke("update_manifest", { scoreId, manifest: updated })
          } catch {
            // Metadata extraction is best-effort
          }
        }
      } catch (err) {
        if (!cancelled) setError(`Failed to load PDF: ${err}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPdf()

    return () => {
      cancelled = true
    }
  }, [scoreId, manifest])

  const setStartsOnLeft = useCallback(
    async (value: boolean) => {
      setStartsOnLeftState(value)
      if (!scoreId || !manifest) return
      const updatedManifest = {
        ...manifest,
        display: { ...manifest.display, starts_on_left: value },
      }
      try {
        await invoke("update_manifest", { scoreId, manifest: updatedManifest })
      } catch (err) {
        console.error("Failed to persist startsOnLeft:", err)
      }
    },
    [scoreId, manifest]
  )

  const getPageImageUrl = useCallback(
    async (pageNumber: number): Promise<string | undefined> => {
      if (!pdfDoc || !scoreId || pdfDocScoreId !== scoreId) return undefined

      const cacheKey = `${scoreId}:${pageNumber}`

      if (memoryCache.has(cacheKey)) {
        return memoryCache.get(cacheKey)
      }

      if (inFlight.has(cacheKey)) {
        return inFlight.get(cacheKey)
      }

      const work = (async (): Promise<string | undefined> => {
        try {
          if (await hasCachedPage(scoreId, pageNumber)) {
            const url = await loadCachedPage(scoreId, pageNumber)
            if (url) {
              memoryCache.set(cacheKey, url)
              return url
            }
          }
        } catch {
          // Cache check failed, fall through to render
        }

        try {
          const canvas = await renderPageToCanvas(pdfDoc, pageNumber)
          const displayUrl = await canvasToJpegUrl(canvas)
          memoryCache.set(cacheKey, displayUrl)

          saveCachedPage(scoreId, pageNumber, canvas).catch(() => {})

          return displayUrl
        } catch {
          return undefined
        }
      })()

      inFlight.set(cacheKey, work)
      try {
        return await work
      } finally {
        inFlight.delete(cacheKey)
      }
    },
    [pdfDoc, scoreId, pdfDocScoreId]
  )

  useEffect(() => {
    if (!pdfDoc || !scoreId || pdfDocScoreId !== scoreId || totalPages === 0)
      return

    let cancelled = false

    const timeout = setTimeout(async () => {
      for (let i = 0; i < totalPages; i++) {
        if (cancelled) break
        try {
          if (await hasCachedPage(scoreId, i)) continue
          const canvas = await renderPageToCanvas(pdfDoc, i)
          if (cancelled) break
          await saveCachedPage(scoreId, i, canvas)
        } catch {
          // Page cache failed, continue with next
        }
      }
    }, 2000)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [pdfDoc, scoreId, pdfDocScoreId, totalPages])

  return {
    loading,
    error,
    totalPages,
    startsOnLeft,
    setStartsOnLeft,
    getPageImageUrl,
  }
}
