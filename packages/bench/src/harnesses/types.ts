export type HarnessStatus = "ok" | "error" | "timeout";

export interface HarnessRunResult {
  status: HarnessStatus;
  durationMs: number;
  costUsd: number | null;
  log: string;
}

export interface HarnessAdapter {
  name: string;
  version(): Promise<string | undefined>;
  run(
    prompt: string,
    workdir: string,
    model: string,
    timeoutSec: number,
    reasoningEffort?: string,
  ): Promise<HarnessRunResult>;
}
