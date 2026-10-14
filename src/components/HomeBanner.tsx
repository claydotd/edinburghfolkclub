import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHomeBanners } from '../news/api'
import type { BannerColor, HomeBanner as HomeBannerData } from '../news/types'

const ROTATE_MS = 6000
const EXIT_MS = 380
const ENTER_MS = 420

function isExternalHref(href: string) {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:')
  )
}

function isActiveBanner(banner: HomeBannerData) {
  return Boolean(
    banner.enabled && banner.text && banner.ctaLabel && banner.ctaHref,
  )
}

function BannerCta({
  label,
  href,
}: {
  label: string
  href: string
}) {
  if (isExternalHref(href)) {
    return (
      <a
        className="home-banner-cta"
        href={href}
        target={href.startsWith('mailto:') ? undefined : '_blank'}
        rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
      >
        {label}
      </a>
    )
  }
  return (
    <Link className="home-banner-cta" to={href}>
      {label}
    </Link>
  )
}

function BannerControls({
  index,
  total,
  disabled,
  onPrev,
  onNext,
}: {
  index: number
  total: number
  disabled?: boolean
  onPrev?: () => void
  onNext?: () => void
}) {
  return (
    <div className="home-banner-controls">
      <button
        type="button"
        className="home-banner-nav"
        onClick={onPrev}
        disabled={disabled || !onPrev}
        aria-label="Previous announcement"
        tabIndex={onPrev ? undefined : -1}
      >
        ‹
      </button>
      <span className="home-banner-count" aria-live={onPrev ? 'polite' : undefined}>
        {index + 1} / {total}
      </span>
      <button
        type="button"
        className="home-banner-nav"
        onClick={onNext}
        disabled={disabled || !onNext}
        aria-label="Next announcement"
        tabIndex={onNext ? undefined : -1}
      >
        ›
      </button>
    </div>
  )
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function HomeBanner() {
  const [banners, setBanners] = useState<HomeBannerData[]>([])
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')
  const [color, setColor] = useState<BannerColor>('thistle')
  const [progress, setProgress] = useState(0)

  const bannersRef = useRef(banners)
  const indexRef = useRef(index)
  const phaseRef = useRef(phase)
  const timersRef = useRef<number[]>([])
  const rafRef = useRef<number | null>(null)

  bannersRef.current = banners
  indexRef.current = index
  phaseRef.current = phase

  function clearTimers() {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  function goTo(nextIndex: number) {
    const list = bannersRef.current
    if (list.length < 2) return
    if (phaseRef.current !== 'idle') return

    const target = ((nextIndex % list.length) + list.length) % list.length
    if (target === indexRef.current) return

    clearTimers()
    setProgress(0)

    if (prefersReducedMotion()) {
      setIndex(target)
      setColor(list[target].color)
      return
    }

    setPhase('exit')
    const exitId = window.setTimeout(() => {
      setIndex(target)
      setColor(list[target].color)
      setPhase('enter')
      const enterId = window.setTimeout(() => {
        setPhase('idle')
      }, ENTER_MS)
      timersRef.current.push(enterId)
    }, EXIT_MS)
    timersRef.current.push(exitId)
  }

  useEffect(() => {
    let cancelled = false
    fetchHomeBanners()
      .then((data) => {
        if (cancelled) return
        const active = (data.items ?? []).filter(isActiveBanner)
        setBanners(active)
        if (active[0]) setColor(active[0].color)
      })
      .catch(() => {
        if (!cancelled) setBanners([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => clearTimers()
  }, [])

  useEffect(() => {
    if (banners.length < 2 || phase !== 'idle') {
      if (phase !== 'idle') setProgress(0)
      return
    }

    const startedAt = performance.now()
    let cancelled = false

    const tick = (now: number) => {
      if (cancelled) return
      const elapsed = now - startedAt
      const next = Math.min(1, elapsed / ROTATE_MS)
      setProgress(next)
      if (next >= 1) {
        goTo(indexRef.current + 1)
        return
      }
      rafRef.current = window.requestAnimationFrame(tick)
    }

    setProgress(0)
    rafRef.current = window.requestAnimationFrame(tick)

    return () => {
      cancelled = true
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [banners, index, phase])

  if (banners.length === 0) return null

  const banner = banners[index] ?? banners[0]
  const showControls = banners.length > 1
  const slideClass =
    phase === 'exit'
      ? 'home-banner-slide home-banner-slide--exit'
      : phase === 'enter'
        ? 'home-banner-slide home-banner-slide--enter'
        : 'home-banner-slide'
  const progressPercent = Math.round(progress * 100)

  return (
    <aside
      className={`home-banner home-banner--${color}`}
      aria-label="Club announcements"
    >
      <div className="home-banner-viewport">
        {/* Invisible stack: sizes viewport to the tallest banner */}
        <div className="home-banner-sizer" aria-hidden="true">
          {banners.map((item, itemIndex) => (
            <div className="home-banner-inner" key={item.id}>
              <p className="home-banner-text">{item.text}</p>
              <span className="home-banner-cta">{item.ctaLabel}</span>
              {showControls ? (
                <BannerControls index={itemIndex} total={banners.length} />
              ) : null}
            </div>
          ))}
        </div>

        <div className={slideClass} key={banner.id}>
          <div className="home-banner-inner">
            <p className="home-banner-text" aria-live="polite">
              {banner.text}
            </p>
            <BannerCta label={banner.ctaLabel} href={banner.ctaHref} />
            {showControls ? (
              <BannerControls
                index={index}
                total={banners.length}
                disabled={phase !== 'idle'}
                onPrev={() => goTo(index - 1)}
                onNext={() => goTo(index + 1)}
              />
            ) : null}
          </div>
        </div>
      </div>
      {showControls ? (
        <div
          className="home-banner-progress"
          role="progressbar"
          aria-label="Time until next announcement"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <div
            className="home-banner-progress-bar"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      ) : null}
    </aside>
  )
}
