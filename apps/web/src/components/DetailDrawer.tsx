import { compositeScore, formatScore, type RunResult } from "../lib/results";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";

function assetUrl(rel?: string): string | undefined {
  if (!rel) return undefined;
  if (/^https?:\/\//.test(rel)) return rel;
  return `${import.meta.env.BASE_URL}${rel}`;
}

export function DetailDrawer({
  result,
  taskTitle,
  modelName,
  onClose,
}: {
  result: RunResult | null;
  taskTitle?: string;
  modelName?: string;
  onClose: () => void;
}) {
  const s = result ? compositeScore(result) : null;
  const html = result ? assetUrl(result.artifacts.html) : undefined;
  const shot = result ? assetUrl(result.artifacts.screenshot) : undefined;

  return (
    <Dialog open={result !== null} onClose={onClose}>
      {result && s && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">crime scene</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold leading-tight tracking-tight">
                {taskTitle ?? result.taskId}{" "}
                <span className="text-muted-foreground">×</span> {modelName ?? result.modelId}
              </h2>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-display text-xl font-bold tabular-nums text-foreground">
                  {formatScore(s.composite)}
                </span>
                {s.reviewed ? (
                  <Badge className="border-primary/40 text-primary">reviewed</Badge>
                ) : (
                  <Badge className="border-dashed border-amber-400/50 text-amber-300">unreviewed</Badge>
                )}
                <Badge>{result.status}</Badge>
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            {html ? (
              <section>
                <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Generated preview
                </h3>
                <iframe
                  title={`preview ${result.taskId} ${result.modelId}`}
                  src={html}
                  sandbox="allow-same-origin"
                  className="h-80 w-full rounded-xl border border-white/10 bg-white"
                />
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">No HTML artifact for this run.</p>
            )}
            {shot && (
              <section>
                <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Screenshot
                </h3>
                <img src={shot} alt="run screenshot" className="w-full rounded-xl border border-white/10" loading="lazy" />
              </section>
            )}
            <section className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <ScoreTile label="checks" value={formatScore(s.checks)} />
              <ScoreTile label="judge" value={formatScore(s.judge)} />
              <ScoreTile label="manual" value={formatScore(s.manual)} />
              <ScoreTile
                label="cost / duration"
                value={`${result.costUsd === null ? "—" : `$${result.costUsd.toFixed(4)}`} · ${(result.durationMs / 1000).toFixed(1)}s`}
              />
            </section>
            <section>
              <h3 className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Judge rationale
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {result.llmJudge ? result.llmJudge.rationale : "No judge score yet."}
              </p>
              {result.llmJudge && (
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  {result.llmJudge.judgeModel} · score {result.llmJudge.score}/10
                </p>
              )}
            </section>
            <section>
              <h3 className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Manual score notes
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {result.manual
                  ? `${result.manual.score}/10 — ${result.manual.notes}`
                  : "Unreviewed — run `pnpm bench review` to add a manual score."}
              </p>
            </section>
            <section>
              <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Checks
              </h3>
              <ul className="space-y-1.5 text-sm">
                {result.checks.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-background/50 px-3 py-2"
                  >
                    <span>
                      <span className={c.pass ? "text-primary" : "text-accent"}>{c.pass ? "pass" : "fail"}</span>{" "}
                      {c.id}
                      {c.details && <span className="text-muted-foreground"> — {c.details}</span>}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">w={c.weight}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function ScoreTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-background/50 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
