import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarCheck, Mail, Package, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime, formatPrice, formatTimeRange } from "@/lib/format";
import {
  countReservationsForAdmin,
  listReservationsForAdmin,
} from "@/lib/reservations/queries";
import {
  RESERVATION_STATUSES,
  RESERVATION_STATUS_LABEL,
  RESERVATION_STATUS_TONE,
  isReservationStatus,
  type Reservation,
  type ReservationStatus,
} from "@/lib/reservations/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Reservas",
};

type PageProps = {
  searchParams: Promise<{ estado?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function listHref(status?: string): string {
  return status ? `/admin/reservas?estado=${status}` : "/admin/reservas";
}

export default function AdminReservasPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <AdminReservasContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminReservasContent({ searchParams }: PageProps) {
  await requireRole("ADMIN");

  const params = await searchParams;
  const rawStatus = firstParam(params.estado);
  const status: ReservationStatus | undefined = isReservationStatus(rawStatus)
    ? rawStatus
    : undefined;

  const [reservations, counts] = await Promise.all([
    listReservationsForAdmin({ status }),
    countReservationsForAdmin(),
  ]);

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const tabs: { key: string; label: string; count: number }[] = [
    { key: "", label: "Todas", count: total },
    ...RESERVATION_STATUSES.map((reservationStatus) => ({
      key: reservationStatus,
      label: RESERVATION_STATUS_LABEL[reservationStatus],
      count: counts[reservationStatus],
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Administración</p>
        <h1 className="mt-2 text-3xl">Reservas</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Supervisa las reservas de todos los comercios: cliente, oferta,
          cantidades, estado y fecha de recojo. Este listado es de solo lectura
          y no muestra los códigos de recojo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = (status ?? "") === tab.key;
          return (
            <Link
              key={tab.key || "ALL"}
              href={listHref(tab.key || undefined)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>

      {reservations.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_120px_190px] gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid">
            <span>Oferta y comercio</span>
            <span>Cliente</span>
            <span>Total</span>
            <span>Recojo</span>
          </div>

          {reservations.map((reservation) => (
            <AdminReservationRow
              key={reservation.id}
              reservation={reservation}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-card/70 px-6 py-14 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
            <CalendarCheck className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl">
            {status
              ? "No hay reservas con ese estado"
              : "Todavía no hay reservas registradas"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {status
              ? "Prueba con otro estado o vuelve a «Todas» para ver el historial completo."
              : "Cuando los clientes reserven ofertas, aparecerán en este listado para supervisión."}
          </p>
          {status ? (
            <Link
              href="/admin/reservas"
              className={buttonVariants({ className: "mt-6 h-10 px-5" })}
            >
              Ver todas
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}

function AdminReservationRow({ reservation }: { reservation: Reservation }) {
  return (
    <article className="grid gap-3 border-b border-border px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_120px_190px] lg:items-center lg:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={RESERVATION_STATUS_TONE[reservation.status]}>
            {RESERVATION_STATUS_LABEL[reservation.status]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {reservation.quantity}{" "}
            {reservation.quantity === 1 ? "unidad" : "unidades"}
          </span>
        </div>
        <h2 className="mt-1.5 flex items-center gap-1.5 font-heading text-base leading-snug">
          <Package className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {reservation.offer?.title ?? "Oferta no disponible"}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {reservation.business?.name ?? "Comercio no disponible"}
        </p>
      </div>

      <div className="min-w-0 text-sm">
        <p className="flex items-center gap-1.5 font-medium">
          <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
          {reservation.customer?.fullName ?? "Cliente no disponible"}
        </p>
        {reservation.customer?.email ? (
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <Mail className="size-3.5 shrink-0" aria-hidden="true" />
            {reservation.customer.email}
          </p>
        ) : null}
        <p className="mt-0.5 text-xs text-muted-foreground">
          Creada: {formatDateTime(reservation.createdAt)}
        </p>
      </div>

      <div className="text-sm">
        <p className="font-medium">{formatPrice(reservation.totalPrice)}</p>
        <p className="text-xs text-muted-foreground">
          {reservation.quantity} × {formatPrice(reservation.unitPrice)}
        </p>
      </div>

      <div className="text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Recojo</p>
        <p>
          {reservation.offer
            ? formatTimeRange(
                reservation.offer.pickupStart,
                reservation.offer.pickupEnd,
              )
            : formatDateTime(reservation.expiresAt)}
        </p>
        <p>Vence: {formatDateTime(reservation.expiresAt)}</p>
      </div>
    </article>
  );
}
