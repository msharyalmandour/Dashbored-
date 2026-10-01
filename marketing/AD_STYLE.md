# Wesync — Ad Style Guide ("Surreal Burnout")

**Standing direction from the owner (2026-10-01):** future Wesync ads should follow
this style. It was given as a reference post (a surreal composite of an exhausted
student asleep at a desk in a flower meadow, headline "عاجل / You've hit your usage
limit"). We borrow the *formula*, never the artwork or its exact composition/text.

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
