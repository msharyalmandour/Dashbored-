# Wesync · البرومنت الكامل (اللوقو + ويسي + كل الموقع)

> **طريقة الاستخدام:**
> 1. فك `wesync-complete-pack.zip` في جذر مستودع Wesync. بيطلع لك ثلاث مجلدات:
>    - `design-reference/`: كل الشاشات (HTML + JPG).
>    - `brand/`: اللوقو، وويسي، والستيكرات، وشخصية ويسي.
>    - `specs/`: البرومنتات الأصلية للرجوع لها.
> 2. افتح Claude Code بالمستودع، والصق هذا الملف كامل.
> 3. Claude Code يشتغل خطوة خطوة، وبعد كل خطوة يوقف ويرسل لك سكرين شوت. اكتب له «تمام كمّل» عشان يروح للخطوة اللي بعدها.
> 4. هذا الملف يلغي كل البرومنتات اللي قبله. لو تعارض مع ملف في `specs/`، هذا الملف هو الصح.

---

You are working on **Wesync** (wesyncapp.com): an Arabic-first (RTL) web app where nursing graduation-research teams (4 students each) run their whole research with their supervising doctor. Mobile 390 and desktop 1440.

This is the **complete build brief** in 3 parts and 30 steps:
- **Part A (1–4):** identity: the W logo, the character «ويسي», and the brand system.
- **Part B (5–19):** the product screens.
- **Part C (20–30):** the doors, Wesy's CEO office, the premium features, and growth.

## How to work
1. **First**, read the codebase. Map the existing pages, components, the Supabase schema, the upload pipeline («ارموا»), the agent, the chat and the doctor dashboard. Reply with a short map (≤15 lines) and wait for my OK.
2. **One step at a time.** After each step:
   - send screenshots at 1440 and 390, side by side with the reference screenshot;
   - give a 3-line summary of what changed;
   - then **stop and wait** for «تمام كمّل».
3. **Port the reference literally.**
   - Each screen has a `.html` (exact values) and a `.jpg` screenshot (how it must look).
   - Copy padding, radius, gradients, shadows, font sizes and the **Arabic copy word for word**.
   - Don't "improve" or invent anything.
4. **Reuse first.** Extend the existing components; don't fork them.
5. **Commit after each step** with the message `wesync: step N · <name>`.

## Global rules (every step)
- **Palette:**
  - background `#080808`;
  - orange `#FF6A00 → #FF9A3C`;
  - gold `#FFC777` for every done/opened state, **never green**;
  - cream `#F2EBE3` with ink `#160904` on it;
  - text `#E9D3B8`, muted `#ABA095`, error `#FF8A7A`.
  - No green or blue in the UI. The only exception is Wesy's national-day outfit.
- **One orange button per screen.** Everything else is dark glass or cream.
- **Glass:** gradient `rgba(255,240,225,.075→.025)` + a soft inner border + a deep shadow; radius 28px.
- **Arabic:**
  - Tajawal, `letter-spacing: 0`, **Western digits 0–9** everywhere.
  - Gradient headings (`background-clip:text`) need `padding-top:.2em`, otherwise the hamza gets clipped.
  - Friendly Saudi tone, never «يرجى» or «تم». Plural to students; female forms to the doctor.
  - Every page = a title + one line at most. No onboarding tours. Buttons are short verbs.
- **Accessibility:** text ≥12px; touch targets ≥44px; contrast ≥4.5:1; RTL first.
- **Motion:**
  - Every animation runs once. Nothing loops forever except loading indicators.
  - `prefers-reduced-motion` turns everything into a 200ms fade.
  - No confetti anywhere.
- **Safety and privacy:**
  - Wesy never writes the research for students. He suggests and organises.
  - Wesy never writes, sends or deletes anything before the user approves, and every action can be undone.
  - The doctor can never read «الفريق بس». Enforce this with RLS.
  - Share cards never show the research title or names.

## Build order
| Step | What | Reference |
| --- | --- | --- |
| 1 | The W logo | `brand/wesync-logo.js`, `brand/logo/` |
| 2 | «ويسي», the character + persona | `brand/wesy-real.js`, `brand/WESY-PERSONA.md`, `brand/wesy-demo.html` |
| 3 | Brand system (sound, phrase, moods, outfits, stickers, 404, celebration) | `brand/brand-kit-demo.html` |
| 4 | The agent becomes Wesy everywhere | — |
| 5–19 | Product screens (live-site fixes, «ارموا», library, agent, doctor, chat, groups, calendar, notifications, start, explain, drive) | `design-reference/hero/`, `drop2/`, `doctor/` |
| 20–30 | Doors, next card, Wesy's office, achievement card, doctor invite, premium features, ambassadors, growth loop | `design-reference/doors/` |

---

# Part A · Identity

## Step 1 · The W logo
1. **The mark:** `brand/wesync-logo.js` exports `WLogo`. The official variant is `variant:'wave'`: two waves that slide together into one rounded W (the «sync»).
   - Live: `new WLogo(el,{variant:'wave', color, bg, gold, state})`.
   - Static SVG: `WLogo.svg({variant:'wave', color, bg, tile:true})`.
   - Ready files are in `brand/logo/`: `w-wave-ink.svg`, `w-wave-cream.svg`, `app-icon-wave-{cream,ink,ember}.svg`.
2. **Replace the old logo everywhere:**
   - the sidebar (mark + «Wesync» in Tajawal 800);
   - favicon, PWA icons and the apple-touch icon, all from `app-icon-wave-cream.svg`;
   - the login page, the email header, and the OG image.
   - Delete the old orb, waves and pixel marks.
3. **States:**
   - `idle` = still.
   - `loading` = the two waves breathe apart and together. **This replaces every spinner**; skeletons stay.
   - `sync` = they lock into one W, with a gold flash once. Call `.play()` on big successes only.
4. **Rules:**
   - minimum size 20px;
   - clear space of half the mark's height;
   - on dark use the cream mark, on cream use the ink mark;
   - never stretch or recolour it outside the palette.

