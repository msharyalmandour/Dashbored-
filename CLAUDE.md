# Wesync — notes for Claude

- Reply to the owner in Saudi-dialect Arabic; use they/them for unknown pronouns.
- Marketing/ad visuals follow `marketing/AD_STYLE.md`: **one fixed identity** — Obsidian × Ember
  (black `#080808`, orange `#ff6a00`/`#ff8a24`/`#ffb547`, Tajawal) taken from the site itself. Owner decided
  (2026-10-01) it must never change: no cobalt blue, no meadow/green, no per-post style switching.
  Site redesign (owner approved 2026-11-28): big titles and big numbers use Amiri (gold gradient), everything else Tajawal;
  Wesy is always present (cartoon cutouts in `public/lux/wz-*.webp`); home = `src/components/home/LuxHome.tsx` (`lh-` classes),
  section scenes = `src/components/LuxSectionScene.tsx` + `src/styles/lux-global.css`. Canvas «كل الأقسام» holds the full design.
  Owner REVERSED the orange-only rule for the SITE on 2026-11-28 («نكسر الألوان», chose the bold Skillshare-like set): orange stays
  the brand/primary-button colour; each section has its own accent via `data-sec` → `--sec` (search purple #7B61FF, write mint #3ED6A0,
  collect yellow #FFC93C, supervisor pink #FF7AA8, chat #A08CFF, calendar #5EE0C0, team orange); home cards use `--c`. Dark background stays.
  Marketing visuals still follow AD_STYLE until the owner says otherwise.
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
- If wesyncapp.com shows an old page or nothing at all: first check the domain, not the cache. 2026-11-28 the site was
  down because the registrant email (ICANN) was never verified → Vercel suspended the domain (nameservers empty,
  "Couldn't resolve host name"); old visitors saw the service-worker copy. Check with Vercel get_domain /
  get_domain_contact_verification and Supabase net.http_get('https://wesyncapp.com/version.json').
