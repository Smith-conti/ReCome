import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Store } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { OfferForm } from "@/components/offers/offer-form";
import { requireSessionProfile } from "@/lib/auth/session";
import { getOwnBusiness } from "@/lib/business/queries";
import { defaultPickupWindow } from "@/lib/format";
import { listCategories } from "@/lib/offers/queries";

export const metadata: Metadata = {
  title: "Nueva oferta",
};

export default function NuevaOfertaPage() {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <NuevaOfertaContent />
    </Suspense>
  );
}

async function NuevaOfertaContent() {
  const profile = await requireSessionProfile();
  const [business, categories] = await Promise.all([
    getOwnBusiness(profile.id),
    listCategories(),
  ]);

  if (!business) {
    return (
      <div className="max-w-xl">
        <p className="eyebrow">Panel del comercio</p>
        <h1 className="mt-3 text-3xl">Nueva oferta</h1>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
            <Store className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-xl">Registra tu establecimiento primero</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Las ofertas pertenecen a un comercio. Completa los datos de tu
            establecimiento para poder publicar excedentes.
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

  const window = defaultPickupWindow();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/negocio/ofertas"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-2 mb-2 gap-1.5 text-muted-foreground",
          })}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a mis ofertas
        </Link>
        <p className="eyebrow">Panel del comercio</p>
        <h1 className="mt-2 text-3xl">Nueva oferta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Guardaremos la oferta como borrador. Podrás revisarla y publicarla
          desde su panel.
        </p>
      </div>

      <OfferForm
        mode="create"
        businessId={business.id}
        businessApproved={business.approval_status === "APPROVED"}
        categories={categories}
        initial={{
          title: "",
          categoryId: categories[0]?.id ?? "",
          description: "",
          originalPrice: "",
          discountedPrice: "",
          initialQuantity: "10",
          imageUrl: "",
          pickupStart: window.start,
          pickupEnd: window.end,
          expirationAt: "",
          ingredients: "",
          allergens: "",
          storageInstructions: "",
        }}
      />
    </div>
  );
}
