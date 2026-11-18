# Wesync · هيرو «ارموا» + صفحات أفخم + «بدأتوا قبل؟» + «وش هذا المكان؟» + الدرايف + الوكيل

> الصق هذا الملف كامل في Claude Code وهو مفتوح على مستودع Wesync.
> قبلها فك الـ zip بجذر المستودع. بيطلع لك مجلد `design-reference/hero/`، فيه 27 شاشة (HTML + PNG) ومجلد `assets/`.

---

You are working on **Wesync** (wesyncapp.com). It's an Arabic-first (RTL) web app for nursing graduation-research teams: 4 students and 1 supervising doctor.

Work in **7 phases**. **Stop after each phase**, show me screenshots of desktop (1440) and mobile (390) plus a short summary, then wait for my OK.

## 0. Rules for every phase

**Port the reference literally.** Each screen has a `.html` and a `.png` in `design-reference/hero/`. Copy the values as they are: padding, radius, gradients, shadows, font sizes, and the Arabic copy word for word. Don't "improve" anything.

**Reuse first.** Before writing anything new, search the codebase for existing components and use them: sidebar, cards, the vessel image, pills, the gauge, the toast, and the `ارموا` upload pipeline.

**Brand rules (apply them everywhere):**
- Gold `#FFC777` for every done/success state. **Never green**, including the «خلصت» pill and «ولا شي متأخر».
- **One orange button per screen.** Every other button uses glass or cream.
- Text is at least 12px. Touch targets are at least 44px.
- No animation runs forever. Respect `prefers-reduced-motion`.
- RTL first.
- **Western digits 0–9 everywhere.** Never mix ٥ and 5 on one screen.
- **Arabic text gets `letter-spacing: 0`.** Letter-spacing breaks Arabic letters apart: «مهامي» becomes «مها مي». Letter-spacing is allowed only on Latin text and on small uppercase kickers.
- **Gradient headings** (`background-clip: text`) need `padding-top: .2em`. Without it the hamza gets clipped, and «أي» shows as «آي» and «أشياء» as «آشياء». That's why the live site looks like it says «ارموا آي شي». The word is spelled right; the clipping is the bug.

## Phase 1 · Fix the 12 issues from the live site (`FixList`)
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

## Phase 2 · The «ارموا» hero (`HeroDrag` → `HeroAbsorb` → `HeroReveal` → `HeroLanded`, `HeroMotion`, mobile `HeroAbsorbM`, `HeroRevealM`)
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

## Phase 3 · Premium pages (`HomeLux`, `TasksLux`, `MeetLux`)
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

## Phase 4 · «بدأتوا قبل؟», for teams that already started (`StartChoice`, `StartBring`, `StartResult`, `StartM`)
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

## Phase 5 · «وش هذا المكان؟», for students who don't understand the site (`ExplainD`, `ExplainM`, `PageHelp`)
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

## Phase 6 · Drive, and who's connected, including the doctor (`DriveD`, `DriveInviteM`)
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

## Phase 7 · The agent, rebuilt (`AgentWhy`, `AgentNowM`, `AgentListenM`, `AgentPlanM`, `AgentNowD`, `AgentPlanD`, `AgentDoneD`)
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

## Done means
- Every screen matches its PNG at 1440 and 390.
- No green anywhere, one orange button per screen, Western digits only.
- No clipped hamza, and no letter-spaced Arabic.
- Reduced-motion works.
- The drop hero works on every page.
- The agent never writes, sends, or deletes anything before «وافقوا», and every action can be undone.
