import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CircleCheck,
  Clock3,
  MapPin,
  Package,
  Phone,
  Store,
  Ticket,
  XCircle,
} from "lucide-react";
import { FormAlert } from "@/components/auth/fields";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ReservationActions } from "@/components/reservations/reservation-actions";
import { requireSessionProfile } from "@/lib/auth/session";
import { formatDateTime, formatPrice, formatTimeRange } from "@/lib/format";
import { getReservationForCustomer } from "@/lib/reservations/queries";
import {
  RESERVATION_EVENT_LABEL,
  RESERVATION_STATUS_LABEL,
  RESERVATION_STATUS_TONE,
  isActiveReservationStatus,
} from "@/lib/reservations/types";

export const metadata: Metadata = {
  title: "Detalle de la reserva",
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    creada?: string | string[];
    cancelada?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function ClienteReservaDetailPage({
  params,
  searchParams,
}: PageProps) {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <ClienteReservaDetailContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function ClienteReservaDetailContent({
  params,
  searchParams,
}: PageProps) {
  const profile = await requireSessionProfile();
  const { id } = await params;
  const [{ creada, cancelada }, reservation] = await Promise.all([
    searchParams,
    getReservationForCustomer(id, profile.id),
  ]);

  if (!reservation) notFound();

  const justCreated = firstParam(creada) === "1";
  const justCancelled = firstParam(cancelada) === "1";
  const active = isActiveReservationStatus(reservation.status);
  const pickupStarted = reservation.offer
    ? new Date() >= new Date(reservation.offer.pickupStart)
    : false;
  const canCancel = active && !pickupStarted;
  const mapQuery = reservation.business
    ? [
        reservation.business.address,
        reservation.business.district,
        "Cusco",
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  const mapUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/cliente/reservas"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "-ml-2 gap-1.5 text-muted-foreground",
        })}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a mis reservas
      </Link>

      <div>
        <p className="eyebrow">Reserva</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl">
            {reservation.offer?.title ?? "Oferta no disponible"}
          </h1>
          <Badge variant={RESERVATION_STATUS_TONE[reservation.status]}>
            {RESERVATION_STATUS_LABEL[reservation.status]}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {reservation.business?.name ?? "Establecimiento no disponible"} ·{" "}
          Reserva del {formatDateTime(reservation.createdAt)}
        </p>
      </div>

      {justCreated ? (
        <FormAlert tone="success">
          Reservamos tu excedente y descontamos el stock. Guarda tu código de
          recojo: lo necesitarás para retirar el pedido.
        </FormAlert>
      ) : null}

      {justCancelled ? (
        <FormAlert tone="success">
          Cancelamos tu reserva y devolvimos el stock a la oferta. Ya no
          necesitas acudir al establecimiento.
        </FormAlert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-4 text-primary" aria-hidden="true" />
                Detalle de la reserva
              </CardTitle>
              <CardDescription>
                Estos son los datos del excedente que reservaste.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <DetailItem
                  icon={Package}
                  label="Cantidad"
                  value={`${reservation.quantity} ${
                    reservation.quantity === 1 ? "unidad" : "unidades"
                  }`}
                />
                <DetailItem
                  icon={Ticket}
                  label="Total a pagar"
                  value={formatPrice(reservation.totalPrice)}
                />
                <DetailItem
                  icon={Clock3}
                  label="Horario de recojo"
                  value={
                    reservation.offer
                      ? formatTimeRange(
                          reservation.offer.pickupStart,
                          reservation.offer.pickupEnd,
                        )
                      : "Horario no disponible"
                  }
                />
                <DetailItem
                  icon={CalendarClock}
                  label="Vence"
                  value={formatDateTime(reservation.expiresAt)}
                />
                <DetailItem
                  icon={Store}
                  label="Precio unitario"
                  value={formatPrice(reservation.unitPrice)}
                />
                <DetailItem
                  icon={CircleCheck}
                  label="Estado"
                  value={RESERVATION_STATUS_LABEL[reservation.status]}
                />
              </dl>

              <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                El pago se coordina directamente en el establecimiento. Si no
                recoges antes del vencimiento, la reserva se marca como vencida
                y el stock vuelve a la oferta.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de la reserva</CardTitle>
              <CardDescription>
                Cada cambio de estado queda registrado con su fecha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reservation.events.length > 0 ? (
                <ol className="space-y-4">
                  {reservation.events.map((event, index) => (
                    <li key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-1 grid size-2.5 shrink-0 rounded-full bg-primary" />
                        {index < reservation.events.length - 1 ? (
                          <span className="mt-1 w-px flex-1 bg-border" />
                        ) : null}
                      </div>
                      <div className="min-w-0 pb-1">
                        <p className="text-sm font-medium">
                          {RESERVATION_EVENT_LABEL[event.event]}
                        </p>
                        {event.description ? (
                          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                            {event.description}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay eventos registrados.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="size-4 text-primary" aria-hidden="true" />
                Código de recojo
              </CardTitle>
              <CardDescription>
                Muéstralo en el establecimiento al recoger tu pedido.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {active ? (
                <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-secondary/60 px-4 py-6 text-center">
                  <p className="font-mono text-3xl font-semibold tracking-[0.35em]">
                    {reservation.pickupCode}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {reservation.status === "PENDING"
                      ? "El comercio todavía debe confirmar tu reserva."
                      : "Reserva confirmada: ya puedes recogerla."}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                  {reservation.status === "DELIVERED" ? (
                    <p className="flex items-center justify-center gap-2">
                      <CircleCheck
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      Reserva entregada. ¡Buen provecho!
                    </p>
                  ) : (
                    <p className="flex items-center justify-center gap-2">
                      <XCircle
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      Esta reserva ya no está activa.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {active ? (
            <Card>
              <CardHeader>
                <CardTitle>¿No podrás recogerla?</CardTitle>
                <CardDescription>
                  {canCancel
                    ? "Puedes cancelar sin costo antes de que empiece el horario de recojo. El stock vuelve a la oferta."
                    : "El horario de recojo ya comenzó. Contacta directamente al establecimiento para coordinar la cancelación."}
                </CardDescription>
              </CardHeader>
              {canCancel ? (
                <CardContent>
                  <ReservationActions
                    reservationId={reservation.id}
                    showCancel
                    cancelLabel="Cancelar reserva"
                  />
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          {reservation.business ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="size-4 text-primary" aria-hidden="true" />
                  Establecimiento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="font-medium">{reservation.business.name}</p>
                {reservation.business.address ? (
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <MapPin
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span>
                      {reservation.business.address}
                      {reservation.business.district
                        ? `, ${reservation.business.district}`
                        : ""}
                    </span>
                  </p>
                ) : null}
                {reservation.business.phone ? (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone
                      className="size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <a
                      href={`tel:${reservation.business.phone}`}
                      className="hover:text-primary hover:underline"
                    >
                      {reservation.business.phone}
                    </a>
                  </p>
                ) : null}
                <Link
                  href={`/establecimientos/${reservation.business.slug}`}
                  className={buttonVariants({
                    variant: "outline",
                    className: "h-9 px-4",
                  })}
                >
                  Ver establecimiento
                </Link>
                {mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary hover:underline"
                  >
                    Abrir ubicación en Google Maps
                  </a>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon
        className="mt-0.5 size-4 shrink-0 text-primary"
        aria-hidden="true"
      />
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-medium">{value}</dd>
      </div>
    </div>
  );
}
