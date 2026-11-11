export function DashboardSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="border-b border-border bg-card">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="h-6 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <div className="hidden space-y-2 lg:block">
          <div className="h-9 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-9 w-56 animate-pulse rounded-md bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
