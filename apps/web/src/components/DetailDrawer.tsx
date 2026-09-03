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
          <div className="flex items-start justify-between gap-2 border-b p-5">
            <div>
              <h2 className="text-lg font-semibold">
                {taskTitle ?? result.taskId} × {modelName ?? result.modelId}
              </h2>
              <p className="text-sm text-muted-foreground">
                composite {formatScore(s.composite)}{" "}
                {s.reviewed ? <Badge>reviewed</Badge> : <Badge className="border-dashed text-amber-600">unreviewed</Badge>}{" "}
                <Badge>{result.status}</Badge>
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {html ? (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Generated preview</h3>
                <iframe
                  title={`preview ${result.taskId} ${result.modelId}`}
                  src={html}
                  sandbox="allow-same-origin"
                  className="h-80 w-full rounded-md border bg-white"
                />
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">No HTML artifact for this run.</p>
            )}
            {shot && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Screenshot</h3>
                <img src={shot} alt="run screenshot" className="w-full rounded-md border" loading="lazy" />
              </section>
            )}
            <section className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">checks</div>
                <div className="font-semibold tabular-nums">{formatScore(s.checks)}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">judge</div>
                <div className="font-semibold tabular-nums">{formatScore(s.judge)}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">manual</div>
                <div className="font-semibold tabular-nums">{formatScore(s.manual)}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-muted-foreground">cost / duration</div>
                <div className="font-semibold tabular-nums">
                  {result.costUsd === null ? "—" : `$${result.costUsd.toFixed(4)}`} · {(result.durationMs / 1000).toFixed(1)}s
                </div>
              </div>
            </section>
            <section>
              <h3 className="mb-1 text-sm font-semibold">Judge rationale</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {result.llmJudge ? result.llmJudge.rationale : "No judge score yet."}
              </p>
              {result.llmJudge && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.llmJudge.judgeModel} · score {result.llmJudge.score}/10
                </p>
              )}
            </section>
            <section>
              <h3 className="mb-1 text-sm font-semibold">Manual score notes</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {result.manual ? `${result.manual.score}/10 — ${result.manual.notes}` : "Unreviewed — run `pnpm bench review` to add a manual score."}
              </p>
            </section>
            <section>
              <h3 className="mb-1 text-sm font-semibold">Checks</h3>
              <ul className="space-y-1 text-sm">
                {result.checks.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span>
                      {c.pass ? "✅" : "❌"} {c.id}
                      {c.details && <span className="text-muted-foreground"> — {c.details}</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">w={c.weight}</span>
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
