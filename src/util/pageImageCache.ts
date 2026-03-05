import { appCacheDir, join } from "@tauri-apps/api/path"
import { exists, mkdir, readFile, writeFile } from "@tauri-apps/plugin-fs"

// Cache directory is keyed by PDF content ID (permanent /ID from PDF trailer).
// This means:
// - Same PDF at different paths → shares cache (same content ID)
// - PDF with updated annotations/metadata → cache preserved (permanent ID stable)
// - Truly different PDF content → cache invalidated (different ID)

// Get the cache directory for a specific PDF by its content ID
const getPdfCacheDir = async (contentId: string): Promise<string> => {
  const cacheDir = await appCacheDir()
  return join(cacheDir, "pages", contentId)
}

// Get the cache path for a specific page
const getPageCachePath = async (
  contentId: string,
  pageNum: number
): Promise<string> => {
  const pdfCacheDir = await getPdfCacheDir(contentId)
  return join(pdfCacheDir, `${pageNum}.webp`)
}

// Check if a cached page image exists
export const hasCachedPage = async (
  contentId: string,
  pageNum: number
): Promise<boolean> => {
  try {
    const cachePath = await getPageCachePath(contentId, pageNum)
    return await exists(cachePath)
  } catch {
    return false
  }
}

// Load a cached page image as a blob URL
export const loadCachedPage = async (
  contentId: string,
  pageNum: number
): Promise<string | null> => {
  try {
    const cachePath = await getPageCachePath(contentId, pageNum)
    const data = await readFile(cachePath)
    const blob = new Blob([data], { type: "image/webp" })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

// Save a canvas as a cached WebP image
export const saveCachedPage = async (
  contentId: string,
  pageNum: number,
  canvas: HTMLCanvasElement
): Promise<string> => {
  const pdfCacheDir = await getPdfCacheDir(contentId)
  const cachePath = await getPageCachePath(contentId, pageNum)

  // Ensure cache directory exists
  try {
    if (!(await exists(pdfCacheDir))) {
      await mkdir(pdfCacheDir, { recursive: true })
    }
  } catch {
    // Directory might already exist, continue
  }

  // Convert canvas to WebP blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
      "image/webp",
      0.9 // Quality 0.9 for good balance of size/quality
    )
  })

  // Write to cache
  const arrayBuffer = await blob.arrayBuffer()
  await writeFile(cachePath, new Uint8Array(arrayBuffer))

  // Return blob URL for immediate use
  return URL.createObjectURL(blob)
}

// Get the render size for fullscreen caching
export const getFullscreenRenderSize = (): {
  width: number
  height: number
} => {
  const dpr = window.devicePixelRatio || 1
  return {
    width: Math.round(screen.width * dpr),
    height: Math.round(screen.height * dpr),
  }
}
