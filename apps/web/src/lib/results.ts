// Local mirror of packages/schema scoring + result types so the static site
// stays dependency-free (reads only public/results/index.json at runtime).

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

export interface PublishedIndex {
  publishedAt: string;
  runId: string;
  judgeModel: string;
  harnessVersions: { codex?: string; opencode?: string; grok?: string };
  models: Array<{ id: string; displayName: string; harness: string }>;
  tasks: Array<{ id: string; title: string; kind: string }>;
  results: RunResult[];
}

export interface TaskWeights {
  checks: number;
  llmJudge: number;
  manual: number;
}

// Default weights used for display when task.json isn't published.
// The publish step could embed weights later; for v1 the site uses these.
export const DEFAULT_WEIGHTS: TaskWeights = { checks: 0.4, llmJudge: 0.4, manual: 0.2 };

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
