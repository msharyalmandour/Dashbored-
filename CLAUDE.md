# Wesync — notes for Claude

- Reply to the owner in Saudi-dialect Arabic; use they/them for unknown pronouns.
- Marketing/ad visuals follow `marketing/AD_STYLE.md`: **one fixed identity** — Obsidian × Ember
  (black `#080808`, orange `#ff6a00`/`#ff8a24`/`#ffb547`, Tajawal) taken from the site itself. Owner decided
  (2026-10-01) it must never change: no cobalt blue, no meadow/green, no per-post style switching.
- Existing Instagram posts workspace: `marketing/instagram-campaign/`.
- Arabic text in generated media must be rendered by our own pipeline (Playwright +
  local font opened via `file://`), never by the image/video model.
- Don't push to `main` directly; PRs only when the owner asks.
- Long-term goals (Wesync Meet vs Zoom/Teams, wow features, 10 usability ideas) live
  in `docs/ROADMAP.md` — owner asked to keep them (2026-10-01). Proposals only, except Wesync Meet:
  owner decided 2026-11-12 to build it now on LiveKit, transcript only (no video recording) in v1.
- Wesync Meet big plan + exact status is saved in `docs/ROADMAP.md` («Wesync Meet الكبير»). Owner paused it
  2026-11-27 and said we WILL come back: next is the supervisor joining the call (A6), then A2–A5.
- Product/pricing/marketing decisions follow the owner's validation rule (2026-10-27): pick a precise
  user segment → find the problem that recurs for them → test the fix with real users → measure
  **repeat usage** (weekly active teams, members active per team, supervisor activity, actual payment),
  never compliments, likes, sign-up counts or "I'd pay" survey answers alone.
- Release announcements (owner asked 2026-11-27): after a user-facing release, insert a row into
  `public.app_updates` (title, lines[], closing) — the `app-updates` function (pg_cron every 10 min) posts it once as a
  Wesy card in every team chat and emails every member with email reminders on. Show the owner the text first.
