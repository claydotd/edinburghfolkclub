import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHomeBanner } from '../news/api'
import type { HomeBanner as HomeBannerData } from '../news/types'

function isExternalHref(href: string) {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:')
  )
}

export default function HomeBanner() {
  const [banner, setBanner] = useState<HomeBannerData | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchHomeBanner()
      .then((data) => {
        if (!cancelled) setBanner(data)
      })
      .catch(() => {
        if (!cancelled) setBanner(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!banner?.enabled || !banner.text || !banner.ctaLabel || !banner.ctaHref) {
    return null
  }

  const cta = isExternalHref(banner.ctaHref) ? (
    <a
      className="home-banner-cta"
      href={banner.ctaHref}
      target={banner.ctaHref.startsWith('mailto:') ? undefined : '_blank'}
      rel={banner.ctaHref.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
    >
      {banner.ctaLabel}
    </a>
  ) : (
    <Link className="home-banner-cta" to={banner.ctaHref}>
      {banner.ctaLabel}
    </Link>
  )

  return (
    <aside className="home-banner" aria-label="Club announcement">
      <div className="home-banner-inner">
        <p className="home-banner-text">{banner.text}</p>
        {cta}
      </div>
    </aside>
  )
}
