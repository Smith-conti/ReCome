import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock, Package, Store, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DeliveryCodeForm } from "@/components/reservations/delivery-code-form";
import { ReservationActions } from "@/components/reservations/reservation-actions";
import { requireSessionProfile } from "@/lib/auth/session";
import { getOwnBusiness } from "@/lib/business/queries";
import { formatDateTime, formatPrice, formatTimeRange } from "@/lib/format";
import { listPickupQueue } from "@/lib/reservations/queries";
import {
  RESERVATION_STATUS_LABEL,
  RESERVATION_STATUS_TONE,
  type Reservation,
} from "@/lib/reservations/types";

export const metadata: Metadata = {
  title: "Registrar entrega",
};

export default function NegocioEntregasPage() {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <NegocioEntregasContent />
    </Suspense>
  );
}

async function NegocioEntregasContent() {
  const profile = await requireSessionProfile();
  const business = await getOwnBusiness(profile.id);

  if (!business) {
    return (
      <div className="max-w-xl">
        <p className="eyebrow">Panel del comercio</p>
        <h1 className="mt-3 text-3xl">Registrar entrega</h1>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
            <Store className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-xl">Primero registra tu establecimiento</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Las entregas se registran sobre las reservas de tus ofertas.
            Registra tu comercio para comenzar.
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

  const queue = await listPickupQueue(business.id);
  const confirmed = queue.filter(
    (reservation) => reservation.status === "CONFIRMED",
  );
  const pending = queue.filter(
    (reservation) => reservation.status === "PENDING",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Panel del comercio</p>
          <h1 className="mt-2 text-3xl">Registrar entrega</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Valida el código de recojo del cliente para marcar la reserva como
            entregada. Solo se pueden entregar reservas confirmadas.
          </p>
        </div>
        <Link
          href="/negocio/reservas"
          className={buttonVariants({
            variant: "outline",
            className: "h-10 shrink-0 px-4",
          })}
        >
          Ver todas las reservas
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <DeliveryCodeForm />

        <div className="space-y-4">
          <div>
            <h2 className="text-xl">Listas para entregar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reservas confirmadas cuyo horario de recojo todavía no vence.
            </p>
          </div>

          {confirmed.length > 0 ? (
            <div className="space-y-3">
              {confirmed.map((reservation) => (
                <PickupRow key={reservation.id} reservation={reservation} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/70 px-4 py-8 text-center">
              <Package
                className="mx-auto size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-medium">
                No hay reservas confirmadas por entregar
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Confirma las reservas pendientes para habilitarlas aquí.
              </p>
            </div>
          )}

          {pending.length > 0 ? (
            <div className="space-y-3">
              <div>
                <h2 className="text-lg">Pendientes de confirmar</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confírmalas antes de registrar la entrega.
                </p>
              </div>
              {pending.map((reservation) => (
                <PickupRow
                  key={reservation.id}
                  reservation={reservation}
                  showConfirm
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm leading-relaxed">
        <p className="font-medium">Buenas prácticas</p>
        <p className="mt-0.5 text-muted-foreground">
          Verifica el código antes de entregar el pedido y confirma que el
          cliente recibe la cantidad reservada. Si el código falla cinco veces,
          la reserva se bloquea y solo un administrador puede revisarla.
        </p>
      </div>
    </div>
  );
}

function PickupRow({
  reservation,
  showConfirm = false,
}: {
  reservation: Reservation;
  showConfirm?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={RESERVATION_STATUS_TONE[reservation.status]}>
          {RESERVATION_STATUS_LABEL[reservation.status]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {reservation.quantity}{" "}
          {reservation.quantity === 1 ? "unidad" : "unidades"} ·{" "}
          {formatPrice(reservation.totalPrice)}
        </span>
      </div>

      <h3 className="mt-1.5 font-heading text-base leading-snug">
        {reservation.offer?.title ?? "Oferta no disponible"}
      </h3>

      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
        {reservation.customer?.fullName ?? "Cliente no disponible"}
        {reservation.customer?.phone
          ? ` · ${reservation.customer.phone}`
          : ""}
      </p>

      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
        {reservation.offer
          ? `Recojo: ${formatTimeRange(
              reservation.offer.pickupStart,
              reservation.offer.pickupEnd,
            )}`
          : `Vence: ${formatDateTime(reservation.expiresAt)}`}
      </p>

      {showConfirm ? (
        <ReservationActions
          reservationId={reservation.id}
          showConfirm
          confirmLabel="Confirmar"
          className="mt-3"
        />
      ) : null}
    </article>
  );
}
