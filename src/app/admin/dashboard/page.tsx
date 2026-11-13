import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ShoppingBag,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireSessionProfile } from "@/lib/auth/session";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";

export const metadata: Metadata = {
  title: "Panel administrativo",
};

type PendingBusiness = {
  id: string;
  name: string;
  district: string | null;
  created_at: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <AdminDashboardContent />
    </Suspense>
  );
}

async function AdminDashboardContent() {
  await requireSessionProfile();
  const supabase = await createClient();

  const [
    pendingCount,
    approvedCount,
    clientCount,
    activeOffers,
    pendingBusinesses,
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "PENDING"),
    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "APPROVED"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "CLIENT"),
    supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE")
      .is("archived_at", null),
    supabase
      .from("businesses")
      .select("id, name, district, created_at")
      .eq("approval_status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(5),
  ]);

  const stats = [
    {
      label: "Comercios pendientes",
      value: pendingCount.count ?? 0,
      icon: Clock3,
    },
    {
      label: "Comercios aprobados",
      value: approvedCount.count ?? 0,
      icon: CheckCircle2,
    },
    {
      label: "Clientes registrados",
      value: clientCount.count ?? 0,
      icon: Users,
    },
    {
      label: "Ofertas activas",
      value: activeOffers.count ?? 0,
      icon: ShoppingBag,
    },
  ];

  const pending = (pendingBusinesses.data ?? []) as PendingBusiness[];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Administración</p>
        <h1 className="mt-2 text-2xl sm:text-3xl">Resumen de la plataforma</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Indicadores calculados en vivo desde la base de datos. Solo las
          cuentas con rol administrador ven esta información.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4" aria-hidden="true" />
                <p className="text-xs font-medium uppercase tracking-wide">
                  {stat.label}
                </p>
              </div>
              <p className="mt-2 font-heading text-3xl">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" aria-hidden="true" />
              Comercios en revisión
            </CardTitle>
            <CardDescription>
              Los últimos establecimientos que esperan aprobación.
            </CardDescription>
          </div>
          <Link
            href="/admin/negocios"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "h-8",
            })}
          >
            Ver todos
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm font-medium">
                No hay comercios pendientes
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                Cuando un comercio se registre, aparecerá aquí para su revisión.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pending.map((business) => (
                <li key={business.id}>
                  <Link
                    href={`/admin/negocios/${business.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 transition-colors first:pt-0 last:pb-0 hover:text-primary"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {business.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {business.district ?? "Sin distrito"} · Registrado el{" "}
                        {formatDate(business.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">En revisión</Badge>
                      <ChevronRight
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
