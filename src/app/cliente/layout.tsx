import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { requireRole } from "@/lib/auth/session";

export default function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ClienteShell>{children}</ClienteShell>
    </Suspense>
  );
}

async function ClienteShell({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("CLIENT");

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
