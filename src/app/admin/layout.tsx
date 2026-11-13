import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { requireRole } from "@/lib/auth/session";

// Los paneles privados priorizan la comprobación de rol en el servidor antes
// que una navegación instantánea. Evita además el aviso del validador cuando
// el guard redirige a otro panel.
export const instant = false;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("ADMIN");

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
