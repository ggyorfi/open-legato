import { appCacheDir, join } from "@tauri-apps/api/path"
import { exists, mkdir, readFile, writeFile } from "@tauri-apps/plugin-fs"

// Simple hash function for cache keys
// TODO: Consider improved cache invalidation strategy:
// - Current: hash file path only (fast, but doesn't detect content changes)
// - Better: hash path + mtime + file size (invalidates on actual changes, still fast)
const hashString = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

// Get the cache directory for a specific PDF
const getPdfCacheDir = async (pdfPath: string): Promise<string> => {
  const cacheDir = await appCacheDir()
  const pdfHash = hashString(pdfPath)
  return join(cacheDir, "pages", pdfHash)
}

// Get the cache path for a specific page
const getPageCachePath = async (
  pdfPath: string,
  pageNum: number
): Promise<string> => {
  const pdfCacheDir = await getPdfCacheDir(pdfPath)
  return join(pdfCacheDir, `${pageNum}.webp`)
}

// Check if a cached page image exists
export const hasCachedPage = async (
  pdfPath: string,
  pageNum: number
): Promise<boolean> => {
  try {
    const cachePath = await getPageCachePath(pdfPath, pageNum)
    return await exists(cachePath)
  } catch {
    return false
  }
}

// Load a cached page image as a blob URL
export const loadCachedPage = async (
  pdfPath: string,
  pageNum: number
): Promise<string | null> => {
  try {
    const cachePath = await getPageCachePath(pdfPath, pageNum)
    const data = await readFile(cachePath)
    const blob = new Blob([data], { type: "image/webp" })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

// Save a canvas as a cached WebP image
export const saveCachedPage = async (
  pdfPath: string,
  pageNum: number,
  canvas: HTMLCanvasElement
): Promise<string> => {
  const pdfCacheDir = await getPdfCacheDir(pdfPath)
  const cachePath = await getPageCachePath(pdfPath, pageNum)

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
