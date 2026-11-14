import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarCheck, ChevronRight, Package, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { requireSessionProfile } from "@/lib/auth/session";
import { formatDateTime, formatPrice, formatTimeRange } from "@/lib/format";
import {
  countReservationsForCustomer,
  listReservationsForCustomer,
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
  title: "Mis reservas",
};

type PageProps = {
  searchParams: Promise<{ estado?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function listHref(status?: string): string {
  return status ? `/cliente/reservas?estado=${status}` : "/cliente/reservas";
}

const STATUS_HINT: Record<ReservationStatus, string> = {
  PENDING: "Esperando la confirmación del comercio.",
  CONFIRMED: "Lista para recoger. Muestra tu código en el establecimiento.",
  DELIVERED: "Recogida completada.",
  CANCELLED: "Cancelada. El stock volvió a la oferta.",
  EXPIRED: "Venció sin recogerse. El stock volvió a la oferta.",
};

export default function ClienteReservasPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <ClienteReservasContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ClienteReservasContent({ searchParams }: PageProps) {
  await requireSessionProfile();

  const params = await searchParams;
  const rawStatus = firstParam(params.estado);
  const status: ReservationStatus | undefined = isReservationStatus(rawStatus)
    ? rawStatus
    : undefined;

  const [reservations, counts] = await Promise.all([
    listReservationsForCustomer({ status }),
    countReservationsForCustomer(),
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Panel del cliente</p>
          <h1 className="mt-2 text-3xl">Mis reservas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Revisa el estado de tus excedentes reservados, muestra tu código de
            recojo y cancela antes de que empiece el horario de recogida.
          </p>
        </div>
        <Link
          href="/ofertas"
          className={buttonVariants({ className: "h-10 shrink-0 px-4" })}
        >
          <CalendarCheck aria-hidden="true" />
          Buscar excedentes
        </Link>
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
        <div className="space-y-3">
          {reservations.map((reservation) => (
            <ReservationRow key={reservation.id} reservation={reservation} />
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
              : "Todavía no tienes reservas"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {status
              ? "Prueba con otro estado o vuelve a «Todas» para ver tu historial completo."
              : "Explora el catálogo, reserva un excedente y aquí verás su estado y su código de recojo."}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            {status ? (
              <Link
                href="/cliente/reservas"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-10 px-5",
                })}
              >
                Ver todas
              </Link>
            ) : null}
            <Link
              href="/ofertas"
              className={buttonVariants({ className: "h-10 px-5" })}
            >
              <CalendarCheck aria-hidden="true" />
              Ver ofertas disponibles
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ReservationRow({ reservation }: { reservation: Reservation }) {
  const active =
    reservation.status === "PENDING" || reservation.status === "CONFIRMED";

  return (
    <Link
      href={`/cliente/reservas/${reservation.id}`}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-start"
    >
      <div className="grid h-24 w-full shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-primary sm:w-24">
        {reservation.offer?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reservation.offer.imageUrl}
            alt={reservation.offer.title}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <Package className="size-7" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={RESERVATION_STATUS_TONE[reservation.status]}>
            {RESERVATION_STATUS_LABEL[reservation.status]}
          </Badge>
          {active ? (
            <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs tracking-[0.2em]">
              {reservation.pickupCode}
            </span>
          ) : null}
        </div>

        <h2 className="mt-1.5 font-heading text-lg leading-snug">
          {reservation.offer?.title ?? "Oferta no disponible"}
        </h2>

        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Store className="size-3.5 shrink-0" aria-hidden="true" />
          {reservation.business?.name ?? "Establecimiento no disponible"}
        </p>

        <p className="mt-1 text-sm">
          {reservation.quantity}{" "}
          {reservation.quantity === 1 ? "unidad" : "unidades"} ·{" "}
          <span className="font-medium">
            {formatPrice(reservation.totalPrice)}
          </span>
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {reservation.offer
            ? `Recojo: ${formatTimeRange(
                reservation.offer.pickupStart,
                reservation.offer.pickupEnd,
              )}`
            : `Vence: ${formatDateTime(reservation.expiresAt)}`}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {STATUS_HINT[reservation.status]}
        </p>
      </div>

      <ChevronRight
        className="hidden size-5 shrink-0 self-center text-muted-foreground sm:block"
        aria-hidden="true"
      />
    </Link>
  );
}
