import {
  useEffect,
  useId,
  useRef,
  useState,
  type AnimationEvent,
  type ComponentPropsWithoutRef,
} from 'react';
import { createPortal } from 'react-dom';
import Markdown from 'react-markdown';
import type { GigDetails } from '../utils/gigDetails';
import { publicUrl } from '../utils/publicUrl';

const markdownComponents = {
  img: ({ src, alt, ...props }: ComponentPropsWithoutRef<'img'>) => (
    <img src={src ? publicUrl(src) : src} alt={alt ?? ''} {...props} />
  ),
};

type GigDetailModalProps = {
  open: boolean;
  name: string;
  details: GigDetails;
  markdown: string | null;
  tickets?: string;
  website?: string;
  onClose: () => void;
};

export default function GigDetailModal({
  open,
  name,
  details,
  markdown,
  tickets,
  website,
  onClose,
}: GigDetailModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || isClosing) return;

    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (isClosing) return;

        const reduceMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches;

        if (reduceMotion) {
          onClose();
          return;
        }

        setIsClosing(true);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, isClosing, onClose]);

  function requestClose() {
    if (isClosing) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (reduceMotion) {
      onClose();
      return;
    }

    setIsClosing(true);
  }

  function handleSheetAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (!isClosing) return;
    if (event.animationName !== 'gig-modal-slide-out') return;
    onClose();
  }

  if (!open) return null;

  const closingClass = isClosing ? ' gig-modal--closing' : '';
  const { ticketPrices } = details;

  return createPortal(
    <div className={`gig-modal${closingClass}`} role="presentation">
      <button
        type="button"
        className="gig-modal__backdrop"
        aria-label="Close details"
        onClick={requestClose}
      />
      <div
        className="gig-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onAnimationEnd={handleSheetAnimationEnd}
      >
        <div className="gig-modal__top">
          <button
            ref={closeRef}
            type="button"
            className="gig-modal__btn gig-modal__btn--back"
            onClick={requestClose}
          >
            ← Back
          </button>
          <div className="gig-modal__heading">
            <h2 id={titleId} className="gig-modal__title">
              {name}
            </h2>
            {website && (
              <a
                className="gig-modal__btn gig-modal__btn--website"
                href={website}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit website
              </a>
            )}
          </div>
        </div>

        <div className="gig-modal__content">
          <dl className="gig-modal__facts">
            <div>
              <dt>Venue</dt>
              <dd>{details.venue}</dd>
            </div>
            <div>
              <dt>Doors &amp; Bar</dt>
              <dd>{details.doors}</dd>
            </div>
            <div>
              <dt>Music</dt>
              <dd>{details.music}</dd>
            </div>
            <div>
              <dt>Tickets</dt>
              <dd>
                {ticketPrices.standard} standard · {ticketPrices.unwaged}{' '}
                unwaged · {ticketPrices.members} members
                <p><em className="gig-modal__prices-note">*Tickets Scotland sales will incur a booking fee</em></p>
              </dd>
            </div>
          </dl>

          {markdown && (
            <Markdown components={markdownComponents}>{markdown}</Markdown>
          )}
        </div>

        {tickets && (
          <div className="gig-modal__footer">
            <a
              className="gig-modal__btn gig-modal__btn--tickets"
              href={tickets}
              target="_blank"
              rel="noopener noreferrer"
            >
              Book at Tickets Scotland
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
