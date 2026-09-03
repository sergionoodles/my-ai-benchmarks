import { execFile } from "node:child_process";
import type { HarnessAdapter } from "./types.js";
import { formatRunHeader } from "./cmd.js";

function exec(cmd: string, args: string[], timeoutMs: number, cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      cmd,
      args,
      { timeout: timeoutMs, cwd, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) reject(Object.assign(err, { stdout: String(stdout), stderr: String(stderr) }));
        else resolve({ stdout: String(stdout), stderr: String(stderr) });
      },
    );
    // Prompt is passed via `-p`, so stdin must be closed or `grok` may hang.
    child.stdin?.end();
  });
}

// `model` format: `<model-id>[@<reasoning-effort>]`, e.g. `grok-4.6@high`.
// Everything before the last `@` is the `--model` id; the suffix (if any)
// becomes `--reasoning-effort`.
export function parseGrokModel(model: string): { modelId: string; effort?: string } {
  const at = model.lastIndexOf("@");
  if (at <= 0 || at === model.length - 1) return { modelId: model };
  return { modelId: model.slice(0, at), effort: model.slice(at + 1) };
}

export function grokArgs(prompt: string, model: string): string[] {
  const { modelId, effort } = parseGrokModel(model);
  const args = ["-p", prompt, "--model", modelId, "--permission-mode", "bypassPermissions", "--output-format", "plain"];
  if (effort) args.push("--reasoning-effort", effort);
  return args;
}

// Grok adapter: `grok -p` non-interactive mode.
//
// v0 defaults to a stub run so `bench run` is fast and never hangs.
// Set BENCH_LIVE_HARNESS=1 to invoke the real `grok` binary
// (stdin closed, killed at timeoutSec -> status "timeout").
export const grokAdapter: HarnessAdapter = {
  name: "grok",
  async version() {
    try {
      const { stdout } = await exec("grok", ["--version"], 10_000, process.cwd());
      return stdout.trim().slice(0, 120);
    } catch {
      return undefined;
    }
  },
  async run(prompt, workdir, model, timeoutSec) {
    const started = Date.now();
    const args = grokArgs(prompt, model);
    const header = formatRunHeader("grok", args, workdir, timeoutSec, "closed");
    if (process.env.BENCH_LIVE_HARNESS !== "1") {
      return {
        status: "ok",
        durationMs: Date.now() - started,
        costUsd: null,
        log: `${header}\n[STUB: set BENCH_LIVE_HARNESS=1 for a real run]\nPrompt was ${prompt.length} chars; workspace left untouched.`,
      };
    }
    const timeoutMs = Math.max(1, timeoutSec) * 1000;
    try {
      const { stdout, stderr } = await exec("grok", args, timeoutMs, workdir);
      return { status: "ok", durationMs: Date.now() - started, costUsd: null, log: `${header}\n${stdout}\n${stderr}` };
    } catch (err) {
      const e = err as { code?: string; stdout?: string; stderr?: string; killed?: boolean };
      const timedOut = e.killed === true;
      const msg = `grok ${timedOut ? "timed out" : `failed (${e.code ?? "error"})`}.\nstdout:\n${e.stdout ?? ""}\nstderr:\n${e.stderr ?? ""}`;
      return {
        status: timedOut ? "timeout" : "error",
        durationMs: Date.now() - started,
        costUsd: null,
        log: `${header}\n${msg}`,
      };
    }
  },
};
