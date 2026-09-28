# Edinburgh Folk Club

Static React + Vite prototype for layout and content. Hosted on GitHub Pages in Phase 1; forms and membership are UI stubs ready for a Netlify backend in Phase 2.

## Scripts

```bash
npm install
npm run dev      # local development
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Deploy (GitHub Actions → GitHub Pages)

Deploys happen automatically via [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) on every push to `main` (or manually from the Actions tab).

**One-time setup on GitHub:**

1. Create a GitHub repo and push this project (`git remote add origin …` then `git push -u origin main`).
2. Repo **Settings → Pages → Build and deployment → Source**: choose **GitHub Actions** (not “Deploy from a branch”).
3. After the first successful workflow run, the site will be at  
   `https://<user-or-org>.github.io/<repo-name>/`

The workflow sets `VITE_BASE=/<repo-name>/` so asset and router paths match project Pages.

### Local base path

The Vite `base` is controlled by `VITE_BASE` (default `/`).

- Local / Netlify / custom domain: leave unset (`/`)
- Match Pages locally: `VITE_BASE=/edinburghfolkclub/ npm run build`

## Phase 1 stubs (intentional)

- **Contact** and **newsletter** forms use Netlify-shaped markup (`data-netlify`, honeypot, hidden static forms in `index.html`) but submit locally with a success message only.
- **Members area** accepts any email (stored in `localStorage`). PayPal is a placeholder button; click it to mark membership paid in the prototype.
- **Members’ tickets** is layout-only; booking is deferred.

## Phase 2 hooks

| Concern | Ready seam |
|---------|------------|
| Hosting | `netlify.toml`, `public/_redirects` |
| Forms | Netlify form names `contact` / `newsletter` |
| Membership | `src/membership/` adapter + context |
| PayPal | `VITE_PAYPAL_BUTTON_ID` env (unused until live SDK) |

## Content

| Path | Purpose |
|------|---------|
| `gigs/` | Season JSON + per-gig markdown |
| `content/about.md` | About page |
| `content/terms.md` | Terms & Conditions |
| `content/gallery.json` | Media gallery |
| `content/other-folk.json` | Other Folk links |
| `content/members/` | Member documents |
