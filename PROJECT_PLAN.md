# VERSUS ENGINE — Faceless Comparison Video Automation Platform

A scalable, code-driven system that researches any two (or more) products — cars, motorcycles, phones, laptops, anything — stores structured data in a database, and automatically generates animated motion-graphics comparison videos (with transitions, sound effects, and looping background music) ready for YouTube.

---

## 1. Vision & Product Definition

The channel publishes "X vs Y" videos built entirely from code. Every video is generated from a single JSON payload pulled from the database, rendered through a reusable animated template. The system is **category-agnostic**: adding "drones" or "smartwatches" later requires only new data, not new code.

**Video anatomy (60–180 seconds, 1080p/4K, 30fps, 16:9 + optional 9:16 Shorts cut):**

1. **Hook intro** (0–5s) — animated logo sting, "TITLE CARD: Car A vs Car B", dramatic zoom, whoosh SFX
2. **Contender reveal** (5–15s) — each product slides in with image, name, price tag, brand logo, spring animations
3. **Spec battles** (15s–N) — one animated scene per spec category (e.g. Engine, 0-100 km/h, Range, Camera, Battery). Animated bar/gauge/counter races, the winner of each round gets a glowing "point", ding SFX
4. **Scoreboard tally** (running corner scoreboard throughout)
5. **Winner reveal** (final 10s) — confetti/particle burst, crown animation, final score, verdict text
6. **Outro** (5s) — subscribe animation + next-video teaser

Audio: royalty-free looping music bed (auto-ducked), whoosh/ding/impact SFX synced to animation keyframes. No voiceover required for MVP; optional TTS narration in Phase 3.

---

## 2. Technology Stack (2026-modern, all TypeScript)

| Layer | Choice | Why |
|---|---|---|
| Video engine | **Remotion 4.x** (React) | The industry standard for programmatic video. React components become frames; deterministic renders; `@remotion/transitions`, `spring()`, audio support, Lambda scaling. Free for individuals/companies ≤3 people. There is also an official Remotion agent skill for Claude Code, which makes Claude Code very effective at writing these templates. |
| Language | TypeScript everywhere | One language across data, templates, jobs |
| Monorepo | pnpm workspaces + Turborepo | Shared packages, fast CI |
| Database | PostgreSQL 16 + **Prisma ORM** | Relational core + JSONB for flexible per-category specs |
| Cache/queue | Redis + **BullMQ** | Render jobs, scrape jobs, upload jobs with retries |
| Dashboard | Next.js 15 (App Router) + Tailwind + shadcn/ui | Admin panel: browse products, build comparisons, preview, queue renders |
| Research/ingestion | Node workers + Playwright + official APIs | NHTSA vPIC (free, no auth) for vehicles; structured scrapers/manual import for phones & laptops |
| AI assist | Anthropic API | Normalize messy scraped specs into canonical schema, generate titles/descriptions/tags, pick "interesting" spec battles |
| Rendering | `@remotion/renderer` locally → **Remotion Lambda** at scale | Local for dev, Lambda for parallel batch renders |
| Media storage | Local `/assets` → S3-compatible (Cloudflare R2) | Product images, music, SFX, rendered MP4s |
| Publishing | YouTube Data API v3 | Scheduled uploads with metadata + thumbnail |
| Thumbnails | Remotion `renderStill()` | One branded thumbnail template, generated from same data |
| Deployment | Docker Compose (Postgres, Redis, workers, dashboard) | Single VPS to start; scales later |

**Alternatives considered:** Motion Canvas / Revideo are good, but Remotion wins on ecosystem, transitions library, Lambda rendering, Player preview embedding, and Claude Code skill support.

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        DASHBOARD (Next.js)                       │
│   browse products · build comparisons · live Remotion <Player>   │
│   preview · queue renders · track uploads                        │
└───────────────┬──────────────────────────────────────────────────┘
                │ tRPC / REST
┌───────────────▼──────────────────────────────────────────────────┐
│                       CORE API + JOB QUEUE                       │
│                    (Node + BullMQ on Redis)                      │
└──┬───────────────┬────────────────┬───────────────┬──────────────┘
   │               │                │               │
┌──▼─────────┐ ┌───▼──────────┐ ┌───▼──────────┐ ┌──▼───────────┐
│ INGESTION  │ │  COMPARISON  │ │   RENDER     │ │  PUBLISHER   │
│ workers    │ │  builder     │ │   worker     │ │  worker      │
│ vPIC API,  │ │ scoring,     │ │ Remotion     │ │ YouTube API, │
│ scrapers,  │ │ AI narrative │ │ local/Lambda │ │ thumbnail,   │
│ CSV import,│ │ + video JSON │ │ + FFmpeg mux │ │ scheduling   │
│ AI cleanup │ │              │ │              │ │              │
└──┬─────────┘ └───┬──────────┘ └───┬──────────┘ └──┬───────────┘
   │               │                │               │
