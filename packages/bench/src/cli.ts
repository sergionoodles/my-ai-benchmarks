#!/usr/bin/env node
import fs from "node:fs";
import { newRunId, paths } from "./config.js";
import { loadModels, loadTasks } from "./loaders.js";
import { runOnePair } from "./run.js";
import { publishLatest } from "./publish.js";
import { listUnreviewed, resolveRunId, setManualScore } from "./review.js";

const p = paths();

function usage(): string {
  return [
    "bench <command> [options]",
    "",
    "Commands:",
    "  run [--task <id>] [--model <id>] [--all] [--run-id <id>]",
    "  review [--run-id <id>] [--task <id> --model <id> --score <0-10> --notes <text>]",
    "  publish [--run-id <id>]",
    "",
    "Examples:",
    "  bench run --task landing-page --model gpt-5-codex",
    "  bench run --all",
    '  bench review --task landing-page --model gpt-5-codex --score 7 --notes "Nice hero."',
    "  bench publish",
  ].join("\n");
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function has(flag: string): boolean {
  return process.argv.includes(flag);
}

async function cmdRun(): Promise<void> {
  const all = has("--all");
  const taskId = arg("--task");
  const modelId = arg("--model");
  const runId = arg("--run-id") ?? newRunId();

  const models = loadModels(p.catalogModels);
  const tasks = loadTasks(p.catalogTasks);
  if (models.length === 0) throw new Error(`no models in ${p.catalogModels}`);
  if (tasks.length === 0) throw new Error(`no tasks in ${p.catalogTasks}`);

  let selTasks = tasks;
  let selModels = models;
  if (!all) {
    if (!taskId || !modelId) {
      throw new Error("usage: bench run --task <id> --model <id>  (or --all)");
    }
    selTasks = tasks.filter((t) => t.config.id === taskId);
    selModels = models.filter((m) => m.id === modelId);
    if (selTasks.length === 0) throw new Error(`unknown task: ${taskId}`);
    if (selModels.length === 0) throw new Error(`unknown model: ${modelId}`);
  } else {
    if (taskId) selTasks = tasks.filter((t) => t.config.id === taskId);
    if (modelId) selModels = models.filter((m) => m.id === modelId);
  }

  fs.mkdirSync(p.runs, { recursive: true });
  for (const task of selTasks) {
    for (const model of selModels) {
      const dir = await runOnePair({
        root: p.root,
        runsDir: p.runs,
        tasksDir: p.catalogTasks,
        runId,
        task,
        model,
      });
      console.log(`ok ${dir}`);
    }
  }
  console.log(`run ${runId} done (${selTasks.length} tasks x ${selModels.length} models)`);
}

async function cmdReview(): Promise<void> {
  const runId = resolveRunId(p.runs, arg("--run-id"));
  const taskId = arg("--task");
  const modelId = arg("--model");
  const scoreRaw = arg("--score");
  const notes = arg("--notes") ?? "";

  if (taskId && modelId && scoreRaw !== undefined) {
    const score = Number(scoreRaw);
    if (!Number.isFinite(score) || score < 0 || score > 10) {
      throw new Error("--score must be a number between 0 and 10");
    }
    const updated = setManualScore(p.runs, runId, taskId, modelId, score, notes);
    console.log(`ok ${updated}`);
    return;
  }
  const pending = listUnreviewed(p.runs, runId);
  if (pending.length === 0) {
    console.log(`run ${runId}: all reviewed`);
    return;
  }
  console.log(`run ${runId}: ${pending.length} unreviewed`);
  for (const line of pending) console.log(`- ${line}`);
  console.log(`Set a score: bench review --task <id> --model <id> --score <0-10> --notes "<text>"`);
}

async function cmdPublish(): Promise<void> {
  const indexPath = await publishLatest({
    root: p.root,
    runsDir: p.runs,
    tasksDir: p.catalogTasks,
    modelsDir: p.catalogModels,
    webResultsDir: p.webResults,
    runId: arg("--run-id"),
  });
  console.log(`ok ${indexPath}`);
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") {
    console.log(usage());
    return;
  }
  if (cmd === "run") await cmdRun();
  else if (cmd === "review") await cmdReview();
  else if (cmd === "publish") await cmdPublish();
  else throw new Error(`unknown command: ${cmd}\n\n${usage()}`);
}

main().catch((err) => {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
