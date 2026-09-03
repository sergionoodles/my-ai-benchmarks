import fs from "node:fs";
import path from "node:path";
import { ManualScoreSchema, RunResultSchema } from "@lab/schema";
import { listPairResults, readPairResult } from "./loaders.js";

export function listUnreviewed(runsDir: string): string[] {
  // Layout: runs/<modelId>/<taskId>/result.json (run id = "model/task").
  const out: string[] = [];
  for (const { result, dir, modelId, taskId } of listPairResults(runsDir)) {
    if (!result.manual) {
      out.push(`${taskId} / ${modelId} — preview: ${path.join(dir, "preview.html")}`);
    }
  }
  return out;
}

export function setManualScore(
  runsDir: string,
  taskId: string,
  modelId: string,
  score: number,
  notes: string,
): string {
  const found = readPairResult(runsDir, modelId, taskId);
  if (!found) {
    throw new Error(`result not found: runs/${modelId}/${taskId}/result.json`);
  }
  const dir = found.dir;
  const resultPath = path.join(dir, "result.json");
  const manual = ManualScoreSchema.parse({ score, notes });
  fs.writeFileSync(path.join(dir, "manualScore.json"), JSON.stringify(manual, null, 2));
  const result = RunResultSchema.parse(JSON.parse(fs.readFileSync(resultPath, "utf8")));
  result.manual = manual;
  fs.writeFileSync(resultPath, JSON.stringify(RunResultSchema.parse(result), null, 2));
  return resultPath;
}
