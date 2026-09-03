import fs from "node:fs";
import path from "node:path";
import {
  ModelConfigSchema,
  RunResultSchema,
  TaskConfigSchema,
  runIdFor,
  type ModelConfig,
  type RunResult,
  type TaskConfig,
} from "@lab/schema";

export function loadModels(modelsDir: string): ModelConfig[] {
  if (!fs.existsSync(modelsDir)) return [];
  return fs
    .readdirSync(modelsDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const raw = JSON.parse(fs.readFileSync(path.join(modelsDir, f), "utf8"));
      return ModelConfigSchema.parse(raw);
    });
}

export function loadTask(taskDir: string): { config: TaskConfig; prompt: string } {
  const config = TaskConfigSchema.parse(
    JSON.parse(fs.readFileSync(path.join(taskDir, "task.json"), "utf8")),
  );
  const prompt = fs.readFileSync(path.join(taskDir, "task.md"), "utf8");
  return { config, prompt };
}

export function loadTasks(tasksDir: string): Array<{ config: TaskConfig; prompt: string }> {
  if (!fs.existsSync(tasksDir)) return [];
  return fs
    .readdirSync(tasksDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    // Skip the special samples/ archive folder — it holds example tasks,
    // not runnable ones — plus any other dir without a task.json pair.
    .filter((id) => id !== "samples" && fs.existsSync(path.join(tasksDir, id, "task.json")))
    .map((id) => loadTask(path.join(tasksDir, id)));
}

/** New layout: runs/<modelId>/<taskId>/result.json (run id = "model/task"). */
export function resultDir(runsDir: string, modelId: string, taskId: string): string {
  return path.join(runsDir, modelId, taskId);
}

function readResultFile(p: string): RunResult | null {
  try {
    return RunResultSchema.parse(JSON.parse(fs.readFileSync(p, "utf8")));
  } catch {
    return null;
  }
}

/**
 * Read one pair. Falls back to the legacy timestamped layout
 * (runs/<model>/<task>/<runId>/result.json, newest first) so local runs
 * made before the rework are still visible until re-run.
 */
export function readPairResult(
  runsDir: string,
  modelId: string,
  taskId: string,
): { result: RunResult; dir: string } | null {
  const direct = path.join(resultDir(runsDir, modelId, taskId), "result.json");
  if (fs.existsSync(direct)) {
    const r = readResultFile(direct);
    if (r) return { result: r, dir: path.dirname(direct) };
  }
  const legacyBase = path.join(runsDir, modelId, taskId);
  let ents: fs.Dirent[];
  try {
    ents = fs.readdirSync(legacyBase, { withFileTypes: true });
  } catch {
    return null;
  }
  const legacyDirs = ents
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  for (let i = legacyDirs.length - 1; i >= 0; i--) {
    const p = path.join(legacyBase, legacyDirs[i], "result.json");
    if (!fs.existsSync(p)) continue;
    const r = readResultFile(p);
    if (r) return { result: r, dir: path.dirname(p) };
  }
  return null;
}

/** List every available pair result (new layout first, legacy fallback). */
export function listPairResults(
  runsDir: string,
): Array<{ result: RunResult; dir: string; modelId: string; taskId: string }> {
  if (!fs.existsSync(runsDir)) return [];
  const out: Array<{ result: RunResult; dir: string; modelId: string; taskId: string }> = [];
  const seen = new Set<string>();
  for (const modelEnt of fs.readdirSync(runsDir, { withFileTypes: true })) {
    if (!modelEnt.isDirectory()) continue;
    const modelId = modelEnt.name;
    const modelDir = path.join(runsDir, modelId);
    let taskEnts: fs.Dirent[];
    try {
      taskEnts = fs.readdirSync(modelDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const taskEnt of taskEnts) {
      if (!taskEnt.isDirectory()) continue;
      const taskId = taskEnt.name;
      const key = `${modelId}/${taskId}`;
      if (seen.has(key)) continue;
      const found = readPairResult(runsDir, modelId, taskId);
      // Only accept pairs whose result matches the directory names (or the
      // canonical run id), so stray dirs are ignored.
      if (
        found &&
        (found.result.runId === runIdFor(modelId, taskId) ||
          (found.result.modelId === modelId && found.result.taskId === taskId))
      ) {
        seen.add(key);
        out.push({ ...found, modelId, taskId });
      }
    }
  }
  out.sort((a, b) =>
    a.modelId === b.modelId
      ? a.taskId.localeCompare(b.taskId)
      : a.modelId.localeCompare(b.modelId),
  );
  return out;
}
