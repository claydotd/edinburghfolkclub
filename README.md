# Edinburgh Folk Club

React + Vite site. **Netlify** is the production host: news, gigs, and members use Functions + Database + Blobs; the newsletter uses Resend Contacts/Broadcasts; contact and play-at-EFC forms post to Netlify Forms. GitHub Pages remains a static demo (`VITE_NEWS_DEMO=1`) with example news and a local-only members sign-in. `npm run dev` uses a file store in `.data/` for news, gigs, and members (newsletter requires Resend env vars).

## Scripts

```bash
npm install
npm run dev      # local development (file-backed news, gigs, members; Resend for newsletter)
npm run build    # production build → dist/
npm run preview  # preview the production build
```

For full Netlify Functions + Database + Blobs locally, link the site and use the Netlify CLI:

```bash
npx netlify login
npx netlify link
npx netlify dev
```

## Deploy (GitHub Actions → GitHub Pages)

Deploys happen automatically via [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) on every push to `main` (or manually from the Actions tab).

**One-time setup on GitHub:**

1. Create a GitHub repo and push this project (`git remote add origin …` then `git push -u origin main`).
2. Repo **Settings → Pages → Build and deployment → Source**: choose **GitHub Actions** (not “Deploy from a branch”).
3. After the first successful workflow run, the site will be at  
   `https://<user-or-org>.github.io/<repo-name>/`

The workflow sets `VITE_BASE=/<repo-name>/` and `VITE_NEWS_DEMO=1` so asset paths match project Pages and news works without Netlify Functions.

### Local base path

The Vite `base` is controlled by `VITE_BASE` (default `/`).

- Local / Netlify / custom domain: leave unset (`/`)
- Match Pages locally: `VITE_BASE=/edinburghfolkclub/ VITE_NEWS_DEMO=1 npm run build`

## Still deferred

- **Members’ tickets** is layout-only; booking is deferred.
- **PayPal** checkout is not wired. Paid status is recorded by an admin.
- **GitHub Pages** (`VITE_NEWS_DEMO=1`) keeps seeded news, admin password `admin`, and an any-email members sign-in in the browser. It does not share the membership list.

## News demo (GitHub Pages)

When `VITE_NEWS_DEMO=1` (set automatically by the Pages deploy workflow):

| Piece | Behaviour |
|-------|-----------|
| Public `/news` | Seeded example articles from `src/news/demoData.ts` |
| Homepage banner | Seeded banner (editable in admin) |
| `/admin` | Password **`admin`**; session in `sessionStorage`. The Members screen is hidden |
| Members sign-in | Any email, stored in `localStorage` |
| Persistence | Browser only — not shared between visitors |

Try a Pages-like build locally:

```bash
VITE_NEWS_DEMO=1 npm run build && npm run preview
```

## News (Netlify DB + Blobs)

Public `/news` reads a **Blobs snapshot** via `/.netlify/functions/news` (CDN-cached). When Netlify Database is connected, Postgres is only used from `/admin`, and each save rebuilds the snapshot. When it is not connected, `/admin` reads and writes Blobs directly, including that public snapshot, so the admin screen still loads.

| Piece | Role |
|-------|------|
| `news_posts` table | Source of truth (migration in `netlify/database/migrations/`) |
| Blobs store `news` / key `published` | Published feed snapshot for public reads |
| Blobs store `news` / key `home-banner` | Homepage banner text + CTA |
| `/.netlify/functions/news` | Public read (blob only; `?resource=banner` for banner) |
| Blobs store `news` / key `posts` | Full post list used by admin when the database is not connected |
| `/.netlify/functions/news-admin` | Login + CRUD. Database when connected, otherwise Blobs. Either way a save rebuilds `published`. `?action=banner` for banner |
| `.data/news-local.json` | File-backed store for Vite/`NEWS_USE_LOCAL` (gitignored) |

## Gigs

The homepage reads a **Blobs snapshot** via `/.netlify/functions/gigs` (CDN-cached). Postgres is only used from `/admin/gigs`. Opening that screen, or saving a gig, republishes the snapshot. Until the database is connected, admin reads and writes use the `gigs` Blobs store directly. An empty admin store is filled with the current season from `netlify/functions/_lib/gigSeed.ts`; a public read of an empty snapshot stays empty. `npm run dev` seeds `.data/gigs-local.json` with that same season. Uploaded gig images stay in the `gig-images` Blobs store.

| Piece | Role |
|-------|------|
| `gigs` table | Source of truth (migration `003_create_gigs.sql`) |
| Blobs store `gigs` / key `list` | Public listing snapshot |
| `/.netlify/functions/gigs` | Public read (blob only) |
| `/.netlify/functions/news-admin?action=gigs` | Admin CRUD (DB, then rebuild snapshot) |
| `.data/gigs-local.json` | File-backed store for Vite/`NEWS_USE_LOCAL` (gitignored) |

