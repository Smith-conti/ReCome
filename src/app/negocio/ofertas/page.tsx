import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Search, ShoppingBag, Store, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { OfferStatusActions } from "@/components/offers/offer-status-actions";
import { requireSessionProfile } from "@/lib/auth/session";
import { getOwnBusiness } from "@/lib/business/queries";
import { formatPrice, formatTimeRange } from "@/lib/format";
import {
  countOwnOffers,
  listOwnOffers,
  type BusinessOffer,
} from "@/lib/offers/queries";
import {
  OFFER_DISPLAY_LABEL,
  OFFER_DISPLAY_TONE,
  OFFER_STATUSES,
  isOfferStatus,
  offerDisplayStatus,
  type OfferDisplayStatus,
} from "@/lib/offers/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mis ofertas",
};

type PageProps = {
  searchParams: Promise<{ estado?: string | string[]; q?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function listHref(params: { estado?: string; q?: string }): string {
  const search = new URLSearchParams();
  if (params.estado) search.set("estado", params.estado);
  if (params.q) search.set("q", params.q);
  const query = search.toString();
  return query ? `/negocio/ofertas?${query}` : "/negocio/ofertas";
}

export default function NegocioOfertasPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <NegocioOfertasContent searchParams={searchParams} />
    </Suspense>
  );
}

async function NegocioOfertasContent({ searchParams }: PageProps) {
  const profile = await requireSessionProfile();
  const business = await getOwnBusiness(profile.id);

  if (!business) {
    return (
      <div className="max-w-xl">
        <p className="eyebrow">Panel del comercio</p>
        <h1 className="mt-3 text-3xl">Mis ofertas</h1>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
            <Store className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-xl">Primero registra tu establecimiento</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Para publicar excedentes necesitamos los datos de tu comercio. El
            registro queda en revisión hasta que un administrador lo apruebe.
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
  const status: OfferDisplayStatus | undefined =
    rawStatus === "ARCHIVED" || isOfferStatus(rawStatus) ? rawStatus : undefined;
  const search = firstParam(params.q).slice(0, 80);

  const [offers, counts] = await Promise.all([
    listOwnOffers({ status, search }),
    countOwnOffers(),
  ]);

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const tabs: { key: string; label: string; count: number }[] = [
    { key: "", label: "Todas", count: total },
    ...OFFER_STATUSES.map((offerStatus) => ({
      key: offerStatus,
      label: OFFER_DISPLAY_LABEL[offerStatus],
      count: counts[offerStatus],
    })),
    {
      key: "ARCHIVED",
      label: OFFER_DISPLAY_LABEL.ARCHIVED,
      count: counts.ARCHIVED,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Panel del comercio</p>
          <h1 className="mt-2 text-3xl">Mis ofertas</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Crea borradores, publica excedentes y ajusta el stock disponible.
            Las ofertas publicadas aparecen en el catálogo público.
          </p>
        </div>
        <Link
          href="/negocio/ofertas/nueva"
          className={buttonVariants({ className: "h-10 shrink-0 px-4" })}
        >
          <Plus aria-hidden="true" />
          Nueva oferta
        </Link>
      </div>

      {business.approval_status !== "APPROVED" ? (
        <div className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm leading-relaxed">
          <p className="font-medium">Tu comercio todavía no está aprobado</p>
          <p className="mt-0.5 text-muted-foreground">
            Puedes preparar borradores, pero no publicar. Un administrador debe
            aprobar tu establecimiento primero.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = (status ?? "") === tab.key;
          return (
            <Link
              key={tab.key || "ALL"}
              href={listHref({ estado: tab.key || undefined, q: search })}
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

      <form
        action="/negocio/ofertas"
        method="get"
        className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row"
        role="search"
      >
        {status ? <input type="hidden" name="estado" value={status} /> : null}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Buscar por título"
            aria-label="Buscar mis ofertas por título"
            maxLength={80}
            className="h-10 pl-9"
          />
        </div>
        <Button type="submit" variant="outline" className="h-10 px-5">
          Buscar
        </Button>
        {search ? (
          <Link
            href={listHref({ estado: status })}
            className={buttonVariants({
              variant: "ghost",
              className: "h-10 px-4",
            })}
          >
            <X aria-hidden="true" />
            Limpiar
          </Link>
        ) : null}
      </form>

      {offers.length > 0 ? (
        <div className="space-y-3">
          {offers.map((offer) => (
            <BusinessOfferRow
              key={offer.id}
              offer={offer}
              businessApproved={business.approval_status === "APPROVED"}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-card/70 px-6 py-14 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
            <ShoppingBag className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl">
            {status || search
              ? "No hay ofertas con esos filtros"
              : "Todavía no has creado ofertas"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {status || search
              ? "Prueba con otro estado o limpia la búsqueda para ver todas tus ofertas."
              : "Publica tu primer excedente con precio reducido y un horario de recojo. Puedes guardarlo como borrador antes de publicarlo."}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            {status || search ? (
              <Link
                href="/negocio/ofertas"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-10 px-5",
                })}
              >
                Ver todas
              </Link>
            ) : null}
            <Link
              href="/negocio/ofertas/nueva"
              className={buttonVariants({ className: "h-10 px-5" })}
            >
              <Plus aria-hidden="true" />
              Crear mi primera oferta
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function BusinessOfferRow({
  offer,
  businessApproved,
}: {
  offer: BusinessOffer;
  businessApproved: boolean;
}) {
  const display = offerDisplayStatus({
    status: offer.status,
    archived_at: offer.archivedAt,
  });

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-start">
      <div className="grid h-24 w-full shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-primary sm:w-24">
        {offer.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={offer.imageUrl}
            alt={offer.title}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <ShoppingBag className="size-7" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={OFFER_DISPLAY_TONE[display]}>
            {OFFER_DISPLAY_LABEL[display]}
          </Badge>
          {offer.category ? (
            <span className="text-xs text-muted-foreground">
              {offer.category.name}
            </span>
          ) : null}
        </div>

        <h2 className="mt-1.5 font-heading text-lg leading-snug">
          {offer.title}
        </h2>

        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium">{formatPrice(offer.discountedPrice)}</span>
          <span className="text-muted-foreground line-through">
            {formatPrice(offer.originalPrice)}
          </span>
          <span className="text-muted-foreground">
            · {offer.availableQuantity} de {offer.initialQuantity} disponibles
          </span>
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          Recojo: {formatTimeRange(offer.pickupStart, offer.pickupEnd)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-3 sm:items-end">
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Link
            href={`/negocio/ofertas/${offer.id}/editar`}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "h-8 px-3",
            })}
          >
            Editar
          </Link>
          {offer.status === "ACTIVE" && !offer.archivedAt ? (
            <Link
              href={`/ofertas/${offer.id}`}
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "h-8 px-3",
              })}
            >
              Ver pública
            </Link>
          ) : null}
        </div>

        <div className="sm:max-w-xs">
          <OfferStatusActions
            offerId={offer.id}
            status={offer.status}
            archived={Boolean(offer.archivedAt)}
            businessApproved={businessApproved}
          />
        </div>
      </div>
    </article>
  );
}
