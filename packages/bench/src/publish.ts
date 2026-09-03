import fs from "node:fs";
import path from "node:path";
import {
  PublishedIndexSchema,
  RunResultSchema,
  type PublishedIndex,
} from "@lab/schema";
import { judgeModel } from "./config.js";
import { latestRunId, loadModels, loadTasks } from "./loaders.js";
import { codexAdapter } from "./harnesses/codex.js";
import { opencodeAdapter } from "./harnesses/opencode.js";

function copyIfExists(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

export async function publishLatest(opts: {
  root: string;
  runsDir: string;
  tasksDir: string;
  modelsDir: string;
  webResultsDir: string;
  runId?: string;
}): Promise<string> {
  const runId = opts.runId ?? latestRunId(opts.runsDir);
  if (!runId) throw new Error(`no runs found in ${opts.runsDir} — run 'bench run' first`);
  const runDir = path.join(opts.runsDir, runId);
  if (!fs.existsSync(runDir)) throw new Error(`run not found: ${runDir}`);

  const models = loadModels(opts.modelsDir);
  const tasks = loadTasks(opts.tasksDir);

  // Collect result.json files under runs/<runId>/**.
  const results = [];
  for (const task of tasks) {
    for (const model of models) {
      const p = path.join(runDir, task.config.id, model.id, "result.json");
      if (fs.existsSync(p)) {
        results.push(RunResultSchema.parse(JSON.parse(fs.readFileSync(p, "utf8"))));
      }
    }
  }
  if (results.length === 0) throw new Error(`no results in ${runDir}`);

  // Fresh snapshot dir.
  fs.rmSync(opts.webResultsDir, { recursive: true, force: true });
  fs.mkdirSync(opts.webResultsDir, { recursive: true });

  // Copy artifacts per (task, model) and rewrite artifact refs to public URLs.
  const published = results.map((r) => {
    const srcDir = path.join(runDir, r.taskId, r.modelId);
    const destDir = path.join(opts.webResultsDir, r.taskId, r.modelId);
    fs.mkdirSync(destDir, { recursive: true });
    const artifacts: Record<string, string> = {};
    if (r.artifacts.html) {
      copyIfExists(path.join(srcDir, r.artifacts.html), path.join(destDir, "preview.html"));
      artifacts.html = `results/${r.taskId}/${r.modelId}/preview.html`;
    }
    if (r.artifacts.screenshot) {
      copyIfExists(path.join(srcDir, r.artifacts.screenshot), path.join(destDir, "screenshot.png"));
      artifacts.screenshot = `results/${r.taskId}/${r.modelId}/screenshot.png`;
    }
    if (r.artifacts.log) {
      copyIfExists(path.join(srcDir, r.artifacts.log), path.join(destDir, "agent.log"));
      artifacts.log = `results/${r.taskId}/${r.modelId}/agent.log`;
    }
    return { ...r, artifacts };
  });

  const [codex, opencode] = await Promise.all([
    codexAdapter.version().catch(() => undefined),
    opencodeAdapter.version().catch(() => undefined),
  ]);

  const index: PublishedIndex = {
    publishedAt: new Date().toISOString(),
    runId,
    judgeModel: judgeModel(),
    harnessVersions: {
      ...(codex ? { codex } : {}),
      ...(opencode ? { opencode } : {}),
    },
    models: models
      .filter((m) => published.some((r) => r.modelId === m.id))
      .map((m) => ({ id: m.id, displayName: m.displayName, harness: m.harness })),
    tasks: tasks
      .filter((t) => published.some((r) => r.taskId === t.config.id))
      .map((t) => ({ id: t.config.id, title: t.config.title, kind: t.config.kind })),
    results: published,
  };
  const parsed = PublishedIndexSchema.parse(index);
  const indexPath = path.join(opts.webResultsDir, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(parsed, null, 2));
  return indexPath;
}
