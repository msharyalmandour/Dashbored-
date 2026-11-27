# Wesync · بوابة الدكتورة ٢: لوحة أوضح + محادثة بدل الإيميل + كل المواعيد + تنبيهات الطلاب

> فك الـ zip بجذر المستودع، والصق هذا الملف كامل في Claude Code.
> المرجع في `design-reference/doctor/`، وفيه 13 شاشة (HTML + PNG).

---

You are working on **Wesync**, an Arabic-first (RTL) app where nursing graduation-research teams (4 students each) work with their supervising doctor. Today the doctor talks to students by email. Replace that with an in-app chat, show all appointments in one place, and notify students instantly.

Work in **5 phases**. **Stop after each phase**, show me screenshots of desktop (1440) and mobile (390), and wait for my OK.

## Rules for every phase
- **Port the reference literally.** Copy each `.html`/`.png` in `design-reference/doctor/` as it is: values and Arabic copy word for word.
- **Reuse first.** Check the codebase for an existing doctor dashboard, the requests/receipts system, the minutes, and the student chat, and build on them.
- Gold `#FFC777` for done and OK states, never green.
- One orange button per screen. Text is at least 12px, and touch targets are at least 44px.
- RTL. Western digits 0–9.
- No `letter-spacing` on Arabic text. Gradient headings get `padding-top: .2em`, otherwise the hamza gets clipped.
- **Tone:** friendly Saudi Arabic, female forms when talking to the doctor («كلّميهم», «وافقي», «شوفيه»). Sentences are short and human. Never «يرجى» or «تم».

## Phase 1 · Doctor home (`DocHome2`, `DocHomeM2`)
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

## Phase 2 · Chat instead of email (`DocChat`)
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

## Phase 3 · All appointments (`DocCal`)
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

## Phase 4 · Student notifications (`StudToast`, `StudNotif`, `StudLockM`)
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

## Phase 5 · Two separate groups for students (`GroupsIntro`, `ChatWithDoc`, `ChatTeamOnly`, `ChatGuard`, `ChatDocM`, `ChatTeamM`)
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

## Done means
- The doctor never needs email to reach a team.
- Every request, meeting and approval from the doctor appears in the chat, the calendar and the students' notifications at the same moment.
- All screens match their PNGs at 1440 and 390.
- No green anywhere, and one orange button per screen.
- A student can always tell, at a glance and before sending, whether the doctor will see the message, and the doctor technically cannot read «الفريق بس».
