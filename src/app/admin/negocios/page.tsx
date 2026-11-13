import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Building2, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { requireRole } from "@/lib/auth/session";
import {
  countBusinessesByStatus,
  listBusinessesForAdmin,
} from "@/lib/business/queries";
import {
  BUSINESS_TYPE_LABEL,
  approvalStatusLabel,
  approvalStatusTone,
  isApprovalStatus,
  isBusinessType,
  type ApprovalStatus,
} from "@/lib/business/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Comercios",
};

type PageProps = {
  searchParams: Promise<{ estado?: string; q?: string }>;
};

function filterHref(status?: ApprovalStatus, search?: string): string {
  const params = new URLSearchParams();
  if (status) params.set("estado", status);
  if (search) params.set("q", search);
  const query = params.toString();
  return query ? `/admin/negocios?${query}` : "/admin/negocios";
}

export default function AdminBusinessesPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <AdminBusinessesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminBusinessesContent({ searchParams }: PageProps) {
  await requireRole("ADMIN");

  const params = await searchParams;
  const status = isApprovalStatus(params.estado) ? params.estado : undefined;
  const search = (params.q ?? "").trim();

  const [counts, businesses] = await Promise.all([
    countBusinessesByStatus(),
    listBusinessesForAdmin({ status, search }),
  ]);

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  const tabs: { label: string; status?: ApprovalStatus; count: number }[] = [
    { label: "Todos", count: total },
    { label: "En revisión", status: "PENDING", count: counts.PENDING },
    { label: "Aprobados", status: "APPROVED", count: counts.APPROVED },
    { label: "Rechazados", status: "REJECTED", count: counts.REJECTED },
    { label: "Suspendidos", status: "SUSPENDED", count: counts.SUSPENDED },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Administración</p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl sm:text-3xl">
          <Building2 className="size-6 text-primary" aria-hidden="true" />
          Comercios
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Revisa las solicitudes, aprueba nuevos establecimientos y suspende los
          que incumplan las condiciones de ReCome.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = status === tab.status;
          const href = filterHref(tab.status, search);

          return (
            <Link
              key={tab.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-secondary text-secondary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
              <span className="text-xs tabular-nums">{tab.count}</span>
            </Link>
          );
        })}
      </div>

      <form method="get" className="flex max-w-md gap-2">
        {status ? (
          <input type="hidden" name="estado" value={status} />
        ) : null}
        <Input
          name="q"
          defaultValue={search}
          placeholder="Buscar por nombre"
          aria-label="Buscar establecimiento por nombre"
          className="h-10"
        />
        <Button type="submit" variant="outline" className="h-10">
          <Search aria-hidden="true" />
          Buscar
        </Button>
        {search ? (
          <Link
            href={filterHref(status)}
            className="flex h-10 items-center px-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Limpiar
          </Link>
        ) : null}
      </form>

      {businesses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-medium">
            {search || status
              ? "No encontramos comercios con ese filtro"
              : "Todavía no hay comercios registrados"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
            {search || status
              ? "Prueba con otro estado o cambia el término de búsqueda."
              : "Cuando una cuenta de comercio registre su establecimiento, aparecerá aquí."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {businesses.map((business) => (
            <li key={business.id}>
              <Link
                href={`/admin/negocios/${business.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{business.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {isBusinessType(business.type)
                      ? BUSINESS_TYPE_LABEL[business.type]
                      : "Otro"}{" "}
                    · {[business.district, business.city].filter(Boolean).join(", ")}{" "}
                    · Registrado el {formatDate(business.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={approvalStatusTone(business.approval_status)}>
                    {approvalStatusLabel(business.approval_status)}
                  </Badge>
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
    </div>
  );
}
