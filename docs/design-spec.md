# colter.dev — Design Spec (2026-08-13)

A dark, starfield-backed personal hub for Colter Dahlberg: identity, services, what I'm building (live), and where to find me. Deployed as a Cloudflare Worker (static assets + cron + KV) on the apex `colter.dev`.

## 1. Architecture
- **One Cloudflare Worker** on `colter.dev` (apex custom domain). Serves static assets (HTML/CSS/JS/font) AND a cron-driven live repo tracker.
- **Live repo tracker:** a `cron` trigger (~every 10 min) fetches the user's 3 most-recently-pushed GitHub repos via a **GitHub PAT** (Worker secret, `repo` scope → includes private). Per repo it pulls: name, description, `private` flag, `pushed_at`, default branch, last commit (short SHA + message + date), and combined build status (`/commits/{sha}/status`). Result stored in **Workers KV**. The Worker **server-renders** the "Currently working on" cards from KV at request time (no client fetch; fresh on cron).
- **Why a Worker not Pages:** Cloudflare Pages is in maintenance mode as of 2026; Workers + Static Assets is the recommended path and gives cron/KV/headroom for the tracker.
- **One font download:** Lexend variable woff2, self-hosted (no Google Fonts request). System-mono only for any inline code (none currently).

## 2. Page structure
1. **Identity** — `Colter Dahlberg` (heading) + tagline `Systems · AI · Open Source`.
2. **Services** (link rows, SVG icons, open new tab): OmniRoute → llm.colter.dev; GitHub → github.com/ColterD; Colter+ → colter.plus.
3. **Currently working on** — 3 live repo cards (top by `pushed_at`). Public repo → clickable; **private → non-clickable** (name + desc + status only). Each card: name, one-line description, build-status dot (green/red/yellow/gray), last commit short SHA, last-updated relative time, a `private` badge where applicable.
4. **Socials** — LinkedIn, Bluesky, mailto `hello@colter.dev` (Proton alias → gmail; verified MX routing).
5. **Settings/accessibility** (gear button, bottom corner) — see §4.

## 3. Taglines (locked)
- OmniRoute — "One endpoint, every model"
- GitHub — "github.com/ColterD"
- Colter+ — "Self-hosted streaming library"
- coco — "A coding agent that ships itself"
- emily — *"We're stuck at 'agentic.' Emily is what comes after."* (no "companion"). Tagline carries superscript citations `¹ ²` linking to the footer references.
- Project card casing: lowercase `emily`, `coco`.
- **References (footer, numbered academic style):**
  - ¹ Morris et al., "Levels of AGI for Operationalizing Progress on the Path to AGI," Google DeepMind, arXiv:2311.02462 (2023) — https://arxiv.org/abs/2311.02462
  - ² Feng et al., "Levels of Autonomy for AI Agents," arXiv:2506.12469 (2025) — https://arxiv.org/abs/2506.12469
  - Inline as `¹ ²` superscripts on the emily tagline; footer lists full citations.

## 4. Settings / accessibility panel
Gear icon (bottom-right), opens a panel. Keyboard-accessible, aria-labelled, focus-trapped. All controls persist in `localStorage`.
- **Animations** On/Off — overrides OS `prefers-reduced-motion` (this is the starfield-motion fix). Default = respect reduced-motion.
- **Star color** — color picker (rebinds canvas + CSS dots live).
- **Text size** — sliders per *type*, synced: Title · Tagline · Body/description (so "all taglines larger, rest unchanged" works). Applied via CSS-variable overrides.
- **Reset to defaults** button.

## 5. Starfield (coming-soon-cx DNA, hardened)
- Canvas, 3 parallax layers, cream stars, drifting at 145°, twinkling, occasional **shooting stars (comets)**.
- `requestAnimationFrame`; pauses on `visibilitychange`; resize-debounced; DPR-capped at 2.
- **`prefers-reduced-motion: reduce` → static single paint (no animation).** Settings panel can override (Animations On).
- Star color reads from a CSS variable so the settings picker live-updates it.
- Bonus (if time): subtle mouse parallax.

## 6. Typography & accessibility payload
- **Font:** Lexend, self-hosted variable woff2 (~39 KB latin, weights 100–900 via one `@font-face`, `font-display: swap`). Body weight 400, headings 600–700 (no hairline weights on dark — they halate).
- **The real "ADHD-friendly" payload** (evidence-based; the font itself isn't a treatment): `line-height ≈ 1.6`, measure ~45–70ch (the hub column is narrow by design), body ≥ 17px, ragged-right (no `justify`), short lines.
- A11y: visible `:focus-visible` rings; semantic `<main>/<nav>/<section>/<h1-h2>`; aria-labels on icon links; `lang`, viewport meta, descriptive `<title>`/description; `prefers-color-scheme` respected (dark default).

## 7. Design tokens (CSS variables)
`--bg #44404d` · `--bg-deep #36323e` · `--star 255,221,157` (cream) · `--text #f6f3ef` · `--text-muted #cdc7d2` · `--text-faint #9a94a4` · `--accent #ffd79a` · surface/border tokens (translucent). Build/commit status: success `#5ad17a`, fail `#ff6b6b`, pending `#e3c54a`, none `#9a94a4`.

## 8. Tech & deploy
- Repo: `colter.dev` (fresh, extracted from the archive per the coming-soon-cx review recommendation). Files: `index.html`, `styles.css`, `starfield.js`, `settings.js`, `fonts/lexend-latin-var.woff2`, `src/worker.js` (the Worker: assets + KV read + cron fetch), `wrangler.toml`.
- Wrangler deploy; bindings: `ASSETS` (static assets), `REPOS` (KV namespace), `GITHUB_TOKEN` (secret). `crons` in `wrangler.toml`.
- Apex `colter.dev` → Worker custom domain (also fixes the original "Visitors cannot reach colter.dev" error). `www` → redirect to apex (optional).

## 9. Acceptance criteria
- `curl https://colter.dev/` serves the page; Lighthouse Perf/A11y/Best-Practices/SEO ≥ 95 (100 target).
- Works at 375px, no horizontal scroll; keyboard-tabbable with visible focus.
- Starfield animates by default (motion-permitting); freezes under reduced-motion; settings Animations toggle overrides + persists.
- Repo cards show real top-3 (incl. private, non-clickable) with status/commit/updated, refreshing on cron.
- All settings persist across reload (localStorage). Star color live-updates.
- hello@colter.dev mailto works (Proton alias). No broken links; all icons render + are centered.
