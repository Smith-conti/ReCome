import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  KeyRound,
  MapPin,
  Plus,
  ShoppingBag,
  Store,
  XCircle,
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
import { countOwnOffers } from "@/lib/offers/queries";
import { countReservationsForBusiness } from "@/lib/reservations/queries";

export const metadata: Metadata = {
  title: "Panel del comercio",
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  district: string | null;
  address: string | null;
  approval_status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  rejection_reason: string | null;
};

const statusCopy = {
  PENDING: {
    label: "En revisión",
    tone: "secondary" as const,
    icon: Clock3,
    description:
      "Un administrador revisará tu establecimiento. Mientras esté pendiente no podrás publicar ofertas.",
  },
  APPROVED: {
    label: "Aprobado",
    tone: "default" as const,
    icon: CheckCircle2,
    description:
      "Tu establecimiento está aprobado. Mantén tus datos y horarios actualizados para que los clientes sepan dónde recoger.",
  },
  REJECTED: {
    label: "Rechazado",
    tone: "destructive" as const,
    icon: XCircle,
    description:
      "Tu solicitud fue rechazada. Revisa el motivo, corrige los datos y vuelve a enviarla a revisión.",
  },
  SUSPENDED: {
    label: "Suspendido",
    tone: "destructive" as const,
    icon: XCircle,
    description:
      "Tu establecimiento está suspendido y no puede publicar ofertas. Contacta al equipo de ReCome.",
  },
};

export default function NegocioDashboardPage() {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <NegocioDashboardContent />
    </Suspense>
  );
}

async function NegocioDashboardContent() {
  const profile = await requireSessionProfile();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select(
      "id, name, slug, description, district, address, approval_status, rejection_reason",
    )
    .eq("owner_id", profile.id)
    .maybeSingle<BusinessRow>();

  const counts = await countOwnOffers();
  const reservationCounts = business
    ? await countReservationsForBusiness(business.id)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Panel del comercio</p>
        <h1 className="mt-2 text-2xl sm:text-3xl">
          {business ? business.name : "Tu establecimiento"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Cuenta de {profile.fullName}. Desde aquí administrarás tu
          establecimiento, tus ofertas y las reservas que recibas.
        </p>
      </div>

      {business ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="size-4 text-primary" aria-hidden="true" />
              Estado del establecimiento
            </CardTitle>
            <CardDescription>
              {statusCopy[business.approval_status].description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusCopy[business.approval_status].tone}>
                {statusCopy[business.approval_status].label}
              </Badge>
              {business.district ? (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-4" aria-hidden="true" />
                  {[business.address, business.district]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              ) : null}
            </div>

            {business.description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {business.description}
              </p>
            ) : null}

            {business.approval_status === "REJECTED" &&
            business.rejection_reason ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                Motivo del rechazo: {business.rejection_reason}
              </div>
            ) : null}

            <Link
              href="/negocio/perfil"
              className={buttonVariants({
                variant: "outline",
                className: "h-9 w-fit",
              })}
            >
              {business.approval_status === "REJECTED"
                ? "Corregir datos y reenviar"
                : "Editar establecimiento"}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="size-4 text-primary" aria-hidden="true" />
              Aún no registramos tu establecimiento
            </CardTitle>
            <CardDescription>
              Tu cuenta de comercio está activa, pero todavía no tiene un
              establecimiento asociado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Registra el nombre, la dirección, el horario y el rubro de tu
              negocio. Un administrador lo revisará antes de que aparezca en el
              catálogo público.
            </p>
            <Link
              href="/negocio/perfil"
              className={buttonVariants({
                variant: "default",
                className: "h-9 w-fit",
              })}
            >
              <Store className="size-4" aria-hidden="true" />
              Registrar establecimiento
            </Link>
          </CardContent>
        </Card>
      )}

      {business ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="size-4 text-primary" aria-hidden="true" />
              Tus ofertas
            </CardTitle>
            <CardDescription>
              Publica excedentes, ajusta el stock y pausa las ofertas cuando ya
              no estén disponibles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatLink
                href="/negocio/ofertas?estado=ACTIVE"
                label="Publicadas"
                value={counts.ACTIVE}
              />
              <StatLink
                href="/negocio/ofertas?estado=DRAFT"
                label="Borradores"
                value={counts.DRAFT}
              />
              <StatLink
                href="/negocio/ofertas?estado=SOLD_OUT"
                label="Agotadas"
                value={counts.SOLD_OUT}
              />
              <StatLink
                href="/negocio/ofertas?estado=PAUSED"
                label="Pausadas"
                value={counts.PAUSED}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/negocio/ofertas"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-9 px-4",
                })}
              >
                Administrar ofertas
              </Link>
              <Link
                href="/negocio/ofertas/nueva"
                className={buttonVariants({
                  className: "h-9 px-4",
                })}
              >
                <Plus className="size-4" aria-hidden="true" />
                Nueva oferta
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {business && reservationCounts ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="size-4 text-primary" aria-hidden="true" />
              Reservas recibidas
            </CardTitle>
            <CardDescription>
              Confirma los pedidos pendientes y registra las entregas con el
              código del cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatLink
                href="/negocio/reservas?estado=PENDING"
                label="Por confirmar"
                value={reservationCounts.PENDING}
              />
              <StatLink
                href="/negocio/reservas?estado=CONFIRMED"
                label="Por entregar"
                value={reservationCounts.CONFIRMED}
              />
              <StatLink
                href="/negocio/reservas?estado=DELIVERED"
                label="Entregadas"
                value={reservationCounts.DELIVERED}
              />
              <StatLink
                href="/negocio/reservas"
                label="Total"
                value={Object.values(reservationCounts).reduce(
                  (sum, value) => sum + value,
                  0,
                )}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/negocio/reservas"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-9 px-4",
                })}
              >
                Gestionar reservas
              </Link>
              <Link
                href="/negocio/entregas"
                className={buttonVariants({ className: "h-9 px-4" })}
              >
                <KeyRound className="size-4" aria-hidden="true" />
                Registrar entrega
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}
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
