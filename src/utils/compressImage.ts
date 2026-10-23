import {
  GIG_IMAGE_MAX_BYTES,
  GIG_IMAGE_MAX_EDGE,
  formatBytes,
} from '../gigs/types'

/** Fit inside a news column: sharp on screen, not a full-resolution original. */
export const NEWS_IMAGE_MAX_WIDTH = 1200
export const NEWS_IMAGE_MAX_HEIGHT = 800
export const NEWS_IMAGE_MAX_BYTES = 450 * 1024

export type CompressProgress =
  | { status: 'loading'; message: string }
  | { status: 'resizing'; message: string }
  | {
      status: 'ready'
      message: string
      originalBytes: number
      compressedBytes: number
      blob: Blob
      previewUrl: string
      contentType: string
      filename: string
    }
  | { status: 'error'; message: string }

type CompressOptions = {
  maxBytes?: number
  onProgress?: (progress: CompressProgress) => void
}

type EncodedCandidate = {
  blob: Blob
  contentType: string
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image'))
    }
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

function supportsWebpEncoding(): boolean {
  try {
    return document
      .createElement('canvas')
      .toDataURL('image/webp')
      .startsWith('data:image/webp')
  } catch {
    return false
  }
}

function drawFit(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height)
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  // Opaque white so transparent PNG/WebP become valid JPEGs (never PNG output)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

function drawScaled(
  img: HTMLImageElement,
  maxEdge: number,
): HTMLCanvasElement {
  return drawFit(img, maxEdge, maxEdge)
}

function outputFilename(originalName: string, contentType: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'gig-image'
  const ext = contentType.includes('webp') ? 'webp' : 'jpg'
  return `${base}.${ext}`
}

async function encodeCandidates(
  canvas: HTMLCanvasElement,
  quality: number,
  allowWebp: boolean,
): Promise<EncodedCandidate[]> {
  const candidates: EncodedCandidate[] = []

  const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality)
  if (jpeg && jpeg.type === 'image/jpeg') {
    candidates.push({ blob: jpeg, contentType: 'image/jpeg' })
  }

  if (allowWebp) {
    const webp = await canvasToBlob(canvas, 'image/webp', quality)
    // Only keep WebP when the browser actually produced WebP (not a PNG/JPEG fallback)
    if (webp && webp.type === 'image/webp') {
      candidates.push({ blob: webp, contentType: 'image/webp' })
    }
  }

  return candidates
}

function pickSmallest(candidates: EncodedCandidate[]): EncodedCandidate | null {
  if (candidates.length === 0) return null
  return candidates.reduce((best, next) =>
    next.blob.size < best.blob.size ? next : best,
  )
}

function readyResult(
  file: File,
  candidate: EncodedCandidate,
  note?: string,
): CompressProgress & { status: 'ready' } {
  const previewUrl = URL.createObjectURL(candidate.blob)
  const shrunk = candidate.blob.size < file.size
  const message = note
    ? note
    : shrunk
      ? `Original ${formatBytes(file.size)} → compressed ${formatBytes(candidate.blob.size)}.`
      : `Kept at ${formatBytes(candidate.blob.size)}.`

  return {
    status: 'ready',
    message,
    originalBytes: file.size,
    compressedBytes: candidate.blob.size,
    blob: candidate.blob,
    previewUrl,
    contentType: candidate.contentType,
    filename: outputFilename(file.name, candidate.contentType),
  }
}

/**
 * Resize a flyer so its longest edge is about 1200px and it stays under ~280KB.
 * Prefer keeping the original when it already fits; never return a larger re-encode
 * when the original is already under the limit. Output is JPEG (or WebP if smaller).
 */
