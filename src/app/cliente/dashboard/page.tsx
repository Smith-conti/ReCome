import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  CalendarCheck,
  ChevronRight,
  Clock3,
  Mail,
  Phone,
  Ticket,
  UserRound,
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
import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireSessionProfile } from "@/lib/auth/session";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { formatTimeRange } from "@/lib/format";
import {
  countReservationsForCustomer,
  listUpcomingReservationsForCustomer,
} from "@/lib/reservations/queries";
import {
  RESERVATION_STATUS_LABEL,
  RESERVATION_STATUS_TONE,
} from "@/lib/reservations/types";

export const metadata: Metadata = {
  title: "Mi panel",
};

export default function ClienteDashboardPage() {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <ClienteDashboardContent />
    </Suspense>
  );
}

async function ClienteDashboardContent() {
  const profile = await requireSessionProfile();
  const firstName = profile.fullName.split(/\s+/)[0] ?? profile.fullName;

  const [counts, upcoming] = await Promise.all([
    countReservationsForCustomer(),
    listUpcomingReservationsForCustomer(3),
  ]);

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Panel del cliente</p>
        <h1 className="mt-2 text-2xl sm:text-3xl">Hola, {firstName}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Desde aquí vas a gestionar tus reservas de excedentes y tus datos de
          contacto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="size-4 text-primary" aria-hidden="true" />
            Mis reservas
          </CardTitle>
          <CardDescription>
            Consulta tus reservas activas, su código de recojo y tu historial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatLink
              href="/cliente/reservas?estado=PENDING"
              label="Pendientes"
              value={counts.PENDING}
            />
            <StatLink
              href="/cliente/reservas?estado=CONFIRMED"
              label="Confirmadas"
              value={counts.CONFIRMED}
            />
            <StatLink
              href="/cliente/reservas?estado=DELIVERED"
              label="Entregadas"
              value={counts.DELIVERED}
            />
            <StatLink
              href="/cliente/reservas"
              label="Total"
              value={total}
            />
          </div>

          {upcoming.length > 0 ? (
            <div className="space-y-2">
              {upcoming.map((reservation) => (
                <Link
                  key={reservation.id}
                  href={`/cliente/reservas/${reservation.id}`}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40 hover:bg-secondary/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={RESERVATION_STATUS_TONE[reservation.status]}>
                        {RESERVATION_STATUS_LABEL[reservation.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {reservation.business?.name ??
                          "Establecimiento no disponible"}
                      </span>
                    </div>
                    <p className="mt-1 truncate font-medium">
                      {reservation.offer?.title ?? "Oferta no disponible"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
                      {reservation.offer
                        ? formatTimeRange(
                            reservation.offer.pickupStart,
                            reservation.offer.pickupEnd,
                          )
                        : "Horario no disponible"}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 font-mono text-sm tracking-[0.2em]">
                    <Ticket className="size-3.5" aria-hidden="true" />
                    {reservation.pickupCode}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm font-medium">
                {total > 0
                  ? "No tienes reservas activas"
                  : "Todavía no tienes reservas"}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                {total > 0
                  ? "Tu historial está disponible en «Mis reservas»."
                  : "Explora el catálogo y reserva un excedente. Aquí verás su estado y su código de recojo."}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Link
              href="/cliente/reservas"
              className={buttonVariants({
                variant: "outline",
                className: "h-9 px-4",
              })}
            >
              Ver todas mis reservas
              <ChevronRight aria-hidden="true" />
            </Link>
            <Link
              href="/ofertas"
              className={buttonVariants({ className: "h-9 px-4" })}
            >
              <CalendarCheck aria-hidden="true" />
              Buscar excedentes
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="size-4 text-primary" aria-hidden="true" />
            Tu cuenta
          </CardTitle>
          <CardDescription>
            Estos son los datos asociados a tu sesión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{ROLE_LABEL[profile.role]}</Badge>
            <span className="text-sm text-muted-foreground">
              Cuenta verificada con Supabase Auth
            </span>
          </div>

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Nombre</dt>
              <UserRound
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <dd className="truncate">{profile.fullName}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Correo</dt>
              <Mail
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <dd className="truncate">{profile.email}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Teléfono</dt>
              <Phone
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <dd className="truncate">
                {profile.phone ?? "Sin teléfono registrado"}
              </dd>
            </div>
          </dl>

          <Link
            href="/cliente/perfil"
            className={buttonVariants({
              variant: "outline",
              className: "mt-2 h-9 w-fit",
            })}
          >
            Editar mis datos
            <ChevronRight aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function StatLink({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-background px-3 py-3 transition-colors hover:border-primary/40 hover:bg-secondary/40"
    >
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}