## Step 2 · «ويسي», the character
1. **Who he is:** a young Saudi researcher with a beard and moustache. He wears an orange-check shemagh, an agal, a white thobe and a black bisht with gold trim. He sits at his laptop, which carries the W logo, with a cup of qahwa beside him. He's the team's **CEO**: calm, organised, honest, and he asks before he acts. He's fun with students (smiles, winks, laughs) and formal with the doctor.
2. **The code:** `brand/wesy-real.js` exports `WesyReal`. His arms use 2-bone IK, so they bend like real arms.
   - **Official in-app config:** `{shemagh:'#FF6A00', confetti:false, settleAfter:8000}`.
     - `settleAfter` makes him go still after 8s of no interaction and wake on any input. This keeps the "no endless motion" rule.
     - Marketing assets may use the red shemagh `#C8102E`.
   - **Avatar:** `{crop:'head'}` inside a cream rounded square with a thin gold ring.
   - **Doctor's side:** always `{formal:true}` (no wink, no laugh).
   - **Methods:** `.set(state)`, `.tap()`, `.level(0..1)` for the mic, `.excited(bool)`, `.raise()` (one eyebrow), `.wake()`, `.destroy()`.
3. **States → real events:**

| state | when |
| --- | --- |
| `greet` | page open / first visit of the day |
| `idle` | nothing happening (smiles, sometimes winks or sips coffee) |
| `typing` | Wesy is summarising, sorting or writing a reply |
| `thinking` | waiting for the AI (strokes his beard) |
| `listening` | mic on; feed `.level()` |
| `success` | an action finished; the W on his laptop turns gold |
| `error` | something failed (hand on forehead) |
| `laugh` | a big milestone, or a student jokes with him |
| `wink` | signature: the last beat of every big success |
| `sleep` | 12s idle on a page where he's the focus |
| `yawn` | late night (00:00–05:00) |
| `deadline` | <24h before a deadline (with `outfit:'deadline'`) |
| `celebrate` | the team submits the final research (with `outfit:'grad'`) |

4. **Persona:** load `brand/WESY-PERSONA.md` as the agent's system prompt. Keep its never-rules exactly:
   - he never writes the research for them;
   - he never claims he did something he didn't;
   - he never criticises a teammate in front of others;
   - he never sends anything to the doctor without approval.
5. Check every state against `brand/wesy-demo.html`.

## Step 3 · Brand system
Copy the behaviour from `brand/brand-kit-demo.html`:
1. **Catchphrase:** «على نفس الموجة 〰️». Use it in the big-success toast, the share button and the final certificate.
2. **Sync sound:**
   - Copy `chime()` (WebAudio, no files).
   - Play it only together with `WLogo.play()` on big successes: a door opens, or the final submission.
   - Add a mute toggle in settings. Default: on.
3. **Moods by the student's local time:**
   - 05:00–11:00 → `outfit:'morning'` (coffee steam);
   - 00:00–05:00 → `yawn`, with «ناموا، أنا أكمل»;
   - <24h to any deadline → `outfit:'deadline'` + `deadline`.
4. **Outfits by date (from the server):**
   - national day (23 Sep) → `outfit:'national'`;
   - all of Ramadan → `outfit:'ramadan'`;
   - the team's final submission → `outfit:'grad'`.
5. **Grows with the team:** set `stage` from the team's progress:
   - 0 for 0–30%;
   - 2 for 30–70% (books);
   - 3 for 70–100% (books + gold trophy).
6. **Follows the pointer:** on the home office use `follow:true`. Hovering the submit button calls `excited(true)`; hovering a delete button calls `raise()`.
7. **404 page:** Wesy in `thinking` + «الصفحة ضاعت… زي المرجع اللي ما لقيناه» + one button «ارجع للرئيسية».
8. **Stickers:**
   - `brand/stickers/*.webp` (12 × 512px, transparent background).
   - Add a «شارك» page with «حمّلوها» and «أضيفوها للواتساب» (link to a sticker app or a direct download).

## Step 4 · The agent becomes Wesy everywhere
1. Rename «الوكيل» → «ويسي» in the UI, notifications, emails and routes (keep the old routes as redirects).
2. Replace every agent avatar, orb or icon with `WesyReal` (`crop:'head'` in small places).
3. The agent screens in Part B (step 11) keep their layout. Only the identity changes: Wesy's head for the avatar, his states for the progress, and the W `loading` for spinners.
4. On the doctor's side Wesy is always `formal:true`, and he addresses her as «د. [الاسم]» in female forms.

---

# Part B · Product screens

> **Note for all of Part B:** some reference screenshots still show the old orb/logo or the word «الوكيل». Build the layout as shown, but use the W logo (step 1) and Wesy (steps 2 and 4) wherever a logo or an agent appears.

## Step 5 · Fix the 12 issues from the live site (`FixList`)
Reference folder: `design-reference/hero/`

Do these first, because every later phase depends on them:
1. Clipped hamza on gradient headings (rule above).
2. `letter-spacing: 0` on all Arabic text.
3. Tasks table: give the title column `minmax(320px,1fr)`, render the title on one line with an ellipsis, and add `white-space: nowrap` to the pills. Today the title breaks one word per line and the «مكتبة الأدلة» pill breaks vertically.
4. Remove all green and use gold instead.
5. Show «5/5 خلصت · 4 منها بدون دليل» instead of «%100».
6. In the «مراجعة صارمة» section, the 4 white buttons become small gold links. «مهمة جديدة» stays the only orange button.
7. Delete the English subtitles from the Arabic UI: My Tasks, Today's focus, Team workload, Reminders.
8. Use Western digits only.
9. Add `nowrap` to the «اختاروا ملف» button.
10. The voice orb covers «باحث الأدبيات» at the bottom of the sidebar. Keep the orb inside the content area, at least 24px away from the sidebar.
11. Hide «المزيد» when it's empty, and remove the duplicate divider lines.
12. Show the Wesync logo in the sidebar only, not in the top bar as well.

## Step 6 · The «ارموا» hero (`HeroDrag` → `HeroAbsorb` → `HeroReveal` → `HeroLanded`, `HeroMotion`, mobile `HeroAbsorbM`, `HeroRevealM`)
Reference folder: `design-reference/hero/`

