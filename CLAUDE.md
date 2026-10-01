# Wesync — notes for Claude

- Reply to the owner in Saudi-dialect Arabic; use they/them for unknown pronouns.
- Marketing/ad visuals must follow `marketing/AD_STYLE.md` (owner asked on
  2026-10-01): **A. Surreal Burnout** (humour: Arabic brush headline + English
  system-message line over a photoreal meadow scene with funny micro-details) and
  **B. Editorial Cobalt** (premium: cobalt-blue magazine look, one hero object,
  condensed caps headline in amber, tiny uppercase micro-copy, Arabic in caption).
- Existing Instagram posts workspace: `marketing/instagram-campaign/`.
- Arabic text in generated media must be rendered by our own pipeline (Playwright +
  local font opened via `file://`), never by the image/video model.
- Don't push to `main` directly; PRs only when the owner asks.
