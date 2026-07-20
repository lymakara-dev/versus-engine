# CLAUDE.md — Versus Engine

You are building **Versus Engine**, a category-agnostic system that generates animated comparison videos (cars, phones, laptops, anything) from database records, using Remotion. Read `PROJECT_PLAN.md` first — it is the source of truth for architecture and roadmap. `database/schema.prisma` is the data model. `examples/comparison-example.json` is the exact payload the video renderer must accept.

## Prime directives

1. **The video JSON contract is sacred.** The Remotion composition (`apps/studio`) must only ever consume the Zod-validated `VideoInput` shape. Never let category-specific logic (e.g. "if car then…") leak into the renderer. New categories are added purely via `SpecDefinition` rows in the database.
2. **Phase 1 first.** Before any dashboard, scraper, or queue work, get `pnpm render examples/comparison-example.json` producing a complete, polished MP4 with all six scenes, transitions, SFX, and looping music. Everything else depends on this proof.
3. **Frozen payloads.** When a comparison is rendered, persist the exact `videoJson` in the `Comparison` row so any video can be re-rendered identically later.
4. **Idempotent jobs.** All BullMQ workers must be safe to retry: upserts keyed by natural keys (source + external id), renders keyed by comparison id + template version.

## Stack decisions (do not re-litigate without asking)

TypeScript everywhere. pnpm workspaces + Turborepo. Remotion 4.x for video (use the official Remotion skill if installed). PostgreSQL + Prisma. Redis + BullMQ. Next.js 15 App Router + Tailwind + shadcn/ui for the dashboard. Zod for all cross-package types. `sharp` for image processing. Vitest for tests.

## Remotion conventions

- 30 fps. Default composition 1920×1080 (`Comparison16x9`); Shorts variant 1080×1920 reusing the same scene components with layout props.
- All timing derives from `useVideoConfig().fps` — never hardcode frame counts as magic numbers; define scene durations in `apps/studio/src/timing.ts` in seconds.
- Entrances use `spring()`; value animations (bar races, counters) use `interpolate()` with `Easing.out(Easing.cubic)`; scene changes use `@remotion/transitions`.
- Each scene exports `getDuration(input)` and `getSfxCues(input)` so audio placement is computed, not eyeballed.
- Music: one looping `<Audio>` at the composition root with a volume envelope that ducks −6dB during SFX cues and fades out over the last 2 seconds.
- Colors/typography come from `theme/` (category theme) + contender `accentColor`. Never hardcode hex values in scenes.
- Validate props with the Zod schema in `schema.ts` at composition entry; fail loudly with a readable error.

## Data conventions

- Store raw scraped/imported specs untouched in `Product.specs` (JSONB); normalized comparable values go in `SpecValue` (numeric, SI units). Unit conversion happens at ingestion, once.
- Every product records `source`, `sourceUrl`, `verifiedAt`. Only products with `status = VERIFIED` are eligible for rendering.
- AI-assisted research output is always `status = DRAFT` until a human approves in the dashboard.
- Seed data must include: 4 cars, 4 phones, 2 laptops with full SpecDefinitions per category, so demos work out of the box.

## Round selection heuristic (comparison package)

Score each candidate SpecDefinition by `priorityWeight × normalizedDifference` between contenders; take the top 6–8, always include price, cap at one "badge" (non-numeric) round per video, and guarantee at least one round won by each contender when the data allows (close matchups retain viewers better than blowouts).

## Quality bars

- `pnpm lint && pnpm typecheck && pnpm test` must pass before any phase is called done.
- A rendered sample video is the acceptance test for any change to `apps/studio` — render `examples/comparison-example.json` and eyeball it.
- No scraper may ship without: rate limiting, an on-disk HTML fixture test, and a terms-of-service note in the adapter header comment.
- Never commit API keys; use `.env` + `.env.example`.

## Commands to implement

```
pnpm dev                 # dashboard + remotion studio concurrently
pnpm render <json>       # render a payload to output/
pnpm ingest vpic ...     # vehicle ingestion
pnpm ingest csv <file>   # bulk import
pnpm batch ...           # queue many comparisons
pnpm db:seed             # demo data
```
