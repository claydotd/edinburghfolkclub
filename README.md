# Edinburgh Folk Club

React + Vite site. **Netlify** is the production host: news, gigs, and members use Functions + Database + Blobs, and the contact forms post to Netlify Forms. GitHub Pages remains a static demo (`VITE_NEWS_DEMO=1`) with example news and a local-only members sign-in. `npm run dev` uses a file store in `.data/` for news, gigs, and members.

## Scripts

```bash
npm install
npm run dev      # local development (file-backed news, gigs, and members)
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

Public `/news` reads a **Blobs snapshot** via `/.netlify/functions/news` (CDN-cached). Postgres is only used when an editor saves from `/admin`.

| Piece | Role |
|-------|------|
| `news_posts` table | Source of truth (migration in `netlify/database/migrations/`) |
| Blobs store `news` / key `published` | Published feed snapshot for public reads |
| Blobs store `news` / key `home-banner` | Homepage banner text + CTA |
| `/.netlify/functions/news` | Public read (blob only; `?resource=banner` for banner) |
| `/.netlify/functions/news-admin` | Login + CRUD (DB, then rebuild snapshot); `?action=banner` for banner |
| `.data/news-local.json` | File-backed store for Vite/`NEWS_USE_LOCAL` (gitignored) |

## Members

Anyone whose email is on the list can open `/members`. Paid status does not lock documents; it is a committee record.

| Piece | Role |
|-------|------|
| `members` table | Name, email, paid checkbox, paid date (migration `002_create_members.sql`) |
| Expiry | Paid date plus one calendar year. Current only when Paid is ticked and today is before that date |
| `/.netlify/functions/members` | Email sign-in, logout, and session cookie `efc_member` |
| `/.netlify/functions/members-admin` | List, create, update, delete (same admin cookie as news) |
| `/admin/members` | Admin screen for the list |
| `.data/members-local.json` | File-backed store for Vite/`NEWS_USE_LOCAL` (gitignored) |

## Forms

`contact`, `newsletter`, and `play-efc` are detected from the hidden forms in `index.html`. Production Netlify builds set `VITE_NETLIFY_FORMS=1` and POST submissions to Netlify Forms. `npm run dev` and the Pages demo show a local success message instead.

## Deploy to Netlify

1. In Netlify, add a new site from this Git repository. The build settings in [`netlify.toml`](netlify.toml) are picked up automatically (`npm run build`, publish `dist`, functions in `netlify/functions`). Leave `VITE_BASE` and `VITE_NEWS_DEMO` unset.
2. Enable **Netlify Database**. Migrations in `netlify/database/migrations/` run on deploy.
3. Set environment variables (Site settings → Environment variables):

| Variable | Purpose |
|----------|---------|
| `NEWS_ADMIN_PASSWORD` | Shared password for `/admin` |
| `NEWS_ADMIN_SECRET` | HMAC secret for the admin and member session cookies |

4. Deploy, then open `/admin` and add members. Publish a news post to refresh the public snapshot.
5. After the first deploy, confirm `contact`, `newsletter`, and `play-efc` appear under **Forms**.

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
