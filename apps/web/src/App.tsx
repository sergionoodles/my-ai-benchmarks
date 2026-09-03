import * as React from "react";
import { Hero, ScoringMethod, SiteNav } from "./components/Header";
import { OverallChart } from "./components/OverallChart";
import { ComparisonGrid } from "./components/ComparisonGrid";
import { DetailDrawer } from "./components/DetailDrawer";
import type { PublishedIndex, RunResult } from "./lib/results";

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
            setState({
              kind: "empty",
              message:
                "Published snapshot is empty. Run `pnpm bench run --all` then `pnpm bench publish`.",
            });
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

  const selectedTask =
    state.kind === "ready" && selected ? state.index.tasks.find((t) => t.id === selected.taskId) : undefined;
  const selectedModel =
    state.kind === "ready" && selected
      ? state.index.models.find((m) => m.id === selected.modelId)
      : undefined;

  return (
    <div className="min-h-screen">
      <SiteNav runId={state.kind === "ready" ? state.index.runId : undefined} />
      <Hero
        runId={state.kind === "ready" ? state.index.runId : undefined}
        publishedAt={state.kind === "ready" ? state.index.publishedAt : undefined}
        modelCount={state.kind === "ready" ? state.index.models.length : undefined}
        taskCount={state.kind === "ready" ? state.index.tasks.length : undefined}
      />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 sm:gap-16 sm:py-16">
        <ScoringMethod />

        {state.kind === "loading" && (
          <section id="scores" className="scroll-mt-24 rounded-2xl border border-white/10 bg-card p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">loading</p>
            <p className="mt-2 font-display text-2xl font-bold">Pulling the latest grudges…</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="h-28 animate-pulse rounded-xl bg-muted" />
              <div className="h-28 animate-pulse rounded-xl bg-muted" />
            </div>
          </section>
        )}

        {state.kind === "empty" && (
          <section id="scores" className="scroll-mt-24 rounded-2xl border border-dashed border-white/15 bg-card p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">empty board</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
              The board is empty. The opinions are not.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Publish a run and this page becomes a scoreboard. Until then it&apos;s just a manifesto with
              extra steps.
            </p>
            <p className="mt-4 font-mono text-xs text-muted-foreground">{state.message}</p>
            <div className="mt-6 grid gap-3 opacity-50 sm:grid-cols-2">
              <div className="h-24 rounded-xl bg-muted" />
              <div className="h-24 rounded-xl bg-muted" />
            </div>
          </section>
        )}

        {state.kind === "ready" && (
          <div id="scores" className="scroll-mt-24 flex flex-col gap-10">
            <OverallChart index={state.index} />
            <ComparisonGrid index={state.index} onSelect={setSelected} />
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              judge: {state.index.judgeModel}
              {state.index.harnessVersions.codex && <> · codex {state.index.harnessVersions.codex}</>}
              {state.index.harnessVersions.opencode && <> · opencode {state.index.harnessVersions.opencode}</>}
              {state.index.harnessVersions.grok && <> · grok {state.index.harnessVersions.grok}</>}
            </p>
          </div>
        )}
      </main>
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-lg font-bold tracking-tight">
            There are many agent benchmarks.{" "}
            <span className="text-primary">This one is mine.</span>
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            n=1 · no consensus · no mercy
          </p>
        </div>
      </footer>
      <DetailDrawer
        result={selected}
        taskTitle={selectedTask?.title}
        modelName={selectedModel?.displayName}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