┌──▼───────────────▼────────────────▼───────────────▼──────────────┐
│              PostgreSQL (Prisma)  +  R2/S3 asset store           │
└──────────────────────────────────────────────────────────────────┘
```

### Monorepo layout

```
versus-engine/
├── CLAUDE.md                     # instructions for Claude Code
├── package.json                  # pnpm workspace root
├── turbo.json
├── docker-compose.yml            # postgres, redis, minio (dev S3)
├── apps/
│   ├── studio/                   # Remotion project (the video templates)
│   │   ├── src/
│   │   │   ├── Root.tsx          # composition registry
│   │   │   ├── compositions/
│   │   │   │   ├── Comparison16x9.tsx
│   │   │   │   └── ComparisonShort9x16.tsx
│   │   │   ├── scenes/           # Intro, Reveal, SpecBattle, Scoreboard,
│   │   │   │                     # WinnerReveal, Outro
│   │   │   ├── components/       # AnimatedBar, Gauge, Counter, Crown,
│   │   │   │                     # Confetti, PricePill, LogoSting
│   │   │   ├── audio/            # music/SFX scheduling helpers
│   │   │   ├── theme/            # per-category color/typography themes
│   │   │   └── schema.ts         # Zod schema = the video JSON contract
│   │   └── remotion.config.ts
│   ├── dashboard/                # Next.js admin app
│   └── workers/                  # BullMQ processors (ingest/render/publish)
├── packages/
│   ├── db/                       # Prisma schema + client + seed
│   ├── ingestion/                # source adapters (vpic, csv, scraper, ai)
│   ├── comparison/               # scoring engine, video-JSON builder
│   └── shared/                   # types, zod schemas, utils
├── assets/
│   ├── music/                    # royalty-free loops (see §7)
│   ├── sfx/                      # whoosh, ding, impact, drumroll, confetti
│   └── fonts/
└── output/                       # rendered MP4s + thumbnails
```

---

## 4. Data Layer

Full schema in `database/schema.prisma`. Design principles:

- **Category-agnostic core.** `Category → Brand → Product` is universal. Specs live in two places: a `specs Json` blob (raw, everything) and a normalized `SpecValue` table (numeric, unit-converted, comparable) keyed to `SpecDefinition` rows that belong to a category.
- **SpecDefinition drives everything.** Each row declares key, label, unit, data type, `higherIsBetter`, display format, and preferred visualization (`bar | gauge | counter | badge | radar`). Adding a new category = inserting SpecDefinitions, nothing else.
- **Comparisons are first-class.** A `Comparison` links N products, stores computed round winners, total score, AI-generated title/description/tags, and the frozen `videoJson` payload actually rendered (reproducibility).
- **Jobs are tracked.** `RenderJob` and `Upload` tables give the dashboard full pipeline visibility and let failed steps retry idempotently.

### Data sources per category

**Cars / motorcycles / trucks:** NHTSA vPIC — a free public API, no registration required, covering makes, models, and manufacturer-reported vehicle data, with a standalone downloadable database also offered in PostgreSQL format. Use it as the backbone (makes/models/body/engine basics), then enrich horsepower/torque/0-100/price from manufacturer press sites, CSV imports, or AI-assisted research with human review.

**Phones / laptops:** No good free official API exists. Strategy: adapter-based scrapers (Playwright) against spec sites *where their terms permit*, plus a bulk CSV/JSON import path, plus an "AI research" adapter where Claude (with web search) fills a draft spec sheet that a human approves in the dashboard before it becomes render-eligible. Every record stores `sourceUrl` and `verifiedAt`.

**Images:** manufacturer press/media kits (intended for publication), Wikimedia Commons (check license), or purchased stock. Store license + attribution in `ProductImage`. Auto-process on ingest with `sharp`: background removal (rembg via API or `@imgly/background-removal`), resize to standard canvas sizes, generate a dominant-color palette used to theme each product's side of the screen.

---

## 5. The Video JSON Contract (the heart of scalability)

The Remotion composition takes **one Zod-validated prop object** and renders any comparison in any category. Example in `examples/comparison-example.json`. Shape summary:

```ts
const VideoInput = z.object({
  meta: z.object({ title, category, theme, aspect, fps, resolution }),
  music: z.object({ src, loop: z.boolean(), volumeDb }),
  contenders: z.array(z.object({
    name, brand, price, imageUrl, accentColor, logoUrl
  })).min(2),
  rounds: z.array(z.object({
    label,                // "0–100 km/h"
    icon,                 // lucide icon name
    visualization,        // "bar" | "gauge" | "counter" | "badge"
    unit, higherIsBetter,
    values: z.array(z.number()),   // parallel to contenders
    displayValues: z.array(z.string()), // "3.1 s"
    winnerIndex: z.number().nullable(), // null = tie
    sfx: z.string().optional()
  })),
  verdict: z.object({ winnerIndex, scores, tagline })
});
```

Because the renderer only understands this contract, "make it work for anything" is solved by construction: the `comparison` package maps any category's SpecDefinitions into rounds; the studio never knows what a "car" is.

### Animation system inside Remotion

- `spring()` for entrances (product slide-ins, score pops), `interpolate()` for bar races and number counters
- `@remotion/transitions` (slide, wipe, flip) between scenes with `springTiming`
- SFX scheduling: each scene exports its keyframe times; an `<AudioTrack>` helper places `<Audio>` components (whoosh at scene start, ding at winner frame, drumroll before verdict)
- Music: single `<Audio loop volume={...}>` with ducking envelope around SFX moments
- Theming: category theme (colors, font pairing, background motif — e.g. speed lines for cars, circuit pattern for phones) + per-product accent colors extracted from images

---

## 6. Pipeline Walkthrough (one video, end to end)

1. `pnpm ingest vpic --make Toyota --years 2024-2026` → products + raw specs land in Postgres; AI normalizer maps raw fields to SpecValues; images fetched/processed
2. In the dashboard (or CLI): pick "Toyota GR Corolla vs Honda Civic Type R" → comparison builder selects the 6–8 most *interesting* rounds (largest normalized differences + category-priority weights), computes winners, asks Claude for title/description/tags/tagline
3. Live preview via Remotion `<Player>` embedded in the dashboard — instant iteration, no render
4. "Queue render" → BullMQ job → `renderMedia()` (or Lambda) → MP4 + `renderStill()` thumbnail → uploaded to R2
5. Publisher worker uploads via YouTube Data API v3 with schedule time; status tracked in `Upload`
6. Batch mode: `pnpm batch --category phones --pairs top-20 --schedule daily` renders a queue of videos overnight

---

## 7. Audio & Legal Checklist

- **Music:** only tracks with clear commercial/YouTube licenses — YouTube Audio Library, or paid subscriptions (Epidemic Sound / Artlist) once monetized. Store license proof paths in `assets/music/LICENSES.md`.
- **SFX:** freesound.org (CC0 filter), Pixabay SFX, or the same paid libraries.
- **Images:** manufacturer press kits and properly licensed sources only; keep attribution fields populated. Avoid ripping images from review sites.
- **Data:** facts/specs themselves aren't copyrightable, but respect site terms when scraping; prefer APIs and manual/CSV entry where terms are restrictive.
- **YouTube:** enable "Altered content" disclosure if AI narration is added later; comparison/spec content is fine for monetization as transformative original motion graphics.

---

## 8. Build Roadmap for Claude Code

**Phase 0 — Skeleton (day 1):** monorepo scaffold, docker-compose (Postgres+Redis+MinIO), Prisma schema migrated, seed with 2 hand-written products (2 cars) so every later phase has real data.

**Phase 1 — Renderer MVP (week 1):** Remotion studio with the six scenes, the Zod contract, one polished 16:9 theme, music+SFX helpers, `pnpm render examples/comparison-example.json` produces a finished MP4. *This is the milestone that proves the whole idea — prioritize it.*

**Phase 2 — Data engine (week 2):** vPIC adapter, CSV importer, AI spec normalizer, image pipeline (sharp + bg removal + palette), SpecDefinition seeds for cars, phones, laptops.

**Phase 3 — Comparison builder + dashboard (week 3):** scoring engine, round selection heuristics, AI metadata generation, Next.js dashboard with `<Player>` preview and render queue.

**Phase 4 — Publishing & batch (week 4):** YouTube OAuth + upload worker, thumbnail stills, scheduler, batch CLI, 9:16 Shorts composition reusing the same scenes.

**Phase 5 — Scale & polish:** Remotion Lambda, more themes per category, A/B thumbnail variants, analytics feedback loop (pull YouTube Analytics to learn which matchups/rounds retain viewers), optional TTS narration track.

**Definition of done per phase** and coding conventions live in `CLAUDE.md`.
