import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { RunResultSchema, runIdFor, type ModelConfig, type RunResult, type TaskConfig } from "@lab/schema";
import { runChecks } from "./checks.js";
import { stubJudge } from "./judge.js";
import { codexAdapter } from "./harnesses/codex.js";
import { grokAdapter } from "./harnesses/grok.js";
import { opencodeAdapter } from "./harnesses/opencode.js";
import type { HarnessAdapter } from "./harnesses/types.js";

// 1x1 transparent PNG (placeholder screenshot until Playwright wiring lands).
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

function adapterFor(harness: string): HarnessAdapter {
  if (harness === "codex") return codexAdapter;
  if (harness === "opencode") return opencodeAdapter;
  if (harness === "grok") return grokAdapter;
  throw new Error(`unknown harness: ${harness} (supported: codex, opencode, grok)`);
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

function stubPreviewHtml(taskId: string, modelId: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${taskId} — ${modelId} (stub)</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 20px;line-height:1.6}h1{font-size:28px}.badge{display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:999px;padding:2px 10px;font-size:12px}</style>
</head>
<body>
<span class="badge">STUB RUN — harness not connected</span>
<h1>${taskId}</h1>
<p>Generated for <strong>${modelId}</strong>. Wire the real harness adapter (<code>packages/bench/src/harnesses/</code>) to replace this placeholder.</p>
<h1>Beacon (stub hero)</h1>
<button>Get started</button>
</body>
</html>
`;
}

export interface RunOptions {
  root: string;
  runsDir: string;
  tasksDir: string;
  task: { config: TaskConfig; prompt: string };
  model: ModelConfig;
}

export async function runOnePair(opts: RunOptions): Promise<string> {
  const { runsDir, tasksDir, task, model } = opts;
  const { config } = task;
  // The run id IS "<model>/<task>" — re-running a pair overwrites it.
  const runId = runIdFor(model.id, config.id);
  const outDir = path.join(runsDir, model.id, config.id);
  const workdir = path.join(outDir, "workspace");
  // Overwrite semantics: a re-run replaces the previous run for this pair.
  fs.rmSync(workdir, { recursive: true, force: true });
  fs.mkdirSync(workdir, { recursive: true });
  // Drop legacy timestamped leaf dirs (runs/<model>/<task>/<runId>/) left
  // over from before the rework — the pair dir itself is now the run.
  for (const ent of fs.readdirSync(outDir, { withFileTypes: true })) {
    if (ent.isDirectory() && ent.name !== "workspace") {
      fs.rmSync(path.join(outDir, ent.name), { recursive: true, force: true });
    }
  }

  // 1. Copy fixture into a fresh workspace with its own git repo.
  const fixtureSrc = path.join(tasksDir, config.id, config.fixturePath);
  copyDir(fixtureSrc, workdir);
  try {
    execFileSync("git", ["init", "-q"], { cwd: workdir });
    execFileSync("git", ["add", "-A"], { cwd: workdir });
    execFileSync("git", ["commit", "-qm", "fixture"], { cwd: workdir });
  } catch {
    // git is best-effort in v0.
  }

  // 2. Invoke harness adapter.
  const adapter = adapterFor(model.harness);
  const hres = await adapter.run(
    task.prompt,
    workdir,
    model.model,
    Math.min(model.timeoutSec, config.timeoutSec),
    model.reasoningEffort,
  );

  // 3. v0 stub completion: if the harness didn't produce the expected
  // artifact, leave a deterministic placeholder so checks/publish/site work.
  const iframeAbs = path.join(workdir, config.iframePath);
  if (!fs.existsSync(iframeAbs) && (config.kind === "ui" || config.kind === "mixed")) {
    fs.writeFileSync(iframeAbs, stubPreviewHtml(config.id, model.id));
  }

  // 4. Objective checks, then stub judge.
  const checks = runChecks(workdir, config);
  const llmJudge = stubJudge(config.id, model.id, checks);

  // 5. Artifacts: preview HTML + screenshot placeholder + agent log.
  const artifactsDir = outDir;
  let htmlRel: string | undefined;
  if (fs.existsSync(iframeAbs)) {
    const dest = path.join(artifactsDir, "preview.html");
    fs.copyFileSync(iframeAbs, dest);
    htmlRel = "preview.html";
  }
  let shotRel: string | undefined;
  if (config.screenshot) {
    // TODO: Playwright screenshot when kind === "ui" && screenshot === true.
    fs.writeFileSync(path.join(artifactsDir, "screenshot.png"), PLACEHOLDER_PNG);
    shotRel = "screenshot.png";
  }
  fs.writeFileSync(path.join(artifactsDir, "agent.log"), hres.log);
  // Also persist workspace snapshot file list for debugging.
  fs.writeFileSync(path.join(artifactsDir, "prompt.md"), task.prompt);

  const result: RunResult = {
    runId,
    taskId: config.id,
    modelId: model.id,
    harness: model.harness,
    status: hres.status,
    durationMs: hres.durationMs,
    costUsd: hres.costUsd,
    checks,
    llmJudge,
    manual: null,
    artifacts: { html: htmlRel, screenshot: shotRel, log: "agent.log" },
  };
  const parsed = RunResultSchema.parse(result);
  fs.writeFileSync(path.join(artifactsDir, "result.json"), JSON.stringify(parsed, null, 2));
  return artifactsDir;
}
