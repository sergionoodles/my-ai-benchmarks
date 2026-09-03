import { compositeScore, formatScore, type PublishedIndex, type RunResult } from "../lib/results";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

function assetUrl(rel?: string): string | undefined {
  if (!rel) return undefined;
  if (/^https?:\/\//.test(rel)) return rel;
  return `${import.meta.env.BASE_URL}${rel}`;
}

function ResultCell({
  result,
  taskTitle,
  modelName,
  onSelect,
}: {
  result: RunResult;
  taskTitle: string;
  modelName: string;
  onSelect: (result: RunResult) => void;
}) {
  const s = compositeScore(result);
  const thumb = assetUrl(result.artifacts.screenshot);
  return (
    <button
      onClick={() => onSelect(result)}
      className={cn(
        "group flex w-full flex-col gap-2 rounded-xl border border-white/10 bg-background/60 p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-glow",
        !s.reviewed && "border-dashed border-white/25",
      )}
      title={`${taskTitle} × ${modelName}: ${formatScore(s.composite)}`}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={`${result.taskId} ${result.modelId} screenshot`}
          className="h-20 w-full rounded-lg border border-white/10 bg-muted object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-muted/40 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          no screenshot
        </div>
      )}
      <span className="flex items-center justify-between gap-2">
        <span className="font-display text-2xl font-extrabold tabular-nums leading-none">
          {formatScore(s.composite)}
        </span>
        {!s.reviewed ? (
          <Badge className="border-dashed border-white/25 text-muted-foreground">unreviewed</Badge>
        ) : (
          <Badge className="border-primary/40 text-primary">reviewed</Badge>
        )}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {result.status} · {(result.durationMs / 1000).toFixed(1)}s
      </span>
    </button>
  );
}

export function ComparisonGrid({
  index,
  onSelect,
}: {
  index: PublishedIndex;
  onSelect: (result: RunResult) => void;
}) {
  const byPair = new Map<string, RunResult>();
  for (const r of index.results) byPair.set(`${r.taskId}::${r.modelId}`, r);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-card">
      <div className="flex flex-col gap-2 border-b border-white/10 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">the grid</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            No hiding in the average
          </h2>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Every task. Every model. Click a cell for the preview, the rationale, and the whole crime
          scene.
        </p>
      </div>

      <div className="hidden overflow-x-auto p-5 md:block">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                task
              </th>
              {index.models.map((m) => (
                <th key={m.id} className="p-2 text-left">
                  <span className="block font-display text-base font-bold">{m.displayName}</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {m.harness}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {index.tasks.map((t) => (
              <tr key={t.id} className="border-t border-white/10">
                <td className="p-2 align-top">
                  <div className="font-display text-base font-bold leading-tight">{t.title}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {t.id} · {t.kind}
                  </div>
                </td>
                {index.models.map((m) => {
                  const r = byPair.get(`${t.id}::${m.id}`);
                  if (!r) {
                    return (
                      <td key={m.id} className="p-2 font-mono text-sm text-muted-foreground">
                        —
                      </td>
                    );
                  }
                  return (
                    <td key={m.id} className="p-2">
                      <ResultCell
                        result={r}
                        taskTitle={t.title}
                        modelName={m.displayName}
                        onSelect={onSelect}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-8 p-5 md:hidden">
        {index.tasks.map((t) => (
          <div key={t.id} className="flex flex-col gap-3">
            <div>
              <div className="font-display text-xl font-bold">{t.title}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {t.id} · {t.kind}
              </div>
            </div>
            <div className="grid gap-3">
              {index.models.map((m) => {
                const r = byPair.get(`${t.id}::${m.id}`);
                if (!r) {
                  return (
                    <div key={m.id} className="rounded-xl border border-dashed border-white/10 p-3 text-sm text-muted-foreground">
                      {m.displayName} — no run
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="flex flex-col gap-2">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {m.displayName} · {m.harness}
                    </div>
                    <ResultCell
                      result={r}
                      taskTitle={t.title}
                      modelName={m.displayName}
                      onSelect={onSelect}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
