# My AI Coding Benchmark (personal lab)

Personal, opinionated benchmark for comparing (model, harness) pairs on tasks that matter to me. Not a generic suite.

## Layout

- `apps/web` — static Vite + React site reading `public/results/index.json`.
- `packages/bench` — Node CLI: run / review / publish.
- `packages/schema` — shared Zod schemas.
- `catalog/models/*.json` — model configs.
- `catalog/tasks/<id>/` — task.md + task.json + fixture/ + checks/.
- `runs/` — local executions (gitignored).
- `apps/web/public/results/` — published snapshot for the static site.

## Quickstart

```sh
pnpm install
pnpm bench run --task landing-page --model gpt-5-codex
pnpm bench review
pnpm bench publish
pnpm --filter @lab/web dev
```
