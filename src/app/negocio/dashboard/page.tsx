import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, Clock3, MapPin, Store, XCircle } from "lucide-react";
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
  title: "Panel del comercio",
};

type BusinessRow = {
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
      "Tu establecimiento está aprobado. Podrás publicar excedentes en cuanto se habilite la gestión de ofertas.",
  },
  REJECTED: {
    label: "Rechazado",
    tone: "destructive" as const,
    icon: XCircle,
    description:
      "Tu solicitud fue rechazada. Revisa el motivo y corrige los datos de tu establecimiento.",
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
      "name, slug, description, district, address, approval_status, rejection_reason",
    )
    .eq("owner_id", profile.id)
    .maybeSingle<BusinessRow>();

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
              La creación del establecimiento estará disponible muy pronto.
              Cuando se habilite, podrás registrar el nombre, la dirección, el
              horario y el rubro de tu negocio. Un administrador lo revisará
              antes de que publiques ofertas.
            </p>
            <Link
              href="/"
              className={buttonVariants({
                variant: "outline",
                className: "h-9 w-fit",
              })}
            >
              Volver al inicio
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
