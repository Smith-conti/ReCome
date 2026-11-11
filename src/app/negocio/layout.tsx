import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { requireRole } from "@/lib/auth/session";

export default function NegocioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <NegocioShell>{children}</NegocioShell>
    </Suspense>
  );
}

async function NegocioShell({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("BUSINESS");

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
