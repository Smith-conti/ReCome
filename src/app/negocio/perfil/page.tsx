import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BusinessForm } from "@/components/business/business-form";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { requireSessionProfile } from "@/lib/auth/session";
import { getOwnBusiness } from "@/lib/business/queries";
import {
  approvalStatusLabel,
  approvalStatusTone,
  parseOpeningHours,
} from "@/lib/business/types";

export const metadata: Metadata = {
  title: "Mi establecimiento",
};

export default function NegocioPerfilPage() {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <NegocioPerfilContent />
    </Suspense>
  );
}

const STATUS_HINT: Record<string, string> = {
  PENDING:
    "Tu solicitud está en revisión. Un administrador verificará los datos antes de aprobarla.",
  APPROVED:
    "Tu establecimiento está aprobado. Puedes actualizar tus datos cuando quieras; los cambios no requieren una nueva aprobación.",
  REJECTED:
    "Tu solicitud fue rechazada. Corrige lo que indica el motivo y guarda los cambios: la solicitud volverá a revisión automáticamente.",
  SUSPENDED:
    "Tu establecimiento está suspendido. Puedes corregir tus datos, pero la reactivación la decide un administrador.",
};

async function NegocioPerfilContent() {
  const profile = await requireSessionProfile();
  const business = await getOwnBusiness(profile.id);
  const hours = parseOpeningHours(business?.opening_hours);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/negocio/dashboard"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-2 mb-2 gap-1.5 text-muted-foreground",
          })}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al resumen
        </Link>
        <p className="eyebrow">Mi establecimiento</p>
        <h1 className="mt-2 text-2xl sm:text-3xl">
          {business ? business.name : "Registra tu establecimiento"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {business
            ? "Estos datos aparecen en tu ficha pública. La dirección y el horario ayudan a tus clientes a recoger sus reservas."
            : "Completa los datos de tu local. Un administrador los revisará antes de que puedas publicar excedentes."}
        </p>
      </div>

      {business ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Store className="size-4 text-primary" aria-hidden="true" />
            <Badge variant={approvalStatusTone(business.approval_status)}>
              {approvalStatusLabel(business.approval_status)}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {STATUS_HINT[business.approval_status] ?? ""}
          </p>
          {business.rejection_reason ? (
            <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              Motivo: {business.rejection_reason}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm leading-relaxed text-muted-foreground">
          Todavía no tienes un establecimiento asociado a tu cuenta. Completa el
          formulario para enviarlo a revisión.
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <BusinessForm
          mode={business ? "edit" : "create"}
          initial={{
            name: business?.name ?? "",
            type: business?.type ?? "BAKERY",
            description: business?.description ?? "",
            address: business?.address ?? "",
            district: business?.district ?? "",
            city: business?.city ?? "Cusco",
            phone: business?.phone ?? profile.phone ?? "",
            email: business?.email ?? profile.email,
            openingHours: hours,
          }}
        />
      </div>
    </div>
  );
}
