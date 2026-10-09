# Edinburgh Folk Club

Static React + Vite prototype for layout and content. Hosted on GitHub Pages in Phase 1; forms and membership are UI stubs. On Pages, news and admin run in a **client-side demo** (example articles + password `admin`). On Netlify, news uses Functions + Database + Blobs (with a local file store for `npm run dev`).

## Scripts

```bash
npm install
npm run dev      # local development (includes news API stub)
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

## Phase 1 stubs (intentional)

- **Contact** and **newsletter** forms use Netlify-shaped markup (`data-netlify`, honeypot, hidden static forms in `index.html`) but submit locally with a success message only.
- **Members area** accepts any email (stored in `localStorage`). PayPal is a placeholder button; click it to mark membership paid in the prototype.
- **Members’ tickets** is layout-only; booking is deferred.
- **News / admin (GitHub Pages)** use `VITE_NEWS_DEMO=1`: seeded example articles, admin password `admin`, edits in `localStorage` only (see below).

## News demo (GitHub Pages)

When `VITE_NEWS_DEMO=1` (set automatically by the Pages deploy workflow):

| Piece | Behaviour |
|-------|-----------|
| Public `/news` | Seeded example articles from `src/news/demoData.ts` |
| Homepage banner | Seeded banner (editable in admin) |
| `/admin` | Password **`admin`**; session in `sessionStorage` |
| Persistence | Browser `localStorage` only — not shared between visitors |

Try a Pages-like build locally:

```bash
VITE_NEWS_DEMO=1 npm run build && npm run preview
```

## News (Netlify DB + Blobs)

Public `/news` reads a **Blobs snapshot** via `/.netlify/functions/news` (CDN-cached). Postgres is only used when an editor saves from `/admin`.

| Piece | Role |
|-------|------|
| `news_posts` table | Source of truth (migration in `netlify/database/migrations/`) |
| Blobs store `news` / key `published` | Published feed snapshot for public reads |
| Blobs store `news` / key `home-banner` | Homepage banner text + CTA |
| `/.netlify/functions/news` | Public read (blob only; `?resource=banner` for banner) |
| `/.netlify/functions/news-admin` | Login + CRUD (DB, then rebuild snapshot); `?action=banner` for banner |
| `.data/news-local.json` | File-backed store for Vite/`NEWS_USE_LOCAL` (gitignored) |

### Netlify setup

1. Enable **Netlify Database** on the site (migrations apply on deploy).
2. Set environment variables (Site settings → Environment variables, or `.env` for local):

| Variable | Purpose |
|----------|---------|
| `NEWS_ADMIN_PASSWORD` | Shared password for `/admin` |
| `NEWS_ADMIN_SECRET` | HMAC secret for the admin session cookie |

3. Deploy to Netlify (or run `netlify dev` linked to the site).
4. Open `/admin`, sign in, create posts. Publish to refresh the public snapshot.

Local Vite defaults (dev only): password `local-dev-password`, secret `local-dev-secret-change-me`.

## Phase 2 hooks

| Concern | Ready seam |
|---------|------------|
| Hosting | `netlify.toml`, `public/_redirects` |
| Forms | Netlify form names `contact` / `newsletter` |
| Membership | `src/membership/` adapter + context |
| PayPal | `VITE_PAYPAL_BUTTON_ID` env (unused until live SDK) |
| News | Pages: `VITE_NEWS_DEMO` client stub; Netlify: Functions + DB + Blobs |

## Content

| Path | Purpose |
|------|---------|
| `gigs/` | Season JSON + per-gig markdown |
| `content/about.md` | About page |
| `content/terms.md` | Terms & Conditions |
| `content/gallery.json` | Media gallery |
| `content/other-folk.json` | Other Folk links |
| `content/members/` | Member documents |
