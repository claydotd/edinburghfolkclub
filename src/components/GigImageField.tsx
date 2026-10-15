import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { formatBytes } from '../gigs/types'
import {
  compressImageForUpload,
  type CompressProgress,
} from '../utils/compressImage'
import { publicUrl } from '../utils/publicUrl'

export type PendingGigImage = {
  blob: Blob
  filename: string
  contentType: string
  previewUrl: string
  originalBytes: number
  compressedBytes: number
}

type GigImageFieldProps = {
  currentImagepath: string
  pending: PendingGigImage | null
  onPendingChange: (pending: PendingGigImage | null) => void
  onClearCurrent: () => void
  onBusyChange?: (busy: boolean) => void
}

export default function GigImageField({
  currentImagepath,
  pending,
  onPendingChange,
  onClearCurrent,
  onBusyChange,
}: GigImageFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState<CompressProgress | null>(null)

  useEffect(() => {
    return () => {
      if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl)
    }
  }, [pending?.previewUrl])

  async function processFile(file: File | undefined) {
    if (!file) return
    onPendingChange(null)
    onBusyChange?.(true)
    const result = await compressImageForUpload(file, {
      onProgress: setProgress,
    })
    if (result.status === 'ready') {
      onPendingChange({
        blob: result.blob,
        filename: result.filename,
        contentType: result.contentType,
        previewUrl: result.previewUrl,
        originalBytes: result.originalBytes,
        compressedBytes: result.compressedBytes,
      })
    }
    onBusyChange?.(false)
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

  function clearPending() {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl)
    onPendingChange(null)
    setProgress(null)
  }

  const previewSrc = pending?.previewUrl
    ? pending.previewUrl
    : currentImagepath
      ? publicUrl(currentImagepath)
      : null

  const statusClass =
    progress?.status === 'error'
      ? 'gig-image-status is-error'
      : progress?.status === 'ready'
        ? 'gig-image-status is-ready'
        : 'gig-image-status'

  return (
    <div className="form-field gig-image-field">
      <span className="gig-image-label">Flyer image</span>
      <div
        className={`file-drop${isDragging ? ' file-drop--active' : ''}${previewSrc ? ' file-drop--filled' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          className="file-drop__input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
          onChange={handleChange}
        />
        <p className="file-drop__prompt">
          {pending
            ? `Selected: ${pending.filename}`
            : currentImagepath
              ? 'Replace the current image by dragging a new one here or clicking to browse'
              : 'Drop a flyer image here or click to browse'}
        </p>
        <p className="file-drop__browse">
          Images are resized automatically to stay under 4MB for upload.{' '}
          <span className="file-drop__browse-link">browse</span>
        </p>
      </div>

      {previewSrc ? (
        <div className="gig-image-preview-wrap">
          <div className="gig-image-preview-frame">
            <img
              className="gig-image-preview"
              src={previewSrc}
              alt=""
            />
          </div>
          <div className="gig-image-preview-actions">
            {pending ? (
              <button type="button" className="admin-action-btn" onClick={clearPending}>
                Discard new image
              </button>
            ) : null}
            {currentImagepath && !pending ? (
              <button
                type="button"
                className="admin-action-btn admin-post-delete"
                onClick={onClearCurrent}
              >
                Remove image
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {progress ? (
        <p className={statusClass} role="status">
          {progress.status === 'ready' ? (
            <>
              {progress.message}
              <br />
              {progress.compressedBytes < progress.originalBytes
                ? `Original: ${formatBytes(progress.originalBytes)} → compressed: ${formatBytes(progress.compressedBytes)}. Ready to upload.`
                : `File size: ${formatBytes(progress.compressedBytes)}. Ready to upload.`}
            </>
          ) : (
            progress.message
          )}
        </p>
      ) : currentImagepath && !pending ? (
        <p className="gig-image-status" role="status">
          Current image is saved. Choose a new file to replace it.
        </p>
      ) : null}
    </div>
  )
}
