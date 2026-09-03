// Local mirror of packages/schema scoring + result types so the static site
// stays dependency-free. Published runs live at
// public/results/<task-id>/<model-id>/result.json (one JSON per run) and are
// aggregated at build time via import.meta.glob — there is no index.json.

export interface CheckResult {
  id: string;
  pass: boolean;
  weight: number;
  details?: string;
}

export interface RunResult {
  runId: string;
  taskId: string;
  modelId: string;
  harness: string;
  status: "ok" | "error" | "timeout";
  durationMs: number;
  costUsd: number | null;
  checks: CheckResult[];
  llmJudge: { score: number; rubric: string; judgeModel: string; rationale: string } | null;
  manual: { score: number; notes: string } | null;
  artifacts: { html?: string; screenshot?: string; log?: string };
}

export interface PublishedModel {
  id: string;
  displayName: string;
  harness: string;
}

export interface PublishedTask {
  id: string;
  title: string;
  kind: string;
}

export interface PublishedEntry {
  publishedAt: string;
  judgeModel: string;
  harnessVersions: { codex?: string; opencode?: string; grok?: string };
  model: PublishedModel;
  task: PublishedTask;
  result: RunResult;
}

export interface PublishedIndex {
  publishedAt: string;
  judgeModel: string;
  harnessVersions: { codex?: string; opencode?: string; grok?: string };
  models: PublishedModel[];
  tasks: PublishedTask[];
  results: RunResult[];
}

export interface TaskWeights {
  checks: number;
  llmJudge: number;
  manual: number;
}

// Default weights used for display when task.json isn't published.
export const DEFAULT_WEIGHTS: TaskWeights = { checks: 0.4, llmJudge: 0.4, manual: 0.2 };

/** Aggregate per-run entries (public/results/<task>/<model>/result.json). */
export function indexFromEntries(entries: PublishedEntry[]): PublishedIndex | null {
  if (entries.length === 0) return null;
  const models = new Map<string, PublishedModel>();
  const tasks = new Map<string, PublishedTask>();
  for (const e of entries) {
    if (!models.has(e.model.id)) models.set(e.model.id, e.model);
    if (!tasks.has(e.task.id)) tasks.set(e.task.id, e.task);
  }
  const publishedAt = entries.map((e) => e.publishedAt).sort().at(-1) ?? entries[0].publishedAt;
  const harnessVersions: PublishedIndex["harnessVersions"] = {};
  for (const e of entries) Object.assign(harnessVersions, e.harnessVersions);
  return {
    publishedAt,
    judgeModel: entries[0].judgeModel,
    harnessVersions,
    models: [...models.values()].sort((a, b) => a.id.localeCompare(b.id)),
    tasks: [...tasks.values()].sort((a, b) => a.id.localeCompare(b.id)),
    results: entries.map((e) => e.result),
  };
}

/**
 * Load every published run bundled at build time.
 * Pattern mirrors the publish layout: results/<task-id>/<model-id>/result.json.
 */
export function loadBundledEntries(): PublishedEntry[] {
  const modules = import.meta.glob<{ default: PublishedEntry }>(
    "../../public/results/*/*/result.json",
    { eager: true },
  );
  return Object.values(modules).map((m) => m.default);
}

/** Legacy fallback: the old single public/results/index.json. */
export async function fetchLegacyIndex(): Promise<PublishedIndex | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}results/index.json`, { cache: "no-store" });
    if (!res.ok) return null;
    const index = (await res.json()) as PublishedIndex;
    if (!index.results || index.results.length === 0) return null;
    return index;
  } catch {
    return null;
  }
}

export function checksScore(checks: CheckResult[]): number | null {
  const total = checks.reduce((s, c) => s + c.weight, 0);
  if (total <= 0) return null;
  const earned = checks.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
  return (earned / total) * 10;
}

export function compositeScore(
  result: Pick<RunResult, "checks" | "llmJudge" | "manual">,
  weights: TaskWeights = DEFAULT_WEIGHTS,
): { composite: number | null; reviewed: boolean; checks: number | null; judge: number | null; manual: number | null } {
  const c = checksScore(result.checks);
  const j = result.llmJudge ? result.llmJudge.score : null;
  const m = result.manual ? result.manual.score : null;
  const parts = [
    { score: c, weight: weights.checks },
    { score: j, weight: weights.llmJudge },
    { score: m, weight: weights.manual },
  ];
  const usable = parts.filter((x): x is { score: number; weight: number } => x.score !== null && x.weight > 0);
  const total = usable.reduce((s, x) => s + x.weight, 0);
  if (total <= 0) return { composite: null, reviewed: m !== null, checks: c, judge: j, manual: m };
  const composite = usable.reduce((s, x) => s + x.score * x.weight, 0) / total;
  return { composite, reviewed: m !== null, checks: c, judge: j, manual: m };
}

export function formatScore(v: number | null): string {
  return v === null ? "—" : v.toFixed(1);
}
