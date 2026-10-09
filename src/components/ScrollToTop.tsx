import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const HASH_GAP_PX = 12

function scrollToHash(hash: string) {
  const id = decodeURIComponent(hash.replace(/^#/, ''))
  if (!id) return false
  const el = document.getElementById(id)
  if (!el) return false

  const header = document.querySelector('.site-header')
  const headerHeight =
    header instanceof HTMLElement ? header.getBoundingClientRect().height : 0
  const top =
    el.getBoundingClientRect().top + window.scrollY - headerHeight - HASH_GAP_PX

  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  return true
}

export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }

    if (scrollToHash(hash)) return

    // Route content may not be painted yet on first navigation.
    const frame = requestAnimationFrame(() => {
      if (scrollToHash(hash)) return
      window.setTimeout(() => scrollToHash(hash), 50)
    })

    return () => cancelAnimationFrame(frame)
  }, [pathname, hash])

  return null
}
