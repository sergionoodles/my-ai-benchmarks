import { compositeScore, formatScore, type PublishedIndex, type RunResult } from "../lib/results";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";

function assetUrl(rel?: string): string | undefined {
  if (!rel) return undefined;
  if (/^https?:\/\//.test(rel)) return rel;
  return `${import.meta.env.BASE_URL}${rel}`;
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
    <Card>
      <CardHeader>
        <CardTitle>Tasks × models</CardTitle>
        <CardDescription>Click a cell for preview, judge rationale, and run metadata.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left font-medium text-muted-foreground">task</th>
              {index.models.map((m) => (
                <th key={m.id} className="p-2 text-left font-medium">
                  {m.displayName}
                  <span className="block text-xs font-normal text-muted-foreground">{m.harness}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {index.tasks.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2 align-top">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.id} · {t.kind}
                  </div>
                </td>
                {index.models.map((m) => {
                  const r = byPair.get(`${t.id}::${m.id}`);
                  if (!r) return <td key={m.id} className="p-2 text-muted-foreground">—</td>;
                  const s = compositeScore(r);
                  const thumb = assetUrl(r.artifacts.screenshot);
                  return (
                    <td key={m.id} className="p-2">
                      <button
                        onClick={() => onSelect(r)}
                        className={cn(
                          "flex w-40 flex-col gap-1.5 rounded-md border bg-background p-2 text-left hover:border-accent",
                          !s.reviewed && "border-dashed",
                        )}
                        title={`${t.title} × ${m.displayName}: ${formatScore(s.composite)}`}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={`${t.id} ${m.id} screenshot`}
                            className="h-16 w-full rounded border bg-muted object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-16 w-full items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
                            no screenshot
                          </div>
                        )}
                        <span className="flex items-center justify-between">
                          <span className="text-lg font-semibold tabular-nums">{formatScore(s.composite)}</span>
                          {!s.reviewed ? (
                            <Badge className="border-dashed text-amber-600">unreviewed</Badge>
                          ) : (
                            <Badge>reviewed</Badge>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {r.status} · {(r.durationMs / 1000).toFixed(1)}s
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
