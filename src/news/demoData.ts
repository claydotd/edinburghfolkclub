import type { HomeBanner, NewsPost } from './types'

/** Seed content for the static GitHub Pages prototype (mirrors `.data/news-local.json`). */
export const DEMO_SEED_POSTS: NewsPost[] = [
  {
    id: 'f77229d0-df8d-42b4-b1cc-df4ca55e4695',
    slug: 'hamish-henderson-lecture-2026',
    title: '2026 Hamish Henderson Lecture',
    excerpt:
      'The 2026 Hamish Henderson Lecture, part of the Carrying Stream Festival, will be a relaxed and informal event presented by Janet Henderson, Hamish’s younger daughter, whose poetry was encouraged by her father when she was in her teens.',
    bodyMarkdown:
      'The 2026 Hamish Henderson Lecture, part of the Carrying Stream Festival, will be a relaxed and informal event presented by Janet Henderson, Hamish’s younger daughter, whose poetry was encouraged by her father when she was in her teens. After a career as a lawyer and raising a family, she returned to poetry and published her first collection in 2025. Realising that some of her poems were quietly asking for tunes, she is now moving into songwriting.\n\nThe Lecture is at The Scottish Storytelling Centre on Saturday 14 November. Tickets, which are free, can be booked via the SSC website. [Click here for more details and tickets](https://scottishstorytellingcentre.online.red61.co.uk/event/913:6913/913:30812/).',
    published: true,
    publishedAt: '2026-10-09T11:42:07.823Z',
    createdAt: '2026-10-09T11:42:07.823Z',
    updatedAt: '2026-10-14T11:20:37.278Z',
  },
]

export const DEMO_SEED_BANNERS: HomeBanner[] = [
  {
    id: 'legacy',
    enabled: true,
    text: 'The annual Hamish Henderson Lecture is happening on (date)',
    ctaLabel: 'Find out more',
    ctaHref: '/news/hamish-henderson-lecture-2026',
    color: 'thistle',
    updatedAt: '2026-10-14T11:23:05.340Z',
  },
  {
    id: 'acb063b1-0dd0-42d6-bb64-92203085c1cf',
    enabled: true,
    text: 'Burns Night 2027 Announced',
    ctaLabel: 'See details',
    ctaHref: '/news',
    color: 'moss',
    updatedAt: '2026-10-14T11:23:05.340Z',
  },
]

/** Prototype password for static demo / GitHub Pages (not for production). */
export const DEMO_ADMIN_PASSWORD = 'admin'
