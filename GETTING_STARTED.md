# Getting Started — Handing This to Claude Code

## Prerequisites

Node 20+, pnpm, Docker Desktop, and Claude Code installed. Optional but recommended: install the official Remotion agent skill for Claude Code (`npx skills add remotion` or via skills.sh) — it dramatically improves the quality of generated Remotion code.

## Step 1 — Create the repo

```bash
mkdir versus-engine && cd versus-engine
git init
# copy PROJECT_PLAN.md, CLAUDE.md, database/schema.prisma, examples/ into the repo
claude
```

## Step 2 — Kickoff prompt (Phase 0 + 1)

Paste this into Claude Code:

> Read PROJECT_PLAN.md and CLAUDE.md fully. Execute Phase 0: scaffold the pnpm/Turborepo monorepo exactly as laid out in the plan, set up docker-compose with Postgres, Redis, and MinIO, wire up Prisma using database/schema.prisma, and write a seed script with the two cars from examples/comparison-example.json. Then execute Phase 1: build the Remotion studio app with all six scenes (Intro, Contender Reveal, Spec Battles, running Scoreboard, Winner Reveal, Outro), the Zod VideoInput schema, spring entrances, @remotion/transitions between scenes, SFX cue scheduling, and looping ducked background music. Acceptance test: `pnpm render examples/comparison-example.json` must output a complete polished MP4. Use placeholder solid-color product images and silent placeholder audio files if assets are missing, but keep the file paths from the example JSON.

## Step 3 — Iterate on the visuals

Preview instantly with `pnpm --filter studio dev` (Remotion Studio opens in the browser with a timeline scrubber). Ask Claude Code for changes like "make the bar race rounds punchier — anticipation hold for 0.5s, then ease-out race over 1.2s, winner bar overshoots 5% and settles."

## Step 4 — Later phases

Run phases 2–5 from PROJECT_PLAN.md one at a time, each as its own Claude Code session, always starting with "Read PROJECT_PLAN.md and CLAUDE.md, then execute Phase N."

## Assets you must source yourself (legal reasons)

Drop into `assets/` before real renders: 2–3 looping music tracks (YouTube Audio Library is free and safe), SFX pack (whoosh, ding, impact, drumroll, cash, confetti — freesound.org CC0), one display font + one text font (Google Fonts), and product cutout images from manufacturer press kits.
