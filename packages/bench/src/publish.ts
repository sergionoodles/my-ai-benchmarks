import fs from "node:fs";
import path from "node:path";
import {
  PublishedEntrySchema,
  RunResultSchema,
  type PublishedEntry,
} from "@lab/schema";
import { judgeModel } from "./config.js";
import { loadModels, loadTasks, readPairResult } from "./loaders.js";
import { codexAdapter } from "./harnesses/codex.js";
import { grokAdapter } from "./harnesses/grok.js";
import { opencodeAdapter } from "./harnesses/opencode.js";

function copyIfExists(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

export type PublishSelector =
  | { kind: "all" }
  | { kind: "model"; model: string }
  | { kind: "pair"; model: string; task: string };

export async function publishPairs(opts: {
  root: string;
  runsDir: string;
  tasksDir: string;
  modelsDir: string;
  webResultsDir: string;
  selector: PublishSelector;
}): Promise<string[]> {
  const models = loadModels(opts.modelsDir);
  const tasks = loadTasks(opts.tasksDir);
  if (models.length === 0) throw new Error(`no models in ${opts.modelsDir}`);
  if (tasks.length === 0) throw new Error(`no tasks in ${opts.tasksDir}`);

  const selector = opts.selector;
  let pairs: Array<{ modelId: string; taskId: string }>;
  if (selector.kind === "all") {
    pairs = models.flatMap((m) => tasks.map((t) => ({ modelId: m.id, taskId: t.config.id })));
  } else if (selector.kind === "model") {
    if (!models.some((m) => m.id === selector.model)) {
      throw new Error(`unknown model: ${selector.model}`);
    }
    pairs = tasks.map((t) => ({ modelId: selector.model, taskId: t.config.id }));
  } else {
    pairs = [{ modelId: selector.model, taskId: selector.task }];
  }

  const [codex, opencode, grok] = await Promise.all([
    codexAdapter.version().catch(() => undefined),
    opencodeAdapter.version().catch(() => undefined),
    grokAdapter.version().catch(() => undefined),
  ]);
  const harnessVersions = {
    ...(codex ? { codex } : {}),
    ...(opencode ? { opencode } : {}),
    ...(grok ? { grok } : {}),
  };

  const written: string[] = [];
  const missing: string[] = [];
  for (const { modelId, taskId } of pairs) {
    const found = readPairResult(opts.runsDir, modelId, taskId);
    if (!found) {
      missing.push(`${modelId}/${taskId}`);
      continue;
    }
    const r = RunResultSchema.parse(found.result);
    const model = models.find((m) => m.id === modelId);
    const task = tasks.find((t) => t.config.id === taskId);
    if (!model || !task) {
      missing.push(`${modelId}/${taskId}`);
      continue;
    }

    // Incremental publish: only touch this pair's folder (override).
    const destDir = path.join(opts.webResultsDir, taskId, modelId);
    fs.mkdirSync(destDir, { recursive: true });
    const artifacts: Record<string, string> = {};
    if (r.artifacts.html) {
      copyIfExists(path.join(found.dir, r.artifacts.html), path.join(destDir, "preview.html"));
      artifacts.html = `results/${taskId}/${modelId}/preview.html`;
    }
    if (r.artifacts.screenshot) {
      copyIfExists(path.join(found.dir, r.artifacts.screenshot), path.join(destDir, "screenshot.png"));
      artifacts.screenshot = `results/${taskId}/${modelId}/screenshot.png`;
    }
    if (r.artifacts.log) {
      copyIfExists(path.join(found.dir, r.artifacts.log), path.join(destDir, "agent.log"));
      artifacts.log = `results/${taskId}/${modelId}/agent.log`;
    }

    const entry: PublishedEntry = {
      publishedAt: new Date().toISOString(),
      judgeModel: judgeModel(),
      harnessVersions,
      model: { id: model.id, displayName: model.displayName, harness: model.harness },
      task: { id: task.config.id, title: task.config.title, kind: task.config.kind },
      result: { ...r, artifacts },
    };
    const parsed = PublishedEntrySchema.parse(entry);
    const outPath = path.join(destDir, "result.json");
    fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
    written.push(outPath);
  }

  // The old single huge index.json is gone — remove it if left over.
  const legacyIndex = path.join(opts.webResultsDir, "index.json");
  if (fs.existsSync(legacyIndex)) fs.rmSync(legacyIndex);

  if (written.length === 0) {
    throw new Error(
      `no results to publish in ${opts.runsDir}` +
        (missing.length ? ` (missing: ${missing.join(", ")})` : "") +
        ` — run 'bench run' first`,
    );
  }
  if (missing.length > 0) {
    console.warn(`warn: no run found for ${missing.join(", ")} — skipped`);
  }
  return written;
}
