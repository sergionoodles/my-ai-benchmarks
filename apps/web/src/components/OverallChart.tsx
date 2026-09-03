import { compositeScore, formatScore, type PublishedIndex } from "../lib/results";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";

export function OverallChart({ index }: { index: PublishedIndex }) {
  const perModel = index.models.map((m) => {
    const results = index.results.filter((r) => r.modelId === m.id);
    const scored = results.map((r) => compositeScore(r));
    const values = scored.map((s) => s.composite).filter((v): v is number => v !== null);
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    const reviewed = scored.length > 0 && scored.every((s) => s.reviewed);
    return { model: m, avg, reviewed, count: results.length };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall score per model</CardTitle>
        <CardDescription>
          Composite = checks + judge + manual (renormalized when manual is missing).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {perModel.length === 0 && <p className="text-sm text-muted-foreground">No models published yet.</p>}
        {perModel.map(({ model, avg, reviewed, count }) => (
          <div key={model.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">
                {model.displayName}{" "}
                <span className="font-normal text-muted-foreground">· {model.harness}</span>
              </span>
              <span className="flex items-center gap-2">
                {!reviewed && (
                  <Badge className="border-dashed text-amber-600">unreviewed</Badge>
                )}
                <span className="tabular-nums font-semibold">{formatScore(avg)}</span>
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full bg-accent transition-all", !reviewed && "opacity-60")}
                style={{ width: `${avg === null ? 0 : (avg / 10) * 100}%` }}
                title={`${model.displayName}: ${formatScore(avg)} across ${count} tasks`}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
