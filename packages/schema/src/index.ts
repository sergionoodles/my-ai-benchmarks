import { z } from "zod";

// ---------------------------------------------------------------------------
// Model config: catalog/models/*.json
// ---------------------------------------------------------------------------

export const HarnessSchema = z.enum(["codex", "opencode", "grok"]);
export type Harness = z.infer<typeof HarnessSchema>;

export const ModelConfigSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  harness: HarnessSchema,
  model: z.string().min(1),
  reasoningEffort: z.enum(["low", "medium", "high", "xhigh"]).optional(),
  timeoutSec: z.number().int().positive(),
  costModel: z
    .object({
      inputPerMtok: z.number().nonnegative().optional(),
      outputPerMtok: z.number().nonnegative().optional(),
    })
    .optional(),
  notes: z.string().optional(),
});
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// ---------------------------------------------------------------------------
// Task config: catalog/tasks/<id>/task.json
// ---------------------------------------------------------------------------

export const TaskKindSchema = z.enum(["code", "ui", "mixed"]);
export type TaskKind = z.infer<typeof TaskKindSchema>;

export const CheckDefSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  weight: z.number().nonnegative(),
  config: z.record(z.unknown()).default({}),
});
export type CheckDef = z.infer<typeof CheckDefSchema>;

export const TaskWeightsSchema = z.object({
  checks: z.number().min(0).max(1),
  llmJudge: z.number().min(0).max(1),
  manual: z.number().min(0).max(1),
});
export type TaskWeights = z.infer<typeof TaskWeightsSchema>;

export const TaskConfigSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: TaskKindSchema,
  description: z.string().default(""),
  weights: TaskWeightsSchema,
  timeoutSec: z.number().int().positive(),
  screenshot: z.boolean().default(false),
  iframePath: z.string().default("preview.html"),
  fixturePath: z.string().default("fixture"),
  checks: z.array(CheckDefSchema).default([]),
});
export type TaskConfig = z.infer<typeof TaskConfigSchema>;

// ---------------------------------------------------------------------------
// Run result: runs/<model-id>/<task-id>/<run-id>/result.json
// ---------------------------------------------------------------------------

export const RunStatusSchema = z.enum(["ok", "error", "timeout"]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const CheckResultSchema = z.object({
  id: z.string(),
  pass: z.boolean(),
  weight: z.number().nonnegative(),
  details: z.string().optional(),
});
export type CheckResult = z.infer<typeof CheckResultSchema>;

export const LlmJudgeSchema = z.object({
  score: z.number().min(0).max(10),
  rubric: z.string(),
  judgeModel: z.string(),
  rationale: z.string(),
});
export type LlmJudge = z.infer<typeof LlmJudgeSchema>;

export const ManualScoreSchema = z.object({
  score: z.number().min(0).max(10),
  notes: z.string(),
});
export type ManualScore = z.infer<typeof ManualScoreSchema>;

export const ArtifactsSchema = z.object({
  html: z.string().optional(),
  screenshot: z.string().optional(),
  log: z.string().optional(),
});
export type Artifacts = z.infer<typeof ArtifactsSchema>;

export const RunResultSchema = z.object({
  runId: z.string().min(1),
  taskId: z.string().min(1),
  modelId: z.string().min(1),
  harness: z.string().min(1),
  status: RunStatusSchema,
  durationMs: z.number().nonnegative(),
  costUsd: z.number().nonnegative().nullable(),
  checks: z.array(CheckResultSchema),
  llmJudge: LlmJudgeSchema.nullable(),
  manual: ManualScoreSchema.nullable(),
  artifacts: ArtifactsSchema,
});
export type RunResult = z.infer<typeof RunResultSchema>;

// ---------------------------------------------------------------------------
// Published index: apps/web/public/results/index.json
// ---------------------------------------------------------------------------

export const PublishedModelSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  harness: z.string(),
});
export type PublishedModel = z.infer<typeof PublishedModelSchema>;

export const PublishedTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
});
export type PublishedTask = z.infer<typeof PublishedTaskSchema>;

export const PublishedIndexSchema = z.object({
  publishedAt: z.string(),
  runId: z.string(),
  judgeModel: z.string(),
  harnessVersions: z.object({
    codex: z.string().optional(),
    opencode: z.string().optional(),
    grok: z.string().optional(),
  }),
  models: z.array(PublishedModelSchema),
  tasks: z.array(PublishedTaskSchema),
  results: z.array(RunResultSchema),
});
export type PublishedIndex = z.infer<typeof PublishedIndexSchema>;

// ---------------------------------------------------------------------------
// Scoring helper (shared by CLI + web so numbers match).
// ---------------------------------------------------------------------------

export interface CompositeBreakdown {
  checksScore: number | null; // 0..10
  judgeScore: number | null; // 0..10
  manualScore: number | null; // 0..10
  composite: number | null; // 0..10
  reviewed: boolean;
}

export function checksScore(checks: CheckResult[]): number | null {
  const total = checks.reduce((s, c) => s + c.weight, 0);
  if (total <= 0) return null;
  const earned = checks.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
  return (earned / total) * 10;
}

export function compositeScore(
  result: Pick<RunResult, "checks" | "llmJudge" | "manual">,
  weights: TaskWeights,
): CompositeBreakdown {
  const c = checksScore(result.checks);
  const j = result.llmJudge ? result.llmJudge.score : null;
  const m = result.manual ? result.manual.score : null;
  const reviewed = m !== null;

  // Renormalize weights over available components so a missing manual
  // score still yields a partial composite. UI marks it "unreviewed".
  const parts: Array<{ score: number | null; weight: number }> = [
    { score: c, weight: weights.checks },
    { score: j, weight: weights.llmJudge },
    { score: m, weight: weights.manual },
  ];
  const usable = parts.filter((p) => p.score !== null && p.weight > 0);
  const wTotal = usable.reduce((s, p) => s + p.weight, 0);
  if (wTotal <= 0) {
    return { checksScore: c, judgeScore: j, manualScore: m, composite: null, reviewed };
  }
  const composite =
    usable.reduce((s, p) => s + (p.score as number) * p.weight, 0) / wTotal;
  return { checksScore: c, judgeScore: j, manualScore: m, composite, reviewed };
}