A full-screen hero that appears on **any page** as soon as a file enters the window.

**1. Drag over the window** (`HeroDrag`)
- Trigger: listen for `dragenter` on `window`, and only when `dataTransfer.types` includes `Files`.
- The backdrop is `rgba(7,4,3,.84)` with `backdrop-filter: blur(16px)`, plus an orange radial glow at the center.
- The open vessel is 540px wide, with ellipse rings and 6 destination chips around it.
- The dragged file cards follow the cursor, with a count badge.
- The headline «افلتوها هنا» is 84px.
- `Esc`, or the cursor leaving the window, closes the hero.

**2. Drop** (`HeroAbsorb`)
- The cards sink into the vessel along a curve (900ms), and the embers rise once.
- Show «نقرا اللي رميتوه…» with 3 steps tied to the **real** pipeline state: read → extract → place.
- Show a thin progress bar and a «إلغاء» button.

**3. Results** (`HeroReveal`)
- The vessel shrinks to the top. Gold lines draw from it to up to 4 result cards (reuse the existing result cards: toggle, «غيّروا المكان», confidence pill).
- A bottom bar holds «راجعوها وحدة وحدة» (glass) and «حطوها بأماكنها» (the only orange button).

**4. Placed** (`HeroLanded`)
- The overlay fades out. Gold lines fly to the sidebar items.
- Each destination item gets a `+N` badge that pings twice.
- A toast says «انحطت 4 أشياء بأماكنها» and has an «تراجع» button that does a real undo.

**On mobile**, the same flow opens from the share sheet, a paste, or the «ارموا» tab, and the results cards stack vertically.

Take every timing from `HeroMotion`.

## Step 7 · «ارموا أي شي» page (`DropPage`, `DropPageM`)
Reference folder: `design-reference/drop2/`

**Delete these:**
- the «ملف، صورة، رسالة، رابط» kicker;
- the «اسحبوا الملفات هنا» paragraph;
- the dashed drop box;
- the whole «وش نقدر نرتب؟» chip cloud;
- the big «آخر اللي رميتوه» card.

**The page becomes one centered stage:**
- The 430px vessel (`hover` state) with an orange radial glow and 10 embers.
- 3 ellipse rings (one gold gradient stroke, two faint).
- **6 destination chips orbiting the vessel**: المكتبة / مهام / محضر / المشرفة / التقويم / المقترح.
  - Each chip is 124×48, glass, with a gold icon.
  - Each chip is joined to the vessel by a faint dashed curve.
  - **These chips replace the chip cloud.**
