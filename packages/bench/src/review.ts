import fs from "node:fs";
import path from "node:path";
import { ManualScoreSchema, RunResultSchema } from "@lab/schema";
import { latestRunId } from "./loaders.js";

export function listUnreviewed(runsDir: string, runId: string): string[] {
  const runDir = path.join(runsDir, runId);
  const out: string[] = [];
  if (!fs.existsSync(runDir)) return out;
  for (const taskId of fs.readdirSync(runDir)) {
    const taskDir = path.join(runDir, taskId);
    if (!fs.statSync(taskDir).isDirectory()) continue;
    for (const modelId of fs.readdirSync(taskDir)) {
      const resultPath = path.join(taskDir, modelId, "result.json");
      if (!fs.existsSync(resultPath)) continue;
      try {
        const r = RunResultSchema.parse(JSON.parse(fs.readFileSync(resultPath, "utf8")));
        if (!r.manual) out.push(`${taskId} / ${modelId} — preview: ${path.join(taskDir, modelId, "preview.html")}`);
      } catch {
        // ignore invalid results in review listing
      }
    }
  }
  return out;
}

export function setManualScore(
  runsDir: string,
  runId: string,
  taskId: string,
  modelId: string,
  score: number,
  notes: string,
): string {
  const dir = path.join(runsDir, runId, taskId, modelId);
  const resultPath = path.join(dir, "result.json");
  if (!fs.existsSync(resultPath)) throw new Error(`result not found: ${resultPath}`);
  const manual = ManualScoreSchema.parse({ score, notes });
  fs.writeFileSync(path.join(dir, "manualScore.json"), JSON.stringify(manual, null, 2));
  const result = RunResultSchema.parse(JSON.parse(fs.readFileSync(resultPath, "utf8")));
  result.manual = manual;
  fs.writeFileSync(resultPath, JSON.stringify(RunResultSchema.parse(result), null, 2));
  return resultPath;
}

export function resolveRunId(runsDir: string, explicit?: string): string {
  if (explicit) return explicit;
  const latest = latestRunId(runsDir);
  if (!latest) throw new Error(`no runs found in ${runsDir} — run 'bench run' first`);
  return latest;
}
