# Wesync — Ad Style Guide

Two approved directions, both given by the owner as reference posts (2026-10-01).
We borrow the *taste and formula*, never the artwork, wording, name or logo of the
reference accounts.

| Mode | Use for | Feel |
|---|---|---|
| **A. Surreal Burnout** (below) | problem / humour / relatable posts | funny, photoreal, meadow, sticky notes |
| **B. Editorial Cobalt** (section further down) | brand, launch, feature, "new release" posts | premium, minimal, magazine-like, cobalt blue |

Rule of thumb: A makes people laugh and tag a friend; B makes the brand look
expensive. Alternate them; resolution posts may mix (B layout, A micro-jokes).

# A. Surreal Burnout

**Reference:** a surreal composite of an exhausted student asleep at a desk in a
flower meadow, headline "عاجل / You've hit your usage limit".

## The formula

> **Relatable tech-error / alert headline** + **absurd photoreal scene** that
> visualises that exact feeling + **tiny funny details everywhere** that reward a
> second look.

1. **Scene:** a normal study/work setup dropped into an impossible, idyllic place
   (open meadow, blue sky, wildflowers) — the desk, shelf, laptop and clutter are
   real-looking objects placed in grass. Photoreal composite, soft sunlight,
   shallow depth of field, very light film grain.
2. **Character:** one relatable, exhausted student (female with hijab/glasses, or
   male in thobe — alternate between posts so both are represented), head down on
   arms or slumped. One absurd gag on them (e.g. a steaming cooking pot on the head =
   overheated brain).
3. **Micro-details (the soul of the style):** sticky notes with dry jokes
   ("Brain 404", "Maybe tomorrow", "it's a lot..."), a mug with a joke, crumpled
   paper balls scattered in the grass, rubber duck, plant, coffee, old CRT monitor,
   laptop, tablet, stacked books with real-sounding titles. 6–10 such objects.
4. **Palette:** saturated blue sky gradient (deeper at top), lush green, small
   red/pink flower accents, warm wood. White headline text always sits on the sky.
5. **Format:** 4:5 portrait, 1080×1350 (Instagram feed). Reels/stories: 9:16 with
   the same scene shot as slow push-in video.

## Typography

- **Line 1 — Arabic brush headline**, huge, white, top-right: a single punchy word
  in a calligraphic/brush face (e.g. **عاجل** = "Breaking"). Candidate fonts:
  *Aref Ruqaa*, *Katibeh*, *Lalezar*. Slight shadow/roughness is fine.
- **Line 2 — English system-message line**, large, white, tight tracking, bold
  geometric sans (Montserrat/Inter), sentence case. It parodies an app/system
  message ("You've hit your usage limit").
- Tiny metadata row: handle top-left, small caps date/label top-right, one-line
  footer bottom-left, "Follow and save for more" bottom-right. All very small.
- **Arabic text is always composited by us** (Playwright + Cairo/brush font loaded
  from a local file and opened via `file://`) — image models garble Arabic.
  English text may be generated inside the image, but verify it.

## Headline bank for Wesync (Arabic word + English system message)

| Arabic | English | Scene gag |
|---|---|---|
| عاجل | Your supervisor is typing… | student frozen, giant empty chat bubble made of paper |
| عاجل | final_FINAL_v7_real.docx | seven laptops, each showing a "final" file; sticky "which one??" |
| عاجل | 47 unread messages | team asleep on the desk, WhatsApp-green sticky notes everywhere |
| عاجل | Sample size needed: 384. Collected: 12. | tiny jar with 12 paper surveys |
| عاجل | Battery low: 3%. Deadline: 3 days. | drained laptop + phone, coffee IV bag |
| عاجل | You've hit your deadline limit | direct riff on the reference — vary it, don't copy it |
| تم الحل | Everything is in one place. | **resolution post**: same meadow, tidy desk, student smiling, laptop shows Wesync |

Pair a "problem" post with a "resolution" post (carousel or two consecutive posts).
Resolution posts carry the brand: Wesync wordmark, "بحثكم يخلص بوقته.. مو بآخر ليلة",
CTA "جرّبوه ٧ أيام ببلاش — الرابط بالبايو".

## Image-generation recipe (Higgsfield)

- Model: `gpt_image_2_5`, 4:5 (or 3:4). Generate the scene **without any text**.
- Prompt skeleton: *"Photorealistic surreal composite photograph: a wooden desk with
  shelves placed in the middle of a lush green meadow with red wildflowers under a
  bright blue gradient sky; a [young Saudi woman in a hijab and glasses | young Saudi
  man in a white thobe] sleeping with head on arms, [absurd gag]; laptop, tablet,
  crumpled paper balls on the grass, rubber duck, potted plant, iced coffee, retro
  CRT monitor with a sticky note, stacked books; soft golden sunlight, shallow depth
  of field, subtle film grain, clean negative space in the sky for headline text.
  No text, no logos."*
- Then overlay the headline + sticky-note texts + metadata with Playwright
  (see `marketing/instagram-campaign/render.cjs` for the render pattern; remember:
  open a real `.html` file via `goto('file://…')` so local fonts/images load).
- Check output programmatically (font loaded, image naturalWidth) since we cannot
  eyeball renders in the sandbox.

## Guardrails