- The headline «ارموا أي شي» (88px gradient, `padding-top: .2em` so the hamza isn't clipped).
- Under it, a single line: «ونحن نرتبها».
- Buttons:
  - «اختاروا ملف» (orange, 60px, `nowrap`);
  - «صوّروا» and «رابط» (glass);
  - a small hint: «أو اسحبوها لأي مكان · Ctrl V».
- At the bottom, one pill for the last drop: «✓ موعد مع الدكتورة ← التقويم · قبل ساعتين · تراجع».
- A round «؟» help button top-left (it opens the page-help sheet).

**Mobile:**
- The same stage at 280px, with only 4 chips on the upper arc.
- The headline at 54px.
- A full-width orange «اختاروا ملف», plus 3 glass buttons (صوّروا / رابط / الصقوا).

## Step 8 · Entrance motion (`DropEnter`)
Reference folder: `design-reference/drop2/`

Plays every time the user enters the section, but not again if they come back within 10 minutes. 1.1s total:

| Time | What happens |
| --- | --- |
| 0ms | The stage is empty. The vessel sits 60px lower at scale .8 with `blur(10px)`. |
| 0–300ms | The vessel rises and sharpens. The rings draw themselves with `stroke-dashoffset`. |
| 250–700ms | The 6 chips fly in from near the vessel to their orbit positions, 60ms apart, using `cubic-bezier(.2,.9,.2,1)`. The dashed lines draw in. |
| 700–1100ms | The headline rises from 18px below while its blur goes from 6px to 0, followed by the buttons and the recent pill. The embers rise once. |

- «اختاروا ملف» is clickable from the first frame.
- Dragging a file over the page triggers the existing full-screen drop hero.
- No infinite animations.
- `prefers-reduced-motion`: show the final state instantly.

## Step 9 · «مكتبة الأدلة» (`LibLux`, `LibEmpty`)
Reference folder: `design-reference/drop2/`

- **Header:** «مكتبة الأدلة» plus one count line («12 دراسة · 9 منها بالجدول»), with the segment الوكيل / البحث / المكتبة / المراجعة on the left.
- **Replace the long drop box and the whole «المراجع: استيراد وتصدير وفحص» card** with one 120px slot:
  - a 140px vessel;
  - «ارموا الدراسة هنا» with «ونعبّي الجدول لحاله» under it;
  - «استيراد Zotero» (glass), which opens the BibTeX/RIS import in a sheet;
  - «اختاروا PDF» (orange, the only orange button on the page).
- Remove the separate orange «أضف دراسة».
- **Filters:** a segmented control with counts, plus search.
- **Study cards**, 3 per row. Each card has:
  - an axis pill (gold) and the year;
  - the English title;
  - country · design · sample;
  - «✓ بالجدول» in gold, or «ناقص ملخّص».
- **Empty library:** a hero instead of the grid: a 320px vessel, «ارموا دراساتكم», «ونعبّي الجدول لحاله», and the 2 buttons, with the same entrance motion.

## Step 10 · Premium pages (`HomeLux`, `TasksLux`, `MeetLux`)
Reference folder: `design-reference/hero/`

- **Home:** the «ارموا» strip becomes a 150px portal with the vessel, the file-type chips, and the hint «اسحبوها لأي مكان بالموقع · Ctrl V».
- **Tasks:**
  - A KPI band with the 5/5 ring, «تحتاج دليل», «متأخرة» and «موعد التسليم».
  - A real grid table with the columns المهمة / مين / الموعد / الحالة.
  - A filters segment with counts.
  - Below the table, «قبل لا تشوفها الدكتورة» and «حمل الفريق» side by side.
- **Meetings:**
  - A cinematic hero (`assets/pen_hero.jpg`) with the next meeting, a countdown, and «ابدأوا محضر جديد» as the orange button.
  - A readiness band of 3 progress cells.
  - The minutes list with big gold numbers and «معتمد» / «ينتظر الدكتورة» pills.
  - «قرارات للمشرفة» and «درايف الفريق مربوط».

## Step 11 · The agent, rebuilt (`AgentWhy`, `AgentNowM`, `AgentListenM`, `AgentPlanM`, `AgentNowD`, `AgentPlanD`, `AgentDoneD`)
Reference folder: `design-reference/hero/`

Read `AgentWhy` first: it lists the 8 problems with today's agent. The new agent follows one loop: **knows → proposes → you approve → it acts → receipt + undo.**

**One entry point**
- Delete the «الوكيل» tab inside «أبحث». Delete the «الوكيل ينفّذ / الكوتش» toggle.
- The orb button and `Ctrl K` open the same panel from any page: a 520px panel on desktop (on the side away from the sidebar) and a full screen on mobile.

**Opening state** (`AgentNowD`, `AgentNowM`)
- The header says «يعرف بحثكم · ما يسوي شي بدون موافقتكم».
- Below it, context chips showing the topic, the proposal %, the team, and the next meeting.
- Then «يحتاجكم الحين»: up to 3 cards generated from the team's real data. Each card shows the problem, a ready-made fix pill, and **one** button.
- On mobile, follow the reference style: a full orange gradient at the top, dark text, the big «وش نخلّص اليوم؟», and swipeable cards.

**Composer**
- It has a + button, context chips (@a person, @a section, «+2» for more), a mic button, and a send button.
- A glowing light-streak SVG sits inside the composer. Copy it from `streak()` in the HTML.
- The send button is grey while the field is empty and turns orange as soon as there's text.

**Listening** (`AgentListenM`)
- A big orb, the live transcript (the confirmed part solid, the pending part dimmer), the streak, and the pause, mic, and send buttons.

**Plan** (`AgentPlanD`, `AgentPlanM`)
- Every action that writes, sends, or deletes returns a **plan card**.
- Each row has a toggle, an owner, and a due date. The card has a «ليش كذا؟» explanation, plus «عدّلوا» (glass) and «وافقوا وسوّوها» (orange).
- Nothing is saved before approval. Show the pill «ما انحفظ شي للحين».

**Receipt** (`AgentDoneD`)
- After it runs, show what changed with links to each place, «تراجع» (it works for 24 hours), and 2 suggestions for what's next.
- Log every agent action in `agent_actions`: who approved it, the diff, and the undo payload.

## Step 12 · Doctor home (`DocHome2`, `DocHomeM2`)
Reference folder: `design-reference/doctor/`

**Sidebar**
- 5 items: الرئيسية / المحادثات (unread badge) / المواعيد (pending-request badge) / فرقي / المحاضر.
- A «ساعات مكتبك» card, and the doctor's profile at the bottom.

**Header**
- Greeting plus the doctor's name (60px gradient).
- One plain-language line built from the data, e.g. «فريقين ماشين، وفريق يحتاجك شوي».
- A «متاحة اليوم» pill and the bell.

**«3 أشياء تنتظرك أنتِ» (the orange strip)**
- At most 3 tiles. Each shows its icon, what it is, the team, and one verb («وافقي أو اقترحي يوم»).
- The data comes from extension requests, minutes waiting for approval, and questions unanswered for more than 48 hours.

**«يومك»**
- Today's events as 3 tiles. The next one is cream with a «بعد 12 دقيقة» chip. Plus a «كل المواعيد» link.

**Team cards**
- Order them by need: late → needs a push → fine.
- Each card has:
  - a progress ring (by evidence) in the status colour;
  - the team's status: «ماشين تمام» (gold), «يحتاجون دفعة» (#FFB65C) or «متأخرين شوي» (#FF9A7A);
  - one reason sentence;
  - the last message with its unread count;
  - «كلّميهم» (cream) and «افتحي البحث» (glass).
- Compute the status from progress against the deadline plus how long it's been since the team's last reply.

**Mobile:** the same order, plus a bottom tab bar with 4 tabs.

## Step 13 · Chat instead of email (`DocChat`)
Reference folder: `design-reference/doctor/`

**Layout**
- A conversation list on the right: one thread per team, plus «كل فرقي (إعلان)» to broadcast to all teams.
- Search, and a note that this replaces email.

**Thread header**
- The team's avatars, «ريان يكتب…» when someone is typing, and shortcuts to «موعد» and «بحثهم».

**Messages**
- The doctor's messages are orange bubbles. Students' messages are glass bubbles.
- Under each doctor message, show a read receipt: «قراها 4 من 4».

**Composer mode** (a segmented control):
- **رسالة**: a normal message.
- **طلب = مهمة**: the message also creates a task. The doctor picks the student and the due date, and a gold «صار مهمة» card is attached to the bubble.
- **موعد**: creates a meeting card inside the chat with the date, time, place and duration. It's added to the team's calendar automatically, and shows each student's RSVP chip (✓ or «ما رد»).
- **اعتماد**: picks minutes or a file to approve.

**Also in the chat**
- Quick replies («تمام، كملوا 👍», «نتكلم فيه بالاجتماع»).
- Attachments that show as file cards.
- Voice notes that show as a waveform bubble with a duration.

**Tech:** realtime with Supabase Realtime or the existing channel.
- Store messages in `messages(team_id, sender_id, kind[text|request|meeting|approval|voice|file], payload jsonb, created_at)`.
- Store read receipts in `message_reads`.

## Step 14 · Two separate groups for students (`GroupsIntro`, `ChatWithDoc`, `ChatTeamOnly`, `ChatGuard`, `ChatDocM`, `ChatTeamM`)
Reference folder: `design-reference/doctor/`

Every team has **two chats**, and a student must never confuse them:
- **«مع الدكتورة»**: the doctor plus the 4 students. This is the same thread the doctor sees in Phase 2.
- **«الفريق بس»**: the 4 students only. The doctor can **never** read it. Enforce this with RLS, not just the UI.

**Look completely different**
- **«مع الدكتورة»** uses a warm cream identity:
  - The panel has a `rgba(255,226,190,.28)` outline.
  - The tab shows the doctor's avatar.
  - The doctor's bubbles are cream (`linear-gradient(160deg,#FFF0E0,#E9C9A0)`).
  - The send button is orange, labelled «أرسلوا للدكتورة».
  - Under each sent message: «👁 شافتها الدكتورة».
- **«الفريق بس»** uses a dark glass identity:
  - A lock icon everywhere.
  - The student's own bubbles are translucent orange.
  - The send button is cream, labelled «أرسلوا».
  - Under each sent message: «🔒 للفريق بس».

**Always visible**
- A two-tab switcher at the top. Each tab has a subtitle («د. إسراء تشوف كل شي» / «خاص · الدكتورة ما تشوفه») and an unread badge.
- A banner at the top of each thread.
- A label above the composer saying who will receive the message: «ترسلون لـ د. إسراء والفريق» / «ترسلون للفريق بس · الدكتورة ما تشوف».

**First time** (`GroupsIntro`)
- The first time a student opens the chat, show the explainer once: two columns with what belongs in each group, and the «فهمنا» button.
- Store that it was dismissed per user.

**Wrong-group guard** (`ChatGuard`)
- Before sending in «مع الدكتورة», run a light check.
- Show the confirm dialog «د. إسراء بتشوف هذي الرسالة» when either:
  - the message looks casual or internal (laughing, emojis like 😂, or slang aimed at teammates); or
  - it mentions the doctor in the third person («الدكتورة نست…»).
- Its buttons are «أرسلوها للفريق بس» (orange) and «لا، للدكتورة».
- Any message sent to the doctor's group can be deleted for 2 minutes.

**Move a message to the doctor**
- Long-press any message in «الفريق بس» and choose «انقلوها للدكتورة». Always confirm before sending.

**Notifications:** pushes say which group they came from, e.g. «🔒 الفريق بس · ريان» vs «د. إسراء · مع الدكتورة».

## Step 15 · All appointments (`DocCal`)
Reference folder: `design-reference/doctor/`

**The week view**
- Mon–Thu plus Sunday, 8:00–15:00, merging every source:
  - team meetings (orange);
  - office hours (gold outline);
  - deadlines (a card with a gold inline-start bar);
  - meeting requests (a hatched gold card).
- Show a legend.

**Meeting requests** (the side card)
- Students book office hours or request a meeting. The card shows the team, the reason quoted in their words, the requested slot with «فاضية ✓», and the buttons «وافقي» (orange) and «اقترحي وقت ثاني».
- Approving creates the meeting card in the team chat.

**Below that:** «التسليمات الجاية».

**Office hours:** editable from the sidebar card. Students see the free slots to book.

## Step 16 · Student notifications (`StudToast`, `StudNotif`, `StudLockM`)
Reference folder: `design-reference/doctor/`

**Triggers**
- The doctor sends a message.
- The doctor sets or changes a meeting.
- A doctor request becomes a task.
- The doctor approves the minutes.
- The doctor accepts or rejects an extension.

**In-app banner** (`StudToast`)
- When a meeting is set, show a banner at the top of the student's current page with «نحضر ✓» (orange) and «اقترحوا وقت».
- The RSVP updates the chip in the doctor's meeting card.

**Notification centre** (`StudNotif`)
- A sheet from the bell, grouped into «اليوم» and «أمس».
- Filters: الكل / من الدكتورة / المواعيد.
- Each row shows the doctor's avatar with a small kind badge.
- Meeting rows include the RSVP buttons, and message rows include «ردّوا عليها».
- Unread rows show an orange dot.

**Push** (`StudLockM`)
- Web Push (a service worker plus VAPID), and native push later. Messages from the doctor are high priority.
- Copy:
  - «د. إسراء حطت موعد اجتماع 📅» with the actions «نحضر ✓ / أضيفوه للتقويم» (`.ics`);
  - «د. إسراء ردّت عليكم» with a quote preview and «ردّوا».
- Never push more than 1 notification per minute per team. Group the rest.

## Step 17 · «بدأتوا قبل؟», for teams that already started (`StartChoice`, `StartBring`, `StartResult`, `StartM`)
Reference folder: `design-reference/hero/`

Many teams join halfway through their research, so onboarding must not force them to start from zero.

**Step 1 · Choose a stage** (`StartChoice`)
- Ask «وين وصلتوا؟» with 4 options:
  - topic only;
  - part of the proposal written;
  - proposal done, waiting for ethics;
  - collecting data.
- Save the answer as `team.stage` and use it to pick the first screen and which journey steps are already done.
- The «لسه ما بدأنا» link goes to the normal onboarding.

**Step 2 · Bring your work** (`StartBring`)
Accept 4 sources:
- the proposal file (.docx or .pdf), split into sections by heading;
- the studies they collected, which fill the evidence library and the literature table;
- a WhatsApp chat export, which becomes tasks and the doctor's requests;
- their Drive folder, linked instead of re-uploaded.

Everything goes through the existing «ارموا» pipeline, and the user reviews before anything is saved.

**Step 3 · Your research** (`StartResult`)
- Show what we found: each section with its owner and % progress, and the overall %.
- Show the next 3 things to do.
- The main button is «ودّونا لبحثنا».

The core rule: **every completed step they bring counts as done with proof** (the file is the proof).

## Step 18 · «وش هذا المكان؟», for students who don't understand the site (`ExplainD`, `ExplainM`, `PageHelp`)
Reference folder: `design-reference/hero/`

**The explainer page**
- Show it automatically on the first visit, and link it from the sidebar.
- It has a hero line: «Wesync هو مكان بحثكم كله · أنتم تشتغلون، واحنا نرتب».
- Below that, 6 numbered zone cards in the order a team works through them. Each card has one line saying what it is and one real example.
- Add a «القاعدة الوحيدة: كل شي بدليل» strip.
- Add a «وريني جولة 60 ثانية» button that starts the existing learn/coach tour.

**Page help** (`PageHelp`)
- Add a **«؟» button in the header of every page**. It opens a 420px side sheet titled «وش هذي الصفحة؟».
- The sheet shows the page name, one sentence explaining it, 3 numbered «what the symbols mean» rows, and «ورّوني بنفسي (30 ثانية)».
- Write the content for each page in `content/page-help.ar.json`. Don't hardcode it.

## Step 19 · Drive, and who's connected, including the doctor (`DriveD`, `DriveInviteM`)
Reference folder: `design-reference/hero/`

**Data**
- Use the Google Drive API to create one shared folder per team with the 6 subfolders shown (`01 المقترح` … `06 المحاضر`).
- Store, per member, a `drive_status` of `connected | invited | missing_email | view_only`, plus `last_sync_at`.
- Re-check the folder permissions every hour and whenever someone opens the page.
- The doctor gets `view_only` (reader + commenter) by default. Leaders can change it.

**The page**
- A hero with a ring showing «3 من 5 مربوطين», a sentence naming exactly who is missing and why, and the orange «أرسلوا رابط الربط للباقين» button, which opens a WhatsApp share of the invite link.
- A row per person: avatar, role, status pill, and one action:
  - «ذكّروه بالواتساب» if they're invited but haven't opened the invite;
  - «أضيفوا إيميله» if their email is missing;
  - «غيّروا الصلاحية» for the doctor.
- The folder structure with file counts, and a short note explaining why the doctor is «تشوف بس».

**The invite** (`DriveInviteM`)
- One screen with Google sign-in that requests only the scope it needs (`drive.file`).
- The copy promises that we only access the research folder, and shows how many teammates already connected.

**Home and meetings:** surface a gold warning strip until the team reaches 5 of 5 connected.

---


---

# Part C · Doors, Wesy's office, premium features, growth

References live in `design-reference/doors/` (JPG + `.dc.html` for each screen):

| الملف | وش فيه |
| --- | --- |
| DoorRail · DoorHomeD · DoorHomeM · DoorMoreM | القائمة اللي تكبر (كمبيوتر + جوال + المزيد) |
| DoorOpen · CeoDoorOpen · DoorMotionSpec | لحظة الانفتاح + مواصفات الحركة |
| DoorToastD · DoorToastM · CeoToastM | كبسولة الإشعار |
| NextCardsD · NextCardsM · CeoStates | كرت «الجاي لكم» بكل الحالات |
| CeoHomeD · CeoHomeM | مكتب ويسي في الرئيسية |
| AchStory · CeoStory · AchShareM | بطاقة الإنجاز + نافذة المشاركة |
| SupInvite · CeoSupInvite · B03DocOffice | لوحة الدكتورة + الدعوة + ملخص الخميس |
| B01 … B06 | المميزات الفخمة 1–6 |
| B08AmbassadorM · B11Loop | السفراء + حلقة النمو |

## Step 20 · نظام الأبواب (البيانات)

1. سوّ جدول `doors` لكل فريق، وكل صف فيه: `key` و`unlocked_at` و`seen_at`.
2. هذي الأبواب وشروط فتحها (فحص في السيرفر بعد كل حدث):

| key | الاسم | ينفتح لما |
| --- | --- | --- |
| home, chat, team, search | الرئيسية، المحادثة، الفريق، أبحث | مفتوحة من أول يوم |
| write | أكتب (المقترح) | أول دراسة تنحفظ |
| method | المنهجية والأخلاقيات | أول قسم مكتوب |
| supervisor | المشرفة | إيميل الدكتورة أو أول اجتماع أو أول قسم |
| calendar | التقويم والملفات | أول موعد أو أول ملف |
| analyze | أجمع وأحلل | المنهجية جاهزة (4 من 7) |

3. سوّ دالة `unlockDoor(teamId, key)`. تسجّل التاريخ، وتطلق حدث `door.unlocked`، وتنشئ «إيصال» (Step 28).
4. خلّ الفتح idempotent: لو الباب مفتوح من قبل، الدالة ما تسوي شي.

## Step 21 · القائمة اللي تكبر

1. **الكمبيوتر:** شريط جانبي على اليمين بعرض 276px. اتبع `DoorRail`.
   - فوق: الأبواب الأربعة الأساسية.
   - تحتها فاصل، وبعده الأبواب اللي انفتحت.
   - تحت آخر باب مفتوح يبان **باب واحد بس**:
     - شفافيته 45%، وجنبه قفل ذهبي.
     - تحته سطر «ينفتح لما…» بالخافت الكامل.
   - الأبواب الباقية ما تبان.
   - تحت الشريط رابط هادي «كل الأبواب».
2. **الجوال:** شريط سفلي فيه 5 أزرار: الرئيسية، المحادثة، الفريق، أبحث، المزيد.
   - على «المزيد» نقطة ذهبية لما ينفتح باب ما شافوه (`seen_at = null`).
   - صفحة «المزيد» زي `DoorMoreM`: الأبواب المفتوحة، والباب الجاي مقفول، و«كل الأبواب».
3. صفحة «كل الأبواب»: قائمة الأبواب كلها، والمقفولة فيها شرط فتحها.

## Step 22 · لحظة الانفتاح (1.4 ثانية، مرة وحدة لكل باب)

1. تشتغل أول مرة يشوف فيها الطالب الباب بعد ما انفتح، وبعدها سجّل `seen_at`.
2. التوقيت والمنحنيات بالضبط من `DoorMotionSpec`:

| الحركة | تبدأ | المدة | المنحنى |
| --- | --- | --- | --- |
| القفل يدور ربع لفة | 0 | 280ms | `cubic-bezier(.3,0,.2,1)` |
| القفل ينفك ويختفي | 200ms | 280ms | `cubic-bezier(.2,.8,.2,1)` |
| خط ذهبي على حافة الكبسولة | 300ms | 700ms | `cubic-bezier(.65,0,.35,1)` |
| الأيقونة والاسم يكتملون (opacity .45→1) | 700ms | 450ms | `cubic-bezier(.2,.8,.2,1)` |
| نبضة 1→1.03→1 | 1100ms | 300ms | `cubic-bezier(.3,1.2,.5,1)` |

3. الخط الذهبي: SVG rect مع `pathLength=100` وتحريك `stroke-dashoffset` من 100 لـ 0.
4. بدون صوت. نبضة اهتزاز خفيفة وحدة اختيارية: `navigator.vibrate?.(12)` عند 1100ms.
5. **نسخة ويسي** (`CeoDoorOpen`): في مكتب الرئيسية ويسي يطلع المفتاح الذهبي بنفس اللحظة. استخدم `state:'wink'` وارسم المفتاح عند يده زي المرجع.

## Step 23 · كبسولة الإشعار

1. تنزل من فوق عند 1200ms: `translateY(-16px→0)` + opacity، مدتها 420ms، بمنحنى `cubic-bezier(.2,.9,.25,1)`.
2. فيها:
   - صورة راس ويسي: `WesyReal` مع `crop:'head'` داخل مربع كريمي.
   - العنوان «ويسي فتح لكم: **المقترح**»، والكلمة الأخيرة بالذهبي.
   - سطر واحد.
   - زرين: «افتحوه» (كريمي، مو برتقالي) و«شاركوها» (زجاج).
3. تحتها شريط ذهبي يقصر خلال 6 ثواني، وبعدها تختفي بـ 260ms.
4. لو الطالب مرر الماوس عليها أو لمسها، المؤقت يوقف.
5. `role="status"` و`aria-live="polite"`.

## Step 24 · كرت «الجاي لكم»

1. هو أول شي في الرئيسية، داخل مكتب ويسي (Step 25).
2. محتواه:
   - فوق: «الجاي لكم» بالذهبي + «3 من 10».
   - عنوان بسطر واحد، وسطر خافت يقول ليش.
   - زر برتقالي واحد يودّي للمكان بالضبط.
   - تحت: 10 نقاط. المنجز ذهبي، والحالي برتقالي ينبض مرة وحدة.
3. الحالات (المرجع `NextCardsD`/`NextCardsM`/`CeoStates`):

| الحالة | الشكل | ويسي |
| --- | --- | --- |
| يوم أول | حقل «وش موضوع بحثكم؟» داخل الكرت + «ابدأوا» | `greet`: «هلا والله! وش موضوع بحثكم؟» |
| منتصف | خطوة + زر برتقالي | `typing`: «جهزت لكم المكان، بس اكتبوا.» |
| ينتظرون الدكتورة | كرت **كريمي** بدون زر برتقالي | يشرب قهوة: «الكرة عند د. إسراء. ارتاحوا ☕» |
| خلص كل شي | كل النقاط ذهبية + «سوّوا بطاقة الإنجاز» | `success`: «فخور فيكم.» |
| تحميل | skeleton بلمعان (الحركة الوحيدة اللي تتكرر) | `thinking`: «لحظة، أرتّب أوراقكم…» |

4. بعد ما تخلص الخطوة:
   - «تم ✓» بالذهبي لمدة ثانية.
   - بعدها cross-fade مدته 400ms بمنحنى `cubic-bezier(.4,0,.2,1)`، والكرت الجديد يرتفع 6px.
5. الخطوات العشر: الموضوع، أول دراسة، سؤال البحث، المقترح، موافقة المشرفة، المنهجية، الأخلاقيات، جمع البيانات، التحليل، التسليم.

## Step 25 · مكتب ويسي في الرئيسية (CEO)

1. اتبع `CeoHomeD` و`CeoHomeM`. عنوان الصفحة «مكتب ويسي».
2. سوّ المشهد كمكوّن `<WesyOffice>`، وطبقاته:
   - **الخلفية:** تدرج داكن دافي.
   - **الشباك:** وراه سما غروب برتقالية، وأفق الرياض فيه برج المملكة، كله SVG.
   - **المكتبة:** كتب بألوان الهوية (على الكمبيوتر بس).
   - **الإضاءة:** هالة لمبة دافية.
   - **ويسي:** `WesyReal` جالس قدام لابتوبه، وعلى اللابتوب لوقو W.
   - **المكتب:** خشب داكن، وعليه لوحة ذهبية «ويسي · الرئيس التنفيذي».
3. ويسي في التطبيق: `shemagh:'#FF6A00'` (برتقالي الهوية).
4. فقاعة كلام قصيرة من ويسي فوق الكرت، مثل «عندي لكم خطوة وحدة اليوم 👇».
5. كرت «الجاي لكم» فوق المشهد بخلفية صلبة `#100906` عشان يتقرا:
   - الكمبيوتر: على يسار المشهد.
   - الجوال: تحت المشهد، ويطلع عليه شوي.
6. ويسي يتحرك مرة وحدة لما تفتح الصفحة، وبعدها يوقف، ما تتكرر الحركة للأبد. الحالة حسب الكرت (الجدول فوق).

## Step 26 · بطاقة الإنجاز للستوري (1080×1920)

1. ولّدها صورة PNG في السيرفر من قالب HTML (مثلاً Playwright أو Satori). اتبع `AchStory` و`CeoStory`.
2. محتواها:
   - أسود مع توهّج برتقالي.
   - ختم ذهبي فيه علامة صح.
   - «إنجاز جديد» وعنوان كبير، مثل «خلّصنا المقترح».
   - «الخطوة 4 من 10» ورحلة الـ10 نقاط.
   - «معتمد من ويسي · الرئيس التنفيذي» مع راسه.
   - تحت: `wesyncapp.com`.
3. **ممنوع** عنوان البحث وأسماء الطلاب في الصورة.
4. نافذة المشاركة (`AchShareM`):
   - معاينة البطاقة.
   - «شاركوها» (برتقالي): `navigator.share({files:[png]})`، ولو المتصفح ما يدعمها نزّل الصورة.
   - «حمّلوها» (زجاج).
5. الرابط في البطاقة يحمل كود الفريق: `wesyncapp.com/?r=TEAMCODE`، عشان حلقة النمو (Step 30).

## Step 27 · لوحة الدكتورة

1. **ويسي الرسمي:** `formal:true`، وما يغمز ولا يضحك. لوحته «ويسي · مساعد د. [الاسم]».
2. **كرت «عندك فرق ثانية؟»** (`SupInvite`):
   - «أرسليها واتساب» (برتقالي): `https://wa.me/?text=` + الرسالة الجاهزة encoded.
   - «انسخي الرابط» (زجاج).
   - الرسالة الجاهزة بصوت الدكتورة: «هلا 👋 أتابع بحوث التخرج على Wesync، وأرد عليكم من هناك أسرع. سجّلوا فريقكم من الرابط، وتطلعون عندي مباشرة: wesyncapp.com/j/[كود الدكتورة]».
   - الرابط `/j/:code` يربط الفريق الجديد بالدكتورة تلقائياً.
3. **ملخص الخميس** (`B03DocOffice`):
   - مهمة مجدولة كل خميس الساعة 16:00 بتوقيت `Asia/Riyadh`.
   - فيه تقدم كل فريق بالنسبة وتغيّره خلال الأسبوع، والطلبات اللي تنتظرها.
   - يوصلها داخل التطبيق وبالإيميل.

## Step 28 · المميزات الفخمة 1–6

1. **ويسي يحس بالموسم** (`B01Seasons`):
   - جدول `academic_calendar` فيه: الكلية، الحدث (اختبار، تدريب ميداني، تسليم)، والتاريخ. الفريق يقدر يعدّله.
   - حسب أقرب حدث يتغير ثلاث أشياء: حالة ويسي، وجملته، وعدد المهام المقترحة.
     - **أسبوع الاختبار:** مهام أقل، و`thinking`.
     - **أسبوع التدريب:** تذكير واحد بالليل.
     - **آخر 24 ساعة قبل التسليم:** المكتب يظلم، و`outfit:'deadline'`.
2. **الإيصال الذهبي** (`B02Receipt`):
   - مع كل باب ينفتح ينحفظ إيصال فيه: الباب، والخطوة، والتاريخ، والفريق، والمدة.
   - زر «نزّلوا سجل الرحلة» يولّد PDF فيه كل الإيصالات.
   - الإيصال داخلي، فيقدر يكون فيه اسم الفريق.
3. **مكتب الدكتورة:** الخطوة 8.
4. **ختم الأصالة** (`B04Seal`):
   - مع كل تعديل في المحرر سجّل مصدر النص. خيارين بس:
     - `human`: كتبه الطالب بنفسه.
     - `ai_suggestion_edited`: اقتراح من ويسي والطالب قبله وعدّله.
   - احسب النسبة لكل قسم من عدد الحروف.
   - النتيجة يشوفها الفريق والمشرفة بس.
   - لا تعرض النسبة على إنها «كشف ذكاء اصطناعي». هي سجل مين كتب وش.
5. **صوت ويسي الصباحي** (`B05VoiceM`):
   - ملاحظة صوتية 10–20 ثانية الساعة 7:30، بنص قصير عن خطوة اليوم.
   - تتولد بخدمة تحويل نص لصوت عربية، ويكون فيه خيار «اقرأوه بس».
   - الطالب يقدر يطفيها من الإعدادات.
6. **شارة المؤسسين** (`B06Founders`):
   - أول 100 فريق يسجلون ياخذون `founder_number` من 1 لـ 100.
   - العداد يقرأ الرقم الحقيقي من قاعدة البيانات. **ممنوع رقم وهمي.**
   - الشارة تطلع في ثلاث أماكن: صفحة الفريق، والإيصالات، وبطاقة الإنجاز.

## Step 29 · السفراء والإحالات

1. **صفحة السفير** (`B08AmbassadorM`):
   - كود خاص مثل `MSHARY-KAU`.
   - زر «شارك الكود».
   - كم فريق جاب، وكم شهر مجاني ربح.
   - ترتيب الكليات هالشهر.
2. **جداول البيانات:**
   - `referral_codes`: الكود، والمالك، والنوع (سفير، مؤثر، فريق، دكتورة).
   - `referrals`: الكود، والفريق الجديد، والتاريخ، وهل فتح أول باب.
3. **المكافأة:** شهر مجاني للطرفين، لكن بعد ما الفريق الجديد يفتح أول باب، مو بس يسجل. هذا يمنع الغش.

## Step 30 · حلقة النمو (`B11Loop`)

1. لما الفريق يفتح باب، اعرض عليهم بطاقة الإنجاز (Step 26).
2. أي أحد يسجل من رابط البطاقة `?r=TEAMCODE` ينحسب إحالة للفريق.
3. لو الدكتورة دعت فرق من رابطها `/j/:code`، تنحسب لها.
4. سوّ لوحة إدارة بسيطة تعرض كل أسبوع:
   - عدد الفرق الجديدة، ومن وين جات (إحالة فريق، سفير، مؤثر، دكتورة، إعلان).
   - تكلفة الفريق الواحد.
   - نسبة الفرق اللي فتحت أول باب.


---

## Final check (all 30 steps)
- [ ] Every screen matches its screenshot at 1440 and 390.
- [ ] The W logo replaced every old mark. Spinners are `WLogo` loading.
- [ ] Wesy shows up as the agent everywhere: `formal:true` on the doctor's side, `confetti:false`, and `settleAfter:8000` so nothing moves forever.
- [ ] No green or blue, one orange button per screen, Western digits only, no clipped hamza, no letter-spaced Arabic.
- [ ] Reduced motion turns everything into a 200ms fade. No confetti.
- [ ] Wesy never writes, sends or deletes anything before «وافقوا», and every action can be undone.
- [ ] The doctor can technically not read «الفريق بس».
- [ ] Every request, meeting and approval from the doctor appears in the chat, the calendar and the students' notifications at the same moment.
- [ ] Each door's opening moment plays once per door. The next card shows the right one of its 5 states.
- [ ] The story card has no names and no research title. The founders counter reads real numbers.
- [ ] Referral rewards are granted only after the new team opens its first door.
- [ ] Run the app, click through every page at 1440 and 390, and send me one final screenshot set.
