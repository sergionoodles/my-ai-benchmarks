const TICKER = [
  "personal lab",
  "n = 1",
  "opinionated",
  "not a paper",
  "tasks I actually ship",
  "no committee",
  "checks + judge + me",
  "yours is struck through",
  "this one is mine",
];

export function Hero({
  runId,
  publishedAt,
  modelCount,
  taskCount,
}: {
  runId?: string;
  publishedAt?: string;
  modelCount?: number;
  taskCount?: number;
}) {
  return (
    <header id="top" className="relative overflow-hidden border-b border-white/10">
      <div aria-hidden="true" className="hero-orb -right-24 -top-24 h-52 w-52 bg-primary/15 sm:h-80 sm:w-80 sm:bg-primary/25" />
      <div
        aria-hidden="true"
        className="hero-orb -bottom-32 -left-16 h-48 w-48 bg-primary/10 sm:h-72 sm:w-72 sm:bg-primary/15"
        style={{ animationDelay: "-6s" }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-16 sm:pt-24">
        <h1 className="font-hand text-[clamp(2.15rem,6.4vw,5.25rem)] font-medium leading-[1.12] tracking-tight">
          <span className="animate-rise block" style={{ animationDelay: "0.08s" }}>
            There are many
          </span>
          <span className="animate-rise block" style={{ animationDelay: "0.16s" }}>
            agent benchmarks
          </span>
          <span className="animate-rise block" style={{ animationDelay: "0.24s" }}>
            but this one is
          </span>
          <span
            className="animate-rise mt-3 flex flex-wrap items-center gap-x-5 gap-y-3"
            style={{ animationDelay: "0.32s" }}
          >
            <span className="yours">yours</span>
            <span className="mine">mine</span>
          </span>
        </h1>

        <div className="animate-rise flex flex-wrap items-center gap-3" style={{ animationDelay: "0.44s" }}>
          <a
            href="#scores"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display text-base font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
          >
            See the scores
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="#method"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-display text-base font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            How I score it
          </a>
        </div>

        <dl
          className="animate-rise grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4"
          style={{ animationDelay: "0.56s" }}
        >
          <Stat label="models" value={modelCount == null ? "—" : String(modelCount).padStart(2, "0")} />
          <Stat label="tasks" value={taskCount == null ? "—" : String(taskCount).padStart(2, "0")} />
          <Stat label="stubborn humans" value="01" />
          <Stat label="vendor charts" value="00" />
        </dl>

        {(runId || publishedAt) && (
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {runId && (
              <>
                latest run <span className="text-foreground">{runId}</span>
              </>
            )}
            {publishedAt && (
              <>
                {runId ? " · " : null}
                published {new Date(publishedAt).toLocaleString()}
              </>
            )}
          </p>
        )}
      </div>

      <div className="relative border-t border-white/10 bg-primary text-primary-foreground" aria-hidden="true">
        <div className="overflow-hidden py-2.5">
          <div className="flex w-max animate-marquee">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center whitespace-nowrap">
                {TICKER.map((item) => (
                  <span
                    key={`${copy}-${item}`}
                    className="px-6 font-mono text-[11px] font-medium uppercase tracking-[0.32em]"
                  >
                    <span className="mr-6 opacity-50">●</span>
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/80 px-4 py-5 sm:px-5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-3xl font-extrabold tabular-nums tracking-tight">{value}</dd>
    </div>
  );
}

export function ScoringMethod() {
  return (
    <section id="method" className="scroll-mt-8">
      <div className="mb-6 flex flex-col gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">the rubric</p>
        <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Three numbers. One opinion.
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Checks catch the mechanical. A judge scores the taste. I break the tie — because if I
          wouldn&apos;t keep the output, the leaderboard is lying.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <MethodCard index="01" title="Checks" body="Did it actually work? File exists, tests pass, the bug is gone. No vibes allowed here." />
        <MethodCard index="02" title="Judge" body="An LLM with a rubric and no equity in the outcome. Structure, completeness, taste." />
        <MethodCard index="03" title="Me" body="The only score that ships. If I wouldn't merge it, it doesn't get to hide in an average." />
      </div>
    </section>
  );
}

function MethodCard({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card p-5 transition-colors hover:border-primary/50">
      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">{index}</span>
      <h3 className="mt-3 font-display text-2xl font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <div className="pointer-events-none absolute -right-6 -top-8 font-display text-7xl font-extrabold text-white/[0.03] transition-colors group-hover:text-primary/[0.07]">
        {index}
      </div>
    </article>
  );
}
