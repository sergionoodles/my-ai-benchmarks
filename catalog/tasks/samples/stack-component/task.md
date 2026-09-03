# Follow my stack

Create a `StatsCard.tsx` React + TypeScript component (Tailwind classes, no new dependencies):

```tsx
export function StatsCard(props: { label: string; value: number; delta: number }): JSX.Element
```

- Renders `label`, formatted `value`, and a ▲/▼ delta indicator (green up, red down).
- Also write `preview.html` that renders the component statically (inlined HTML/CSS is fine — it just needs to look like the component in an iframe).

This task checks whether the agent follows an opinionated stack instead of reaching for something random.
