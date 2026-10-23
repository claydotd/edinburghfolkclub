import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { adminUploadGigImage } from '../gigs/api'
import {
  compressNewsImage,
  type CompressProgress,
} from '../utils/compressImage'

type UploadedNewsImage = {
  imagepath: string
  previewUrl: string
  filename: string
}

type NewsImageFieldProps = {
  onInsert: (markdown: string) => void
}

function altTextFromFilename(filename: string): string {
  const base = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/[[\]()]/g, '')
    .trim()
  return base || 'Image'
}

function toImageMarkdown(src: string, alt: string): string {
  return `![${alt}](${src})`
}

export default function NewsImageField({ onInsert }: NewsImageFieldProps) {
  const inputId = useId()
  const dragDepth = useRef(0)
  const generation = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<CompressProgress | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState<UploadedNewsImage | null>(null)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    return () => {
      if (uploaded?.previewUrl) URL.revokeObjectURL(uploaded.previewUrl)
    }
  }, [uploaded?.previewUrl])

  async function processFile(file: File | undefined) {
    if (!file) return
    const ticket = ++generation.current
    setUploaded(null)
    setUploadError(null)
    setAdded(false)
    setUploading(true)

    const result = await compressNewsImage(file, {
      onProgress: (next) => {
        if (ticket === generation.current) setProgress(next)
      },
    })
    if (ticket !== generation.current) {
      if (result.status === 'ready') URL.revokeObjectURL(result.previewUrl)
      return
    }
    if (result.status !== 'ready') {
      setUploading(false)
      return
    }

    try {
      const saved = await adminUploadGigImage({
        blob: result.blob,
        filename: result.filename,
        contentType: result.contentType,
      })
      if (ticket !== generation.current) {
        URL.revokeObjectURL(result.previewUrl)
        return
      }
      setUploaded({
        imagepath: saved.imagepath,
        previewUrl: result.previewUrl,
        filename: result.filename,
      })
    } catch (err) {
      URL.revokeObjectURL(result.previewUrl)
      if (ticket === generation.current) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      }
    } finally {
      if (ticket === generation.current) setUploading(false)
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    void processFile(event.target.files?.[0])
    event.target.value = ''
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current += 1
    setIsDragging(true)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current = 0
    setIsDragging(false)
    void processFile(event.dataTransfer.files?.[0])
  }

  function addToArticle() {
    if (!uploaded) return
    onInsert(toImageMarkdown(uploaded.imagepath, altTextFromFilename(uploaded.filename)))
    setAdded(true)
  }

  const statusClass =
    progress?.status === 'error' || uploadError
      ? 'gig-image-status is-error'
      : progress?.status === 'ready' && uploaded
        ? 'gig-image-status is-ready'
        : 'gig-image-status'

  const statusMessage = uploadError
    ? uploadError
    : uploading
      ? progress?.status === 'ready'
        ? 'Uploading image…'
        : (progress?.message ?? 'Preparing image…')
      : uploaded
        ? added
          ? 'Added to the article. You can add it again, or drop another image.'
          : (progress?.status === 'ready' ? progress.message : 'Image uploaded.')
        : progress?.status === 'error'
          ? progress.message
          : null

  return (
    <div className="form-field news-image-field">
      <span className="news-image-label">Article image</span>
      <div
        className={`file-drop${isDragging ? ' file-drop--active' : ''}${uploaded ? ' file-drop--filled' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          id={inputId}
          className="file-drop__input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
          disabled={uploading}
          onChange={handleChange}
        />
        <p className="file-drop__prompt">
          {uploaded
            ? `Uploaded: ${uploaded.filename}`
            : 'Drop an image here or click to browse'}
        </p>
        <p className="file-drop__browse">
          Photos are resized to a consistent size for news articles.{' '}
          <span className="file-drop__browse-link">browse</span>
        </p>
      </div>

      {uploaded ? (
        <div className="news-image-preview-wrap">
          <img
            className="news-image-preview"
            src={uploaded.previewUrl}
            alt=""
          />
          <button type="button" className="admin-action-btn" onClick={addToArticle}>
            Add image to article
          </button>
        </div>
      ) : null}

      {statusMessage ? (
        <p className={statusClass} role="status">
          {statusMessage}
        </p>
      ) : null}
    </div>
  )
}
