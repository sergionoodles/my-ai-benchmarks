import { execFile } from "node:child_process";
import type { HarnessAdapter } from "./types.js";
import { formatRunHeader } from "./cmd.js";

function exec(
  cmd: string,
  args: string[],
  timeoutMs: number,
  cwd: string,
  input?: string,
): Promise<{ stdout: string; stderr: string }> {
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
    // Always close stdin: `codex exec -` reads the prompt from stdin and
    // would hang forever on an open pipe.
    if (input !== undefined && child.stdin) {
      child.stdin.write(input);
    }
    child.stdin?.end();
  });
}

// Codex adapter: `codex exec` non-interactive mode.
//
// v0 defaults to a stub run so `bench run` is fast and never hangs.
// Set BENCH_LIVE_HARNESS=1 to invoke the real `codex exec` binary
// (prompt passed via stdin, killed at timeoutSec -> status "timeout").
export const codexAdapter: HarnessAdapter = {
  name: "codex",
  async version() {
    try {
      const { stdout } = await exec("codex", ["--version"], 10_000, process.cwd());
      return stdout.trim().slice(0, 120);
    } catch {
      return undefined;
    }
  },
  async run(prompt, workdir, model, timeoutSec, reasoningEffort) {
    const started = Date.now();
    const args = ["exec", "--model", model, "--sandbox", "workspace-write", "--skip-git-repo-check"];
    if (reasoningEffort) args.push("-c", `model_reasoning_effort=${reasoningEffort}`);
    args.push("-");
    const header = formatRunHeader("codex", args, workdir, timeoutSec, `${prompt.length} chars via stdin`);
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
      const { stdout, stderr } = await exec(
        "codex",
        args,
        timeoutMs,
        workdir,
        prompt,
      );
      return { status: "ok", durationMs: Date.now() - started, costUsd: null, log: `${header}\n${stdout}\n${stderr}` };
    } catch (err) {
      const e = err as { code?: string; stdout?: string; stderr?: string; killed?: boolean };
      const timedOut = e.killed === true;
      const msg = `codex ${timedOut ? "timed out" : `failed (${e.code ?? "error"})`}.\nstdout:\n${e.stdout ?? ""}\nstderr:\n${e.stderr ?? ""}`;
      return {
        status: timedOut ? "timeout" : "error",
        durationMs: Date.now() - started,
        costUsd: null,
        log: `${header}\n${msg}`,
      };
    }
  },
};
