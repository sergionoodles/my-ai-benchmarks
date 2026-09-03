#!/usr/bin/env node
import fs from "node:fs";
import { paths } from "./config.js";
import { loadModels, loadTasks } from "./loaders.js";
import { runOnePair } from "./run.js";
import { publishPairs, type PublishSelector } from "./publish.js";
import { listUnreviewed, setManualScore } from "./review.js";

const p = paths();

function usage(): string {
  return [
    "bench <command> [options]",
    "",
    "Runs are identified by <model>/<task> — re-running a pair overwrites it.",
    "",
    "Commands:",
    "  run [--task <id>] [--model <id>] [--all]",
    "  review [--task <id> --model <id> --score <0-10> --notes <text>]",
    "  publish --all | --model <id> [--task <id>] | <model>[/<task>]",
    "",
    "Examples:",
    "  bench run --task landing-page --model gpt-5-codex",
    "  bench run --all",
    '  bench review --task landing-page --model gpt-5-codex --score 7 --notes "Nice hero."',
    "  bench publish --all",
    "  bench publish gpt-5-codex",
    "  bench publish gpt-5-codex/landing-page",
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
        task,
        model,
      });
      console.log(`ok ${dir}`);
    }
  }
  console.log(`done (${selTasks.length} tasks x ${selModels.length} models)`);
}

async function cmdReview(): Promise<void> {
  const taskId = arg("--task");
  const modelId = arg("--model");
  const scoreRaw = arg("--score");
  const notes = arg("--notes") ?? "";

  if (taskId && modelId && scoreRaw !== undefined) {
    const score = Number(scoreRaw);
    if (!Number.isFinite(score) || score < 0 || score > 10) {
      throw new Error("--score must be a number between 0 and 10");
    }
    const updated = setManualScore(p.runs, taskId, modelId, score, notes);
    console.log(`ok ${updated}`);
    return;
  }
  const pending = listUnreviewed(p.runs);
  if (pending.length === 0) {
    console.log(`all reviewed`);
    return;
  }
  console.log(`${pending.length} unreviewed`);
  for (const line of pending) console.log(`- ${line}`);
  console.log(`Set a score: bench review --task <id> --model <id> --score <0-10> --notes "<text>"`);
}

function parsePublishSelector(cmdArgs: string[]): PublishSelector {
  const all = has("--all");
  const modelFlag = arg("--model");
  const taskFlag = arg("--task");
  // First non-flag arg after the command, e.g. "gpt-5-codex" or "model/task".
  // Flag values must be skipped — only bare positionals count.
  const takesValue = new Set(["--model", "--task"]);
  let positional: string | undefined;
  for (let i = 0; i < cmdArgs.length; i++) {
    const a = cmdArgs[i];
    if (takesValue.has(a)) {
      i++;
      continue;
    }
    if (a.startsWith("-")) continue;
    positional = a;
    break;
  }

  if (all) {
    if (modelFlag || taskFlag || positional) {
      throw new Error("usage: bench publish --all | --model <id> [--task <id>] | <model>[/<task>]");
    }
    return { kind: "all" };
  }

  let model = modelFlag;
  let task = taskFlag;
  if (positional) {
    if (model || task) {
      throw new Error("usage: bench publish --all | --model <id> [--task <id>] | <model>[/<task>]");
    }
    const parts = positional.split("/");
    if (parts.length === 1) model = parts[0];
    else if (parts.length === 2) [model, task] = parts;
    else throw new Error(`invalid selector: ${positional} (expected <model>[/<task>])`);
  }

  if (!model && !task) {
    throw new Error("usage: bench publish --all | --model <id> [--task <id>] | <model>[/<task>]");
  }
  if (task && !model) {
    throw new Error("--task requires --model (runs are identified by <model>/<task>)");
  }
  if (model && task) return { kind: "pair", model, task };
  return { kind: "model", model: model as string };
}

async function cmdPublish(cmdArgs: string[]): Promise<void> {
  const selector = parsePublishSelector(cmdArgs);
  const written = await publishPairs({
    root: p.root,
    runsDir: p.runs,
    tasksDir: p.catalogTasks,
    modelsDir: p.catalogModels,
    webResultsDir: p.webResults,
    selector,
  });
  for (const w of written) console.log(`ok ${w}`);
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  const cmdArgs = process.argv.slice(3);
  if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") {
    console.log(usage());
    return;
  }
  if (cmd === "run") await cmdRun();
  else if (cmd === "review") await cmdReview();
  else if (cmd === "publish") await cmdPublish(cmdArgs);
  else throw new Error(`unknown command: ${cmd}\n\n${usage()}`);
}

main().catch((err) => {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
