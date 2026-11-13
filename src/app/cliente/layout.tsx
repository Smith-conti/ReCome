import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { requireRole } from "@/lib/auth/session";

// Los paneles privados priorizan la comprobación de rol en el servidor antes
// que una navegación instantánea. Evita además el aviso del validador cuando
// el guard redirige a otro panel.
export const instant = false;

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
