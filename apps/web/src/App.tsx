import * as React from "react";
import { Header } from "./components/Header";
import { OverallChart } from "./components/OverallChart";
import { ComparisonGrid } from "./components/ComparisonGrid";
import { DetailDrawer } from "./components/DetailDrawer";
import type { PublishedIndex, RunResult } from "./lib/results";
import { Card, CardContent } from "./components/ui/card";

type State =
  | { kind: "loading" }
  | { kind: "empty"; message: string }
  | { kind: "ready"; index: PublishedIndex };

export default function App() {
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const [selected, setSelected] = React.useState<RunResult | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}results/index.json`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const index = (await res.json()) as PublishedIndex;
        if (!cancelled) {
          if (!index.results || index.results.length === 0) {
            setState({ kind: "empty", message: "Published snapshot is empty. Run `pnpm bench run --all` then `pnpm bench publish`." });
          } else {
            setState({ kind: "ready", index });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: "empty",
            message: `No published results yet (${err instanceof Error ? err.message : String(err)}). Run \`pnpm bench run --all\` then \`pnpm bench publish\`.`,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTask = state.kind === "ready" && selected
    ? state.index.tasks.find((t) => t.id === selected.taskId)
    : undefined;
  const selectedModel = state.kind === "ready" && selected
    ? state.index.models.find((m) => m.id === selected.modelId)
    : undefined;

  return (
    <div className="min-h-screen">
      <Header
        runId={state.kind === "ready" ? state.index.runId : undefined}
        publishedAt={state.kind === "ready" ? state.index.publishedAt : undefined}
      />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        {state.kind === "loading" && (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">Loading published results…</CardContent>
          </Card>
        )}
        {state.kind === "empty" && (
          <Card>
            <CardContent className="flex flex-col gap-2 p-5">
              <p className="text-sm font-medium">No results published yet</p>
              <p className="font-mono text-xs text-muted-foreground">{state.message}</p>
              <div className="mt-2 grid gap-3 opacity-60 sm:grid-cols-2">
                <div className="h-24 rounded-md bg-muted" />
                <div className="h-24 rounded-md bg-muted" />
              </div>
            </CardContent>
          </Card>
        )}
        {state.kind === "ready" && (
          <>
            <OverallChart index={state.index} />
            <ComparisonGrid index={state.index} onSelect={setSelected} />
            <p className="text-xs text-muted-foreground">
              judge: {state.index.judgeModel}
              {state.index.harnessVersions.codex && <> · codex {state.index.harnessVersions.codex}</>}
              {state.index.harnessVersions.opencode && <> · opencode {state.index.harnessVersions.opencode}</>}
            </p>
          </>
        )}
      </main>
      <DetailDrawer
        result={selected}
        taskTitle={selectedTask?.title}
        modelName={selectedModel?.displayName}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
