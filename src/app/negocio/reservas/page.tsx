import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  CalendarCheck,
  KeyRound,
  Mail,
  Package,
  Phone,
  Store,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ReservationActions } from "@/components/reservations/reservation-actions";
import { requireSessionProfile } from "@/lib/auth/session";
import { getOwnBusiness } from "@/lib/business/queries";
import { formatDateTime, formatPrice, formatTimeRange } from "@/lib/format";
import {
  countReservationsForBusiness,
  listReservationsForBusiness,
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
  title: "Reservas recibidas",
};

type PageProps = {
  searchParams: Promise<{ estado?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function listHref(status?: string): string {
  return status ? `/negocio/reservas?estado=${status}` : "/negocio/reservas";
}

const STATUS_HINT: Record<ReservationStatus, string> = {
  PENDING: "Confírmala cuando tengas listo el pedido.",
  CONFIRMED: "El cliente ya puede recogerla con su código.",
  DELIVERED: "Entrega completada.",
  CANCELLED: "Cancelada; el stock volvió a la oferta.",
  EXPIRED: "Venció sin recogerse; el stock volvió a la oferta.",
};

export default function NegocioReservasPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <NegocioReservasContent searchParams={searchParams} />
    </Suspense>
  );
}

async function NegocioReservasContent({ searchParams }: PageProps) {
  const profile = await requireSessionProfile();
  const business = await getOwnBusiness(profile.id);

  if (!business) {
    return (
      <div className="max-w-xl">
        <p className="eyebrow">Panel del comercio</p>
        <h1 className="mt-3 text-3xl">Reservas recibidas</h1>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
            <Store className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-xl">Primero registra tu establecimiento</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Las reservas llegan a través de tus ofertas publicadas. Registra tu
            comercio y espera la aprobación para empezar a recibirlas.
          </p>
          <Link
            href="/negocio/perfil"
            className={buttonVariants({ className: "mt-5 h-10 px-5" })}
          >
            Registrar establecimiento
          </Link>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const rawStatus = firstParam(params.estado);
  const status: ReservationStatus | undefined = isReservationStatus(rawStatus)
    ? rawStatus
    : undefined;

  const [reservations, counts] = await Promise.all([
    listReservationsForBusiness(business.id, { status }),
    countReservationsForBusiness(business.id),
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
          <p className="eyebrow">Panel del comercio</p>
          <h1 className="mt-2 text-3xl">Reservas recibidas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Confirma los pedidos pendientes, revisa la fecha de recojo y
            cancela si no podrás atenderlos. Las entregas se registran con el
            código del cliente.
          </p>
        </div>
        <Link
          href="/negocio/entregas"
          className={buttonVariants({ className: "h-10 shrink-0 px-4" })}
        >
          <KeyRound aria-hidden="true" />
          Registrar entrega
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm leading-relaxed">
        <p className="font-medium">El código de recojo no se muestra aquí</p>
        <p className="mt-0.5 text-muted-foreground">
          Por seguridad, pídeselo al cliente en{" "}
          <Link href="/negocio/entregas" className="text-primary hover:underline">
            Registrar entrega
          </Link>
          . Así confirmas que la persona correcta retira el pedido.
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
        <div className="space-y-3">
          {reservations.map((reservation) => (
            <BusinessReservationRow
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
              : "Todavía no has recibido reservas"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {status
              ? "Prueba con otro estado o vuelve a «Todas» para ver el historial completo."
              : "Cuando un cliente reserve una de tus ofertas publicadas, aparecerá aquí con sus datos de recojo."}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            {status ? (
              <Link
                href="/negocio/reservas"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-10 px-5",
                })}
              >
                Ver todas
              </Link>
            ) : null}
            <Link
              href="/negocio/ofertas"
              className={buttonVariants({ className: "h-10 px-5" })}
            >
              Administrar mis ofertas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function BusinessReservationRow({
  reservation,
}: {
  reservation: Reservation;
}) {
  const customer = reservation.customer;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-start">
      <div className="grid h-20 w-full shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-primary lg:w-20">
        {reservation.offer?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reservation.offer.imageUrl}
            alt={reservation.offer.title}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <Package className="size-6" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={RESERVATION_STATUS_TONE[reservation.status]}>
            {RESERVATION_STATUS_LABEL[reservation.status]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(reservation.createdAt)}
          </span>
        </div>

        <h2 className="mt-1.5 font-heading text-lg leading-snug">
          {reservation.offer?.title ?? "Oferta no disponible"}
        </h2>

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

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
            {customer?.fullName ?? "Cliente no disponible"}
          </span>
          {customer?.phone ? (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center gap-1.5 hover:text-primary hover:underline"
            >
              <Phone className="size-3.5 shrink-0" aria-hidden="true" />
              {customer.phone}
            </a>
          ) : null}
          {customer?.email ? (
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center gap-1.5 hover:text-primary hover:underline"
            >
              <Mail className="size-3.5 shrink-0" aria-hidden="true" />
              {customer.email}
            </a>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 lg:items-end">
        <ReservationActions
          reservationId={reservation.id}
          showConfirm={reservation.status === "PENDING"}
          showCancel={
            reservation.status === "PENDING" ||
            reservation.status === "CONFIRMED"
          }
          confirmLabel="Confirmar reserva"
        />
        {reservation.status === "CONFIRMED" ? (
          <Link
            href="/negocio/entregas"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "h-8 w-fit px-3",
            })}
          >
            <KeyRound aria-hidden="true" />
            Registrar entrega
          </Link>
        ) : null}
      </div>
    </article>
  );
}
