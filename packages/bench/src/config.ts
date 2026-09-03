import path from "node:path";
import { fileURLToPath } from "node:url";

export function repoRoot(): string {
  // packages/bench/src -> repo root (two levels up from dist, but robust for src+dist)
  const here = path.dirname(fileURLToPath(import.meta.url));
  // dist/cli.js => ../../.. ; src/*.ts => ../..
  const maybeSrc = path.resolve(here, "../..");
  // If we are in dist, maybeSrc is packages/bench; root is one more up... handle both:
  if (path.basename(maybeSrc) === "bench") return path.resolve(maybeSrc, "../..");
  return path.resolve(here, "../../..");
}

export const paths = (root = repoRoot()) => ({
  root,
  catalogModels: path.join(root, "catalog/models"),
  catalogTasks: path.join(root, "catalog/tasks"),
  runs: path.join(root, "runs"),
  webResults: path.join(root, "apps/web/public/results"),
});

export const judgeModel = () =>
  process.env.BENCH_JUDGE_MODEL ?? "stub-judge-v0";

export function newRunId(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
  const t = `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  return `${d}-${t}`;
}
