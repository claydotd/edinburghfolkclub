import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  captionForPhoto,
  type GalleryAlbumPhoto,
} from '../utils/gallery'

type GalleryLightboxProps = {
  photo: GalleryAlbumPhoto | null
  onClose: () => void
}

export default function GalleryLightbox({ photo, onClose }: GalleryLightboxProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!photo) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [photo, onClose])

  if (!photo) return null

  const caption = captionForPhoto(photo)

  return createPortal(
    <div className="gallery-lightbox" role="presentation">
      <button
        type="button"
        className="gallery-lightbox__backdrop"
        aria-label="Close photo"
        onClick={onClose}
      />
      <div
        className="gallery-lightbox__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          ref={closeRef}
          type="button"
          className="gallery-lightbox__close"
          onClick={onClose}
        >
          Close
        </button>
        <figure className="gallery-lightbox__figure">
          <img
            className="gallery-lightbox__image"
            src={photo.fullSrc}
            alt={photo.alt ?? caption}
            width={photo.width}
            height={photo.height}
          />
          <figcaption id={titleId} className="gallery-lightbox__caption">
            {caption}
          </figcaption>
        </figure>
      </div>
    </div>,
    document.body,
  )
}