## Members

Anyone whose email is on the list can open `/members`. Paid status does not lock documents; it is a committee record. Sign-in and the session check read a **Blobs snapshot**. Postgres is used from `/admin/members` and from ticket reservations.

| Piece | Role |
|-------|------|
| `members` table | Source of truth. Name, email, paid checkbox, paid date (migration `002_create_members.sql`) |
| Blobs store `members` / key `list` | Server-only snapshot for sign-in and session. Not returned as a public list |
| Expiry | Paid date plus one calendar year. Current only when Paid is ticked and today is before that date |
| `/.netlify/functions/members` | Email sign-in and session from the snapshot (no database). Logout clears cookie `efc_member` |
| `/.netlify/functions/members?action=reservations` | Signed-in member lists upcoming gigs and reserves one ticket per gig |
| `/.netlify/functions/members-admin` | List, create, update, delete. Database when connected, otherwise the snapshot. A database save rebuilds the snapshot |
| `/.netlify/functions/members-admin?action=reservations` | Upcoming gigs with how many people reserved, and who they are |
| `gig_reservations` table | One row per member per gig (migration `005_create_gig_reservations.sql`). Database when connected |
| Blobs store `reservations` / key `list` | Reservation list when the database is not connected. Not a public snapshot |
| `/admin/members` | Admin screen for the list. Opening it publishes the current table into the snapshot |
| `/admin/reservations` | Upcoming gigs, reservation counts, and the people who reserved |
| `.data/members-local.json` | File-backed store for Vite/`NEWS_USE_LOCAL` (gitignored) |
| `.data/reservations-local.json` | File-backed reservations for Vite/`NEWS_USE_LOCAL` (gitignored) |

## Newsletter

Public signup and `/admin/newsletter` subscribers use **Resend Contacts** in a Segment as the single source of truth. Compose and send via **Resend Broadcasts** (written message, selected news posts, upcoming gigs). Test emails still use `emails.send`.

| Piece | Role |
|-------|------|
| Resend Segment (`RESEND_SEGMENT_ID`) | Mailing list source of truth; admin CRUD + public signup write here |
| `/.netlify/functions/newsletter` | Public subscribe (+ signed unsubscribe by Resend contact id) |
| `/.netlify/functions/newsletter-admin` | Subscriber CRUD against Resend, HTML preview, test send, broadcast |
| `/.netlify/functions/newsletter-resend-webhook` | Optional verified webhook receiver |
| `/admin/newsletter` | Builder + subscriber list (reads Resend) |

## Forms

`contact` and `play-efc` are detected from the hidden forms in `index.html`. Production Netlify builds set `VITE_NETLIFY_FORMS=1` and POST those submissions to Netlify Forms. The mailing list uses the newsletter function above instead. `npm run dev` and the Pages demo show a local success message for contact forms.

## Deploy to Netlify

1. In Netlify, add a new site from this Git repository. The build settings in [`netlify.toml`](netlify.toml) are picked up automatically (`npm run build`, publish `dist`, functions in `netlify/functions`). Leave `VITE_BASE` and `VITE_NEWS_DEMO` unset.
2. Enable **Netlify Database**. Migrations in `netlify/database/migrations/` run on deploy.
3. Set environment variables (Site settings → Environment variables):

| Variable | Purpose |
|----------|---------|
| `NEWS_ADMIN_PASSWORD` | Shared password for `/admin` |
| `NEWS_ADMIN_SECRET` | HMAC secret for admin/member cookies and unsubscribe links |
| `RESEND_API_KEY` | Resend API key for `/admin/newsletter` sends |
| `RESEND_SEGMENT_ID` | Resend Segment ID — mailing list source of truth + Broadcast target |
| `NEWSLETTER_FROM` | Verified Resend from address (e.g. `Edinburgh Folk Club <newsletter@your-domain.com>`) |
| `NEWSLETTER_SEND_KEY` | Password required in admin before sending a test or list email |
| `RESEND_WEBHOOK_SECRET` | Optional Svix signing secret for the Resend webhook endpoint |
| `SITE_URL` | Optional absolute origin for email links/images (Netlify usually sets `URL`) |

4. Deploy, then open `/admin/members` and `/admin/gigs` once so the public snapshots match the database. Publish a news post to refresh the news snapshot.
5. After the first deploy, confirm `contact` and `play-efc` appear under **Forms**.

Local Vite defaults (dev only): password `local-dev-password`, secret `local-dev-secret-change-me`. `netlify dev` uses the linked site’s database and environment variables.

## Content

| Path | Purpose |
|------|---------|
| `gigs/` | Season JSON + per-gig markdown |
| `content/about.md` | About page |
| `content/terms.md` | Terms & Conditions |
| `content/gallery.json` | Media gallery |
| `content/other-folk.json` | Other Folk links |
| `content/members/` | Member documents (markdown). The people on the list live in the database, not in this folder |
