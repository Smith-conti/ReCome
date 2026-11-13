import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BusinessReviewPanel } from "@/components/admin/business-review-panel";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { requireRole } from "@/lib/auth/session";
import { getBusinessForAdmin } from "@/lib/business/queries";
import {
  DAY_LABEL,
  adminActionLabel,
  approvalStatusLabel,
  approvalStatusTone,
  businessTypeLabel,
  parseOpeningHours,
} from "@/lib/business/types";
import { formatDate, formatDateTime } from "@/lib/format";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  // La consulta usa la sesión (Supabase lee `Date.now()` al validar el token),
  // así que el título se resuelve en cada petición.
  await connection();
  const { id } = await params;
  const { business } = await getBusinessForAdmin(id);
  return { title: business ? business.name : "Comercio" };
}

export default function AdminBusinessDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <AdminBusinessDetailContent params={params} />
    </Suspense>
  );
}

async function AdminBusinessDetailContent({ params }: PageProps) {
  await requireRole("ADMIN");

  const { id } = await params;
  const { business, owner, offersCount, audit } = await getBusinessForAdmin(id);

  if (!business) {
    notFound();
  }

  const hours = parseOpeningHours(business.opening_hours);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/negocios"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-2 mb-2 gap-1.5 text-muted-foreground",
          })}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a comercios
        </Link>
        <p className="eyebrow">Revisión de comercio</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl">{business.name}</h1>
          <Badge variant={approvalStatusTone(business.approval_status)}>
            {approvalStatusLabel(business.approval_status)}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {businessTypeLabel(business.type)} · {business.slug}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Acciones de revisión</h2>
        <p className="mt-1 mb-4 text-sm leading-relaxed text-muted-foreground">
          Cada cambio queda registrado en la auditoría con su motivo.
        </p>
        <BusinessReviewPanel
          businessId={business.id}
          status={business.approval_status}
        />
      </div>

      {business.rejection_reason ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Motivo registrado</p>
          <p className="mt-1 leading-relaxed">{business.rejection_reason}</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <UserRound className="size-4 text-primary" aria-hidden="true" />
            Cuenta responsable
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Nombre
              </dt>
              <dd className="mt-0.5">{owner?.full_name ?? "Sin datos"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Correo
              </dt>
              <dd className="mt-0.5 flex items-center gap-1.5 break-all">
                <Mail
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                {owner?.email ?? "Sin datos"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Teléfono
              </dt>
              <dd className="mt-0.5 flex items-center gap-1.5">
                <Phone
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                {owner?.phone ?? "Sin registrar"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            Ubicación
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Dirección
              </dt>
              <dd className="mt-0.5">{business.address ?? "Sin registrar"}</dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Distrito
                </dt>
                <dd className="mt-0.5">{business.district ?? "Sin registrar"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Ciudad
                </dt>
                <dd className="mt-0.5">{business.city}</dd>
              </div>
            </div>
          </dl>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Store className="size-3.5" aria-hidden="true" />
            Rubro
          </p>
          <p className="mt-1.5 text-sm">{businessTypeLabel(business.type)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ShoppingBag className="size-3.5" aria-hidden="true" />
            Ofertas publicadas
          </p>
          <p className="mt-1.5 text-sm">{offersCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            Registrado
          </p>
          <p className="mt-1.5 text-sm">{formatDate(business.created_at)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Descripción</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {business.description ?? "El comercio no agregó una descripción."}
        </p>

        <h3 className="mt-5 text-sm font-semibold">Horario de atención</h3>
        {hours.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Sin horario registrado.
          </p>
        ) : (
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {[...hours]
              .sort((a, b) => a.day - b.day)
              .map((hour) => (
                <li key={hour.day} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {DAY_LABEL[hour.day] ?? "Día"}
                  </span>
                  <span className="tabular-nums">
                    {hour.open}–{hour.close}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Historial de revisión</h2>
        {audit.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Todavía no hay acciones administrativas sobre este comercio.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {audit.map((entry) => {
              const reason =
                typeof entry.metadata?.reason === "string"
                  ? entry.metadata.reason
                  : null;

              return (
                <li key={entry.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                      {adminActionLabel(entry.action)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </p>
                  </div>
                  {reason ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Motivo: {reason}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