export async function compressImageForUpload(
  file: File,
  options: CompressOptions = {},
): Promise<CompressProgress & { status: 'ready' | 'error' }> {
  const maxBytes = options.maxBytes ?? GIG_IMAGE_MAX_BYTES
  const report = (progress: CompressProgress) => {
    options.onProgress?.(progress)
  }

  if (!file.type.startsWith('image/')) {
    const error = {
      status: 'error' as const,
      message: 'Please choose an image file (JPEG, PNG, or WebP).',
    }
    report(error)
    return error
  }

  report({ status: 'loading', message: 'Reading image…' })

  let img: HTMLImageElement
  try {
    img = await loadImage(file)
  } catch (err) {
    const error = {
      status: 'error' as const,
      message: err instanceof Error ? err.message : 'Could not read that image',
    }
    report(error)
    return error
  }

  const allowWebp = supportsWebpEncoding()
  const withinEdge =
    img.width <= GIG_IMAGE_MAX_EDGE && img.height <= GIG_IMAGE_MAX_EDGE
  const originalFits = withinEdge && file.size <= maxBytes

  // Already small enough to show: keep as-is (no enlargement from re-encoding)
  if (originalFits) {
    const ready = readyResult(
      file,
      { blob: file, contentType: file.type || 'image/jpeg' },
      `Ready to upload.`,
    )
    report(ready)
    return ready
  }

  report({
    status: 'resizing',
    message: `Compressing image (original ${formatBytes(file.size)})…`,
  })

  const edgeSteps = [GIG_IMAGE_MAX_EDGE, 1024, 800, 640]
  const qualitySteps = [0.85, 0.75, 0.65, 0.55, 0.45, 0.35]

  let best: EncodedCandidate | null = null

  for (const maxEdge of edgeSteps) {
    const canvas = drawScaled(img, maxEdge)
    for (const quality of qualitySteps) {
      report({
        status: 'resizing',
        message: `Resizing to ${canvas.width}×${canvas.height} at ${Math.round(quality * 100)}% JPEG quality…`,
      })
      const candidates = await encodeCandidates(canvas, quality, allowWebp)
      const smallest = pickSmallest(candidates)
      if (!smallest) continue

      if (!best || smallest.blob.size < best.blob.size) {
        best = smallest
      }

      if (smallest.blob.size <= maxBytes) {
        const ready = readyResult(file, smallest)
        report(ready)
        return ready
      }
    }
  }

  const error = {
    status: 'error' as const,
    message: best
      ? `Could not compress below ${formatBytes(maxBytes)} (smallest was ${formatBytes(best.blob.size)}). Try a simpler image.`
      : 'Image compression failed.',
  }
  report(error)
  return error
}

/**
 * Resize a photo so it fits a news article: at most 1200×800, and under ~450KB.
 * Images that already fit are kept as-is.
 */
export async function compressNewsImage(
  file: File,
  options: Pick<CompressOptions, 'onProgress'> = {},
): Promise<CompressProgress & { status: 'ready' | 'error' }> {
  const report = (progress: CompressProgress) => {
    options.onProgress?.(progress)
  }

  if (!file.type.startsWith('image/')) {
    const error = {
      status: 'error' as const,
      message: 'Please choose an image file (JPEG, PNG, or WebP).',
    }
    report(error)
    return error
  }

  report({ status: 'loading', message: 'Reading image…' })

  let img: HTMLImageElement
  try {
    img = await loadImage(file)
  } catch (err) {
    const error = {
      status: 'error' as const,
      message: err instanceof Error ? err.message : 'Could not read that image',
    }
    report(error)
    return error
  }

  const fitsBox =
    img.width <= NEWS_IMAGE_MAX_WIDTH && img.height <= NEWS_IMAGE_MAX_HEIGHT
  if (fitsBox && file.size <= NEWS_IMAGE_MAX_BYTES) {
    const ready = readyResult(
      file,
      { blob: file, contentType: file.type || 'image/jpeg' },
      `Ready to add (${img.width}×${img.height}).`,
    )
    report(ready)
    return ready
  }

  report({
    status: 'resizing',
    message: 'Resizing image for the article…',
  })

  const allowWebp = supportsWebpEncoding()
  const qualitySteps = [0.82, 0.72, 0.6, 0.48]
  let maxWidth = NEWS_IMAGE_MAX_WIDTH
  let maxHeight = NEWS_IMAGE_MAX_HEIGHT
  let best: EncodedCandidate | null = null
  let bestSize = ''

  for (let pass = 0; pass < 3; pass += 1) {
    const canvas = drawFit(img, maxWidth, maxHeight)
    for (const quality of qualitySteps) {
      report({
        status: 'resizing',
        message: `Resizing to ${canvas.width}×${canvas.height}…`,
      })
      const candidates = await encodeCandidates(canvas, quality, allowWebp)
      const smallest = pickSmallest(candidates)
      if (!smallest) continue
      if (!best || smallest.blob.size < best.blob.size) {
        best = smallest
        bestSize = `${canvas.width}×${canvas.height}`
      }
      if (smallest.blob.size <= NEWS_IMAGE_MAX_BYTES) {
        const ready = readyResult(
          file,
          smallest,
          `Resized to ${canvas.width}×${canvas.height} for the article.`,
        )
        report(ready)
        return ready
      }
    }
    maxWidth = Math.round(maxWidth * 0.75)
    maxHeight = Math.round(maxHeight * 0.75)
  }

  if (best && best.blob.size <= 4 * 1024 * 1024) {
    const ready = readyResult(
      file,
      best,
      `Resized to ${bestSize} for the article.`,
    )
    report(ready)
    return ready
  }

  const error = {
    status: 'error' as const,
    message: best
      ? `Could not resize that image for an article (smallest was ${formatBytes(best.blob.size)}). Try a simpler photo.`
      : 'Image compression failed.',
  }
  report(error)
  return error
}
