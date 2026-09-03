import { Badge } from "./ui/badge";

// Exact required playful text (raw markdown form for the spec):
// There are many agent benchmarks this one is ~~yours~~ mine
const RAW_TAGLINE = "There are many agent benchmarks this one is ~~yours~~ mine";

function renderTagline(raw: string): React.ReactNode {
  // Render ~~x~~ with a strikethrough on x while keeping the tildes visible,
  // so the element's text content is exactly the required string.
  const parts = raw.split(/~~(.*?)~~/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i}>
        ~~<s>{part}</s>~~
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function Header({ runId, publishedAt }: { runId?: string; publishedAt?: string }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10">
        <Badge className="w-fit">personal lab · opinionated · n=me</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My AI Coding Benchmark</h1>
        <p className="text-lg text-muted-foreground" data-raw={RAW_TAGLINE} title={RAW_TAGLINE}>
          {renderTagline(RAW_TAGLINE)}
        </p>
        <p className="text-sm text-muted-foreground">
          This is a personal, opinionated benchmark, not a generic suite. It compares (model,
          harness) pairs on tasks I actually care about.
        </p>
        {runId && (
          <p className="text-xs text-muted-foreground">
            run <code className="rounded bg-muted px-1">{runId}</code>
            {publishedAt && <> · published {new Date(publishedAt).toLocaleString()}</>}
          </p>
        )}
      </div>
    </header>
  );
}
