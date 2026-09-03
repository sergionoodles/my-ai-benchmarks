import fs from "node:fs";
import path from "node:path";
import {
  ModelConfigSchema,
  TaskConfigSchema,
  type ModelConfig,
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

export function latestRunId(runsDir: string): string | null {
  // Layout: runs/<modelId>/<taskId>/<timestamp>/result.json — the timestamp
  // (runId) is the leaf dir, scattered across model/task branches.
  if (!fs.existsSync(runsDir)) return null;
  const ids: string[] = [];
  for (const modelEnt of fs.readdirSync(runsDir, { withFileTypes: true })) {
    if (!modelEnt.isDirectory()) continue;
    const modelDir = path.join(runsDir, modelEnt.name);
    let taskEnts: fs.Dirent[];
    try {
      taskEnts = fs.readdirSync(modelDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const taskEnt of taskEnts) {
      if (!taskEnt.isDirectory()) continue;
      const taskDir = path.join(modelDir, taskEnt.name);
      let runEnts: fs.Dirent[];
      try {
        runEnts = fs.readdirSync(taskDir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const runEnt of runEnts) {
        if (runEnt.isDirectory()) ids.push(runEnt.name);
      }
    }
  }
  ids.sort();
  return ids.length ? ids[ids.length - 1] : null;
}
