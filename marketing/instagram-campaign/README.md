# Wesync — Instagram Campaign (Cinematic Orange / Human Motion)

A standalone design workspace for Wesync's Instagram posts. It is **not** part of
the deployed app (nothing here is imported by `src/`) — it's static HTML/CSS
rendered to PNG with Playwright, kept in the repo so the campaign is versioned
and reproducible.

## Art direction

Deep black/charcoal backgrounds, cinematic orange backlighting, long-exposure
motion-blur silhouettes, minimal editorial typography (Cairo, light weight
headlines with a bold gradient accent word), heavy negative space. Tokens live
in `shared/tokens.css`.

## Structure

- `shared/tokens.css` — color tokens + shared classes (`.canvas`, `.kicker`,
  `.footer-line`, `.accent`, …), 1080×1350 portrait canvas.
- `shared/defs.svg.html` — reusable SVG defs: the walking-silhouette figure
  (original artwork, not a stock photo), the Wesync infinity brand mark, and
  the grain-noise filter. Referenced via `<use href="#id"/>`.
- `shared/assets/product-screenshot.png` — a real screenshot of the live app
  (Overview page, demo/mock-mode account), used in post 05.
- `posts/0N-*.html` — one file per post body (just the `.canvas` div).
- `render.cjs` — wraps each post with the shared head/fonts/defs and
  screenshots it to `output/0N-*.png` at 1080×1350 via Playwright.
- `output/` — rendered PNGs (git-ignored: `output/_tmp/` only, the final PNGs
  are committed).

## The 6-post campaign

01. **Brand Statement** — cinematic hero, walking-silhouette backlit by warm glow.
02. **The Student Problem** — motion-streaked app-name chips conveying overwhelm.
03. **The Insight** — minimal single-word statement ("وحدة").
04. **The Vision** — scattered nodes converging into the brand mark.
05. **Product Feature** — real product screenshot in a floating browser frame.
06. **Brand Invitation** — minimal closing CTA.

## Preview / regenerate

Needs Node + Playwright with a Chromium build available locally
(`npx playwright install chromium` if you don't already have one).

```bash
cd marketing/instagram-campaign
node render.cjs                       # renders all posts in posts/
node render.cjs 03-the-insight.html   # renders just one
```

## Adding a new post

1. Create `posts/07-your-post.html` containing just a `<div class="canvas">…</div>`
   fragment — reuse `.kicker`, `.accent`, `.footer-line`, `.brand-sig` from
   `shared/tokens.css`, and `<use href="#walker"/>` / `<use href="#mark"/>` from
   `shared/defs.svg.html` for on-brand figures/logo.
2. Run `node render.cjs 07-your-post.html`.
3. Check `output/07-your-post.png`.

## Regenerating the product screenshot (post 05)

The screenshot was captured by running the app locally in mock/demo mode
(no Supabase env vars → falls back to the built-in demo account) and logging
in with a demo credential from `src/data/mockData.ts`, then screenshotting
the Overview hero card. See the git history of this folder for the capture
script if you need to redo it with a different page/state.
