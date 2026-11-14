import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormAlert } from "@/components/auth/fields";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ArchiveOfferButton } from "@/components/offers/archive-offer-button";
import { OfferForm } from "@/components/offers/offer-form";
import { OfferStatusActions } from "@/components/offers/offer-status-actions";
import { StockForm } from "@/components/offers/stock-form";
import { requireSessionProfile } from "@/lib/auth/session";
import { getOwnBusiness } from "@/lib/business/queries";
import { toLimaInputValue } from "@/lib/format";
import { getOwnOffer, listCategories } from "@/lib/offers/queries";
import {
  OFFER_DISPLAY_LABEL,
  OFFER_DISPLAY_TONE,
  offerDisplayStatus,
} from "@/lib/offers/types";

export const metadata: Metadata = {
  title: "Editar oferta",
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creada?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function EditarOfertaPage({
  params,
  searchParams,
}: PageProps) {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <EditarOfertaContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditarOfertaContent({ params, searchParams }: PageProps) {
  const profile = await requireSessionProfile();
  const { id } = await params;
  const [{ creada }, business, offer, categories] = await Promise.all([
    searchParams,
    getOwnBusiness(profile.id),
    getOwnOffer(id),
    listCategories(),
  ]);

  if (!offer) notFound();

  const justCreated = firstParam(creada) === "1";
  const archived = Boolean(offer.archivedAt);
  const display = offerDisplayStatus({
    status: offer.status,
    archived_at: offer.archivedAt,
  });
  const isPublic = offer.status === "ACTIVE" && !archived;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl">{offer.title}</h1>
            <Badge variant={OFFER_DISPLAY_TONE[display]}>
              {OFFER_DISPLAY_LABEL[display]}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Edita los datos, ajusta el stock o cambia el estado de publicación.
          </p>
        </div>

        {isPublic ? (
          <Link
            href={`/ofertas/${offer.id}`}
            className={buttonVariants({
              variant: "outline",
              className: "h-10 shrink-0 px-4",
            })}
          >
            <ExternalLink aria-hidden="true" />
            Ver en el catálogo
          </Link>
        ) : null}
      </div>

      {justCreated ? (
        <FormAlert tone="success">
          Creamos tu oferta como borrador. Revisa los datos y publícala cuando
          estés listo.
        </FormAlert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div>
          {archived ? (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl">Esta oferta está archivada</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Las ofertas archivadas se conservan por historial, pero ya no
                pueden editarse ni publicarse. Si quieres volver a ofrecer este
                excedente, crea una oferta nueva.
              </p>
              <Link
                href="/negocio/ofertas/nueva"
                className={buttonVariants({ className: "mt-5 h-10 px-5" })}
              >
                Crear una oferta nueva
              </Link>
            </div>
          ) : (
            <OfferForm
              mode="edit"
              businessId={business?.id ?? offer.businessId}
              businessApproved={business?.approval_status === "APPROVED"}
              categories={categories}
              initial={{
                id: offer.id,
                title: offer.title,
                categoryId: offer.categoryId,
                description: offer.description ?? "",
                originalPrice: offer.originalPrice.toFixed(2),
                discountedPrice: offer.discountedPrice.toFixed(2),
                initialQuantity: String(offer.initialQuantity),
                imageUrl: offer.imageUrl ?? "",
                pickupStart: toLimaInputValue(offer.pickupStart),
                pickupEnd: toLimaInputValue(offer.pickupEnd),
                expirationAt: toLimaInputValue(offer.expirationAt),
                ingredients: offer.ingredients ?? "",
                allergens: offer.allergens ?? "",
                storageInstructions: offer.storageInstructions ?? "",
              }}
            />
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle>Estado y publicación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <OfferStatusActions
                offerId={offer.id}
                status={offer.status}
                archived={archived}
                businessApproved={business?.approval_status === "APPROVED"}
              />
            </CardContent>
          </Card>

          {!archived ? (
            <Card>
              <CardHeader>
                <CardTitle>Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <StockForm
                  offerId={offer.id}
                  availableQuantity={offer.availableQuantity}
                  initialQuantity={offer.initialQuantity}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Archivar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                Archivar retira la oferta del catálogo de forma permanente. El
                historial se conserva.
              </p>
              <ArchiveOfferButton offerId={offer.id} archived={archived} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
