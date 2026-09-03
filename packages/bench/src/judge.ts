import type { CheckResult, LlmJudge } from "@lab/schema";
import { judgeModel } from "./config.js";

// v0 stub judge: deterministic pseudo-score so the pipeline + site work
// end-to-end before wiring a real judge LLM. Replace with a real call later.
export function stubJudge(
  taskId: string,
  modelId: string,
  checks: CheckResult[],
): LlmJudge {
  const passed = checks.filter((c) => c.pass).length;
  const total = Math.max(1, checks.length);
  const base = 4 + (6 * passed) / total; // 4..10
  // Small deterministic jitter from ids so models don't tie exactly.
  let h = 0;
  for (const ch of `${taskId}:${modelId}`) h = (h * 31 + ch.charCodeAt(0)) % 100;
  const score = Math.round(Math.min(10, Math.max(0, base + (h % 5) * 0.2 - 0.4)) * 10) / 10;
  return {
    score,
    rubric: "v0 stub rubric: structure, completeness, taste (placeholder — wire a real judge LLM next).",
    judgeModel: judgeModel(),
    rationale: `Stub judge for ${modelId} on ${taskId}: ${passed}/${total} checks passed. This is a placeholder rationale — wire a real judge LLM to get qualitative scoring.`,
  };
}
