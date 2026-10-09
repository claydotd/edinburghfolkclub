import type { HomeBanner, NewsPost } from './types'

/** Example posts shipped with the static GitHub Pages prototype. */
export const DEMO_SEED_POSTS: NewsPost[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    slug: 'welcome-to-the-news',
    title: 'Welcome to the news',
    excerpt:
      'Club updates will appear here. This sample post is only for the static prototype.',
    bodyMarkdown:
      '## Hello\n\nThis is a **sample** news post for the GitHub Pages prototype. On Netlify, editors publish real articles from `/admin` into the database; the public site then reads a Blobs snapshot.\n\nFor this static demo, posts live in the browser (`localStorage`) so you can try creating, editing, and publishing without a backend.',
    published: true,
    publishedAt: '2026-01-15T12:00:00.000Z',
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    slug: 'autumn-season-opens',
    title: 'Autumn season opens at Royal Terrace',
    excerpt:
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    bodyMarkdown:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris.\n\nFusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.\n\nCurabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem.',
    published: true,
    publishedAt: '2025-09-28T18:00:00.000Z',
    createdAt: '2025-09-28T18:00:00.000Z',
    updatedAt: '2025-09-28T18:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    slug: 'members-night-recap',
    title: 'Members’ night recap',
    excerpt:
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    bodyMarkdown:
      'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.\n\nAt vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.\n\nSimilique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.',
    published: true,
    publishedAt: '2025-03-12T12:30:00.000Z',
    createdAt: '2025-03-12T12:30:00.000Z',
    updatedAt: '2025-03-12T12:30:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    slug: 'volunteer-call-out',
    title: 'Volunteer call-out for the door and bar',
    excerpt:
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    bodyMarkdown:
      'Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.\n\nTemporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.\n\nUt aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.',
    published: true,
    publishedAt: '2024-08-20T09:00:00.000Z',
    createdAt: '2024-08-20T09:00:00.000Z',
    updatedAt: '2024-08-20T09:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    slug: 'hamish-henderson-lecture',
    title: 'Hamish Henderson Lecture announced',
    excerpt:
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
    bodyMarkdown:
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.\n\nNeque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.\n\nUt enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.',
    published: true,
    publishedAt: '2024-02-05T15:00:00.000Z',
    createdAt: '2024-02-05T15:00:00.000Z',
    updatedAt: '2024-02-05T15:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    slug: 'sample-post-six',
    title: 'Sample post six',
    excerpt:
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.',
    bodyMarkdown:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    published: true,
    publishedAt: '2023-11-14T10:00:00.000Z',
    createdAt: '2023-11-14T10:00:00.000Z',
    updatedAt: '2023-11-14T10:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    slug: 'sample-post-seven',
    title: 'Sample post seven',
    excerpt:
      'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur.',
    bodyMarkdown:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    published: true,
    publishedAt: '2023-06-02T14:00:00.000Z',
    createdAt: '2023-06-02T14:00:00.000Z',
    updatedAt: '2023-06-02T14:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    slug: 'draft-behind-the-scenes',
    title: 'Draft: behind the scenes',
    excerpt: 'Unpublished draft so the admin list can show draft vs published.',
    bodyMarkdown:
      'This post is **unpublished** in the demo seed. Sign in at `/admin` (password `admin`) to publish it and see it appear on the public News page.',
    published: false,
    publishedAt: null,
    createdAt: '2023-01-20T09:30:00.000Z',
    updatedAt: '2023-01-20T09:30:00.000Z',
  },
]

export const DEMO_SEED_BANNER: HomeBanner = {
  enabled: true,
  text: 'The annual Hamish Henderson Lecture is happening on (date)',
  ctaLabel: 'Find out more',
  ctaHref: '/news',
  updatedAt: '2026-10-09T12:00:00.000Z',
}

/** Prototype password for static demo / GitHub Pages (not for production). */
export const DEMO_ADMIN_PASSWORD = 'admin'
