# Wesync · صفحة «ارموا أي شي» كهيرو + مكتبة الأدلة بأقل كلام

> فك الـ zip بجذر المستودع، والصق هذا الملف في Claude Code.
> المرجع في `design-reference/drop2/`، وفيه 5 شاشات (HTML + PNG).

---

Redesign two pages of **Wesync** (Arabic RTL): **«ارموا أي شي»** and **«مكتبة الأدلة»**. Make them premium with **almost no text**, in the same style as the full-screen drop hero.

Port the reference literally: copy each `.html` and `.png` in `design-reference/drop2/` as it is, values and Arabic copy word for word. Reuse the existing vessel, upload pipeline and drop hero. Stop after each part and send me screenshots at 1440 and 390.

## 1 · «ارموا أي شي» page (`DropPage`, `DropPageM`)
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

## 2 · Entrance motion (`DropEnter`)
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

## 3 · «مكتبة الأدلة» (`LibLux`, `LibEmpty`)
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

## Rules
- Gold for done states, never green. One orange button per screen.
- Text is at least 12px; touch targets are at least 44px.
- Western digits, and no letter-spacing on Arabic text.
- **Fewer words:** no sentence longer than 6 words on these two pages, except the study titles.
