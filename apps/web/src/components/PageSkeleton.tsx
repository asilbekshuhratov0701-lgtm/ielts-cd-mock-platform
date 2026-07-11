export function PageSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8" aria-busy="true" aria-label="Loading">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-52 animate-pulse rounded-md bg-foreground/10" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-foreground/5" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-border bg-foreground/5"
          />
        ))}
      </div>
      <div className="mt-5 h-64 animate-pulse rounded-2xl border border-border bg-foreground/5" />
    </main>
  );
}
