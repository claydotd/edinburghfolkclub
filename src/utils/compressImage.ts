import { GIG_IMAGE_MAX_BYTES, formatBytes } from '../gigs/types'

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

function drawScaled(
  img: HTMLImageElement,
  maxEdge: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
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
      ? `Original ${formatBytes(file.size)} → compressed ${formatBytes(candidate.blob.size)} (under 4MB).`
      : `Original ${formatBytes(file.size)} kept at ${formatBytes(candidate.blob.size)} (already under 4MB).`

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
 * Resize/compress an image until it is under the Netlify upload limit (default 4MB).
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
  const originalFits = file.size <= maxBytes

  // Already under the upload limit: keep as-is (no enlargement from re-encoding)
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

  const edgeSteps = [2000, 1600, 1280, 1024, 800, 640]
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
      ? `Could not compress below 4MB (smallest was ${formatBytes(best.blob.size)}). Try a simpler image.`
      : 'Image compression failed.',
  }
  report(error)
  return error
}
