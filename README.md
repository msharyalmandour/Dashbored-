# Velocità

A premium automotive discovery platform — Tesla-level minimalism, Porsche-level
storytelling, Netflix-style discovery. Find, compare, and fall for the car that
feels like you.

This is a concept/demo build: the catalog, brand roster, and specs are
realistic but fictional, and every car image is an illustrated SVG stand-in
(gradient environments + a hue-tinted silhouette) rather than photography —
there's no licensed image source wired into this project.

## Tech

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Fonts: Unbounded (display), Manrope (body), JetBrains Mono (data) via `next/font`

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

- `app/` — Next.js App Router entry (`page.tsx`, `layout.tsx`, `globals.css`)
- `components/platform/` — the platform UI: Nav, Hero, Discover (search +
  filters), Brands, FeaturedCars/CarCard, Categories, PersonalityQuiz,
  Compare, FeelingDiscovery, Stories, CarDetailOverlay, Footer, and the
  illustration system (`CarArt`, `InteriorArt`)
- `components/platform/PlatformContext.tsx` — shared client state: filters,
  favorites (persisted to `localStorage`), compare selection, and the open
  car detail overlay
- `lib/types.ts` — data model (Car, Brand, Category, Story, …)
- `lib/cars-data.ts` — the car/brand/category/story dataset
- `lib/filters.ts`, `lib/quiz.ts`, `lib/interior-facts.ts` — search filtering,
  personality-quiz scoring, and generated interior-story copy
