# Using understand-anything on this repo

`understand-anything` builds a searchable knowledge graph of this codebase (files, functions,
architecture layers, cross-package relationships) and gives you a couple of ways to explore it.
It's a Claude Code plugin — not part of the versus-engine app itself — so nothing here ships to
`apps/` or affects `pnpm build`/`pnpm render`.

Graph data for this project lives in `.ua/` at the repo root (`knowledge-graph.json`,
`fingerprints.json`, `meta.json`). That directory is local scratch state, not something to commit
or hand-edit.

## 1. Build (or rebuild) the graph

```
/understand
```

Run this from Claude Code at the repo root. It scans the monorepo (`apps/`, `packages/`,
`database/`, etc.) and writes/refreshes `.ua/knowledge-graph.json`. Re-run it after large
structural changes (new package, renamed scenes, schema changes) so the graph doesn't go stale —
the dashboard and chat below only reflect whatever was last analyzed.

## 2. Browse it visually

```
/understand-dashboard
```

(equivalently, ask for "understand-anything serve"). This starts a local Vite dev server and
prints a URL with an access token baked in, e.g.:

```
🔑  Dashboard URL: http://127.0.0.1:5174/?token=<token>
```

Open that exact URL (the `?token=` part is required — without it you'll hit an "Access Token
Required" gate). The dashboard renders the graph as an interactive node/edge diagram: click
through files, layers, and "god nodes" (the most-connected architectural hubs) to see how
`apps/studio`'s scenes, `packages/shared`'s timing/schema, `packages/comparison`, and
`apps/workers`' queues relate to each other.

The server runs in the foreground of a background shell — just ask to stop it (or it can be
killed directly) when you're done; it doesn't need to stay running between sessions.

## 3. Ask questions instead of clicking around

```
/understand-chat
```

Query the graph in plain English — e.g. "what calls `computeSceneBoundariesSec`?" or "what would
break if I changed the `VideoInput` schema?" — without opening the dashboard.

## 4. Other entry points worth knowing about

| Command | What it's for |
|---|---|
| `/understand-diff` | Explain a git diff/PR in terms of the graph — what changed, what it touches, blast radius |
| `/understand-explain` | Deep-dive a specific file or function |
| `/understand-domain` | Extract business-domain flow (e.g. the render pipeline, ingestion pipeline) as its own graph |
| `/understand-onboard` | Generate an onboarding walkthrough for someone new to the repo |

All of these read the same `.ua/knowledge-graph.json` built in step 1 — run `/understand` first
if a command says no graph was found.
