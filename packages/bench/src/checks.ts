import fs from "node:fs";
import path from "node:path";
import type { CheckResult } from "@lab/schema";
import type { TaskConfig } from "@lab/schema";

export function runChecks(workdir: string, task: TaskConfig): CheckResult[] {
  return task.checks.map((check) => {
    const cfg = check.config as Record<string, unknown>;
    try {
      if (check.type === "file-exists") {
        const rel = String(cfg.path ?? "");
        const ok = fs.existsSync(path.join(workdir, rel));
        return { id: check.id, pass: ok, weight: check.weight, details: ok ? rel : `missing ${rel}` };
      }
      if (check.type === "contains") {
        const rel = String(cfg.path ?? "");
        const pattern = String(cfg.pattern ?? "");
        const abs = path.join(workdir, rel);
        if (!fs.existsSync(abs)) {
          return { id: check.id, pass: false, weight: check.weight, details: `missing ${rel}` };
        }
        const content = fs.readFileSync(abs, "utf8");
        const ok = content.includes(pattern);
        return { id: check.id, pass: ok, weight: check.weight, details: ok ? `found ${pattern}` : `no match for ${pattern}` };
      }
      return { id: check.id, pass: false, weight: check.weight, details: `unknown check type: ${check.type}` };
    } catch (err) {
      return { id: check.id, pass: false, weight: check.weight, details: String(err) };
    }
  });
}
