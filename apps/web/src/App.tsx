import * as React from "react";
import { Hero, ScoringMethod } from "./components/Header";
import { OverallChart } from "./components/OverallChart";
import { ComparisonGrid } from "./components/ComparisonGrid";
import { DetailDrawer } from "./components/DetailDrawer";
import {
  fetchLegacyIndex,
  indexFromEntries,
  loadBundledEntries,
  type PublishedIndex,
  type RunResult,
} from "./lib/results";

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
      // Runs are bundled at build time via import.meta.glob
      // (public/results/<task>/<model>/result.json).
      const bundled = indexFromEntries(loadBundledEntries());
      if (bundled) {
        if (!cancelled) setState({ kind: "ready", index: bundled });
        return;
      }
      // Fallback for snapshots published before the per-run rework.
      const legacy = await fetchLegacyIndex();
      if (!cancelled) {
        if (legacy) setState({ kind: "ready", index: legacy });
        else
          setState({
            kind: "empty",
            message:
              "No published results yet. Run `pnpm bench run --all` then `pnpm bench publish --all`.",
          });
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
      <Hero
        publishedAt={state.kind === "ready" ? state.index.publishedAt : undefined}
        modelCount={state.kind === "ready" ? state.index.models.length : undefined}
        taskCount={state.kind === "ready" ? state.index.tasks.length : undefined}
      />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 sm:gap-16 sm:py-16">
        <ScoringMethod />

        {state.kind === "loading" && (
          <section id="scores" className="scroll-mt-8 rounded-2xl border border-white/10 bg-card p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">loading</p>
            <p className="mt-2 font-display text-2xl font-bold">Pulling the latest grudges…</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="h-28 animate-pulse rounded-xl bg-muted" />
              <div className="h-28 animate-pulse rounded-xl bg-muted" />
            </div>
          </section>
        )}

        {state.kind === "empty" && (
          <section id="scores" className="scroll-mt-8 rounded-2xl border border-dashed border-white/15 bg-card p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">empty board</p>
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
          <div id="scores" className="scroll-mt-8 flex flex-col gap-10">
            <OverallChart index={state.index} />
            <ComparisonGrid index={state.index} onSelect={setSelected} />
          </div>
        )}
      </main>
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-lg font-bold tracking-tight">
            There are many agent benchmarks.{" "}
            <span className="text-primary">This one is mine.</span>
          </p>
          <a
            href="https://github.com/sergionoodles/my-ai-benchmarks"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
          >
            GitHub
          </a>
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
