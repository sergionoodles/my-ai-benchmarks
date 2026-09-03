# My AI Coding Benchmark (personal lab)

Personal, opinionated benchmark for comparing (model, harness) pairs on tasks that matter to me. Not a generic suite.

## Layout

- `apps/web` — static Vite + React site reading `public/results/<task>/<model>/result.json`
  (one JSON per run, aggregated at build time via `import.meta.glob`).
- `packages/bench` — Node CLI: run / review / publish.
- `packages/schema` — shared Zod schemas.
- `catalog/models/*.json` — model configs.
- `catalog/tasks/<id>/` — task.md + task.json + fixture/ + checks/.
- `runs/<model>/<task>/` — local executions (gitignored). The run id is
  `<model>/<task>` — re-running a pair overwrites it.
- `apps/web/public/results/<task>/<model>/` — published snapshot for the static site.

## Quickstart

```sh
pnpm install
pnpm bench run --task landing-page --model gpt-5-codex
pnpm bench review
pnpm bench publish --all
pnpm --filter @lab/web dev
```

## Publish

```sh
pnpm bench publish --all            # publish all runs (override)
pnpm bench publish <model>          # publish all runs for one model (override)
pnpm bench publish <model>/<task>   # publish a single run (override)
```