- Original compositions only; the reference creator's handle/art is *inspiration*.
- No real people, no real universities/brands on props, no fake statistics.
- Keep humour about *the chaos of graduation research* — never about a specific
  university, supervisor or student group.
- Both genders and modest dress represented across the series.
- Marketing claims must be true (AI features are in the AI plan; the search speed
  claim is unmeasured — don't state a number in ads until measured).

---

# B. Editorial Cobalt (premium brand look)

**Reference (owner, 2026-10-01):** a Saudi specialty-coffee brand's Instagram grid:
one electric cobalt-blue "magazine" as the hero object, a woman half-hidden behind
an open print publication, a tall condensed headline in red-orange on blue, a
glass of matcha held up against a flat sky-blue field, a drive-through lifestyle
still with tiny captions. Everything is calm, sparse and expensive. Arabic lives in
the caption; the artwork itself is English-led with tiny Arabic details.

## Principles

1. **One colour world per post.** A saturated *cobalt / ultramarine* field
   (gradient from electric blue to deep navy) or a flat *sky blue / teal* wall.
   Photos are colour-graded to sit inside that world (blue jacket on teal wall,
   green drink on sky blue).
2. **One hero object, lots of empty colour.** A single thing carries the post: a
   printed publication / thesis binder, a phone, a cup, a hand holding the thing up.
   Negative space is the luxury.
3. **Print / magazine concept.** Publications, spines, covers, open spreads held in
   front of faces. For Wesync: a "research journal" or thesis binder in cobalt with
   the Wesync mark on the spine, issues like "The Journey of a Thesis" (carousel).
4. **Typography does the talking, small and precise.**
   - Headline: tall, tightly-leaded **condensed grotesque, ALL CAPS** (e.g. League
     Gothic / Anton / Bebas Neue) in a *contrasting* colour — red-orange on cobalt
     (for us: **Wesync amber/orange** `#f59e0b`–`#ff6a1a` on cobalt).
   - Product/feature name: **tall condensed high-contrast display serif** in white
     (e.g. Bodoni Moda condensed / Playfair Display narrow / Abril), 2 lines, very
     large, on sky blue.
   - Micro-copy: tiny **UPPERCASE, wide-tracked** sans lines ("NEW RELEASE", one
     descriptive sentence, small brand mark top-centre like "92°" → ours: "WESYNC°"
     or the ∞ mark). 3–4 text tiers max.
   - Arabic: same restraint — Reem Kufi / IBM Plex Sans Arabic (not brush) for any
     Arabic on art; the long Arabic copy goes in the caption.
5. **Photography:** real-feeling, soft grain, natural light, modest people in
   everyday moments (Saudi women incl. hijab, men in thobe/casual), hands holding
   objects, car/café/campus lifestyle stills. No stock-photo gloss.
6. **Copy voice:** short, warm, slightly poetic one-liners. *"A magazine brewed with
   stories."* → *"A thesis organised with care."* *"Made for the morning rush."* →
   *"Made for the all-nighters."* Never shout; no emoji on the art.
7. **Series logic:** a 7-slide carousel (cover → story spreads → product slide →
   CTA), identical grid and type system across slides, a tiny slide label.

## Palette (tokens)

| Token | Value | Use |
|---|---|---|
| cobalt | `#1d2bd8` → `#0a1470` gradient | main field |
| ultramarine-deep | `#060b3a` | gradient floor / dark slides |
| sky | `#6fa8dc` | flat field for product shots |
| teal-wall | `#3f8f9a` | photo backdrops |
| amber (Wesync) | `#f59e0b` / `#ff6a1a` | headline on cobalt, small accents |
| white | `#ffffff` | serif display + micro-copy |

## Wesync concept bank for this mode

- **"YOUR THESIS JUST GOT A WHOLE NEW WORKFLOW."** — woman behind an open cobalt
  journal (cover blank, spread with the headline in amber condensed caps).
- **NEW RELEASE — AI LITERATURE SEARCH** (serif display on sky blue) with a hand
  holding a phone against the sky; micro-copy: *"Type your title. Get related
  studies."* (no number until the speed is measured).
- **"THE JOURNEY OF A THESIS"** — 7-slide carousel: cobalt book on a gradient,
  spine text "9 months · 1 research", spreads for Team · Tasks · Supervisor ·
  Survey · Stats · AI Search, final CTA "Try 7 days free".
- **Drive-through-style lifestyle:** students in a café/campus car-park moment,
  caption "Made for the all-nighters."
- **Supervisor spread:** a hand holding a printed "Chapter 3" with a sticky
  "approved" — micro-copy "Feedback, in one place."

## Image-generation recipe (mode B)

- `gpt_image_2_5`, 4:5, quality high. Prompt skeleton: *"Editorial photograph,
  minimal composition, [colour world], single hero object [object], [person]
  half-hidden behind it, soft natural light, subtle film grain, generous empty
  colour field for text. No text."* Then compose all type with Playwright
  (condensed grotesque + serif + micro-copy), exactly like mode A.
- Keep Wesync's own mark/name; never use the reference brand's name, logo or "92°".

## Guardrails (both modes)

- Original work only; references are mood, not templates.
- True claims only (AI features need the AI plan; the "20 seconds" figure is not
  yet measured — avoid it on art until it is).
- No real university/brand marks, no real people, both genders and modest dress.
