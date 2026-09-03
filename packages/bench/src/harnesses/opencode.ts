import { execFile } from "node:child_process";
import type { HarnessAdapter } from "./types.js";

function exec(cmd: string, args: string[], timeoutMs: number, cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(Object.assign(err, { stdout: String(stdout), stderr: String(stderr) }));
      else resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

// OpenCode adapter: `opencode run` non-interactive mode.
//
// v0 defaults to a stub run so `bench run` is fast and never hangs.
// Set BENCH_LIVE_HARNESS=1 to invoke the real `opencode run` binary
// (stdin closed, killed at timeoutSec -> status "timeout").
export const opencodeAdapter: HarnessAdapter = {
  name: "opencode",
  async version() {
    try {
      const { stdout } = await exec("opencode", ["--version"], 10_000, process.cwd());
      return stdout.trim().slice(0, 120);
    } catch {
      return undefined;
    }
  },
  async run(prompt, workdir, model, timeoutSec) {
    const started = Date.now();
    if (process.env.BENCH_LIVE_HARNESS !== "1") {
      return {
        status: "ok",
        durationMs: Date.now() - started,
        costUsd: null,
        log: `$ opencode run --model ${model} [STUB: set BENCH_LIVE_HARNESS=1 for a real run]\nPrompt was ${prompt.length} chars; workspace left untouched.`,
      };
    }
    const timeoutMs = Math.max(1, timeoutSec) * 1000;
    try {
      const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const child = execFile(
          "opencode",
          ["run", "--model", model, prompt],
          { timeout: timeoutMs, cwd: workdir, maxBuffer: 10 * 1024 * 1024 },
          (err, stdout, stderr) => {
            if (err) reject(Object.assign(err, { stdout: String(stdout), stderr: String(stderr) }));
            else resolve({ stdout: String(stdout), stderr: String(stderr) });
          },
        );
        child.stdin?.end();
      });
      return { status: "ok", durationMs: Date.now() - started, costUsd: null, log: `$ opencode run --model ${model}\n${stdout}\n${stderr}` };
    } catch (err) {
      const e = err as { code?: string; stdout?: string; stderr?: string; killed?: boolean };
      const timedOut = e.killed === true;
      const msg = `opencode ${timedOut ? "timed out" : `failed (${e.code ?? "error"})`}.\nstdout:\n${e.stdout ?? ""}\nstderr:\n${e.stderr ?? ""}`;
      return {
        status: timedOut ? "timeout" : "error",
        durationMs: Date.now() - started,
        costUsd: null,
        log: `$ opencode run --model ${model}\n${msg}`,
      };
    }
  },
};
