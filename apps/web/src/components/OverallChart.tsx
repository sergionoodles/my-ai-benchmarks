import type { CSSProperties } from "react";
import { compositeScore, formatScore, type PublishedIndex } from "../lib/results";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export function OverallChart({ index }: { index: PublishedIndex }) {
  const perModel = index.models
    .map((m) => {
      const results = index.results.filter((r) => r.modelId === m.id);
      const scored = results.map((r) => compositeScore(r));
      const values = scored.map((s) => s.composite).filter((v): v is number => v !== null);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      const reviewed = scored.length > 0 && scored.every((s) => s.reviewed);
      return { model: m, avg, reviewed, count: results.length };
    })
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-card">
      <div className="flex flex-col gap-2 border-b border-white/10 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">leaderboard</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Who&apos;s ahead — until the next run
          </h2>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Average composite across tasks. Checks + judge + me, renormalized when I haven&apos;t
          reviewed yet.
        </p>
      </div>
      <div className="flex flex-col gap-6 p-5">
        {perModel.length === 0 && <p className="text-sm text-muted-foreground">No models published yet.</p>}
        {perModel.map(({ model, avg, reviewed, count }, i) => (
          <div key={model.id} className="flex flex-col gap-2">
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="font-display text-lg font-bold leading-none tracking-tight">
                    {model.displayName}
                  </div>
                  <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {model.harness} · {count} task{count === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!reviewed && (
                  <Badge className="border-dashed border-amber-400/50 text-amber-300">unreviewed</Badge>
                )}
                <span className="font-display text-3xl font-extrabold tabular-nums leading-none">
                  {formatScore(avg)}
                </span>
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  i === 0 ? "bg-primary shadow-glow" : "bg-foreground/70",
                  !reviewed && "opacity-60",
                )}
                style={
                  {
                    width: `${avg === null ? 0 : (avg / 10) * 100}%`,
                    "--bar": `${avg === null ? 0 : (avg / 10) * 100}%`,
                    animation: "grow 1.1s cubic-bezier(0.16, 1, 0.3, 1) both",
                    animationDelay: `${0.15 * i}s`,
                  } as CSSProperties
                }
                title={`${model.displayName}: ${formatScore(avg)} across ${count} tasks`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
