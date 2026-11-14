import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search, ShoppingBag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { requireRole } from "@/lib/auth/session";
import { formatPrice, formatTimeRange } from "@/lib/format";
import {
  countOffersForAdmin,
  listOffersForAdmin,
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
  title: "Ofertas",
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
  return query ? `/admin/ofertas?${query}` : "/admin/ofertas";
}

export default function AdminOfertasPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <AdminOfertasContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminOfertasContent({ searchParams }: PageProps) {
  await requireRole("ADMIN");

  const params = await searchParams;
  const rawStatus = firstParam(params.estado);
  const status: OfferDisplayStatus | undefined =
    rawStatus === "ARCHIVED" || isOfferStatus(rawStatus) ? rawStatus : undefined;
  const search = firstParam(params.q).slice(0, 80);

  const [offers, counts] = await Promise.all([
    listOffersForAdmin({ status, search }),
    countOffersForAdmin(),
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
      <div>
        <p className="eyebrow">Administración</p>
        <h1 className="mt-2 text-3xl">Ofertas</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Consulta todas las ofertas de los comercios: estado, precios, stock y
          horario de recojo. Este listado es de solo lectura.
        </p>
      </div>

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
        action="/admin/ofertas"
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
            placeholder="Buscar por título de la oferta"
            aria-label="Buscar ofertas por título"
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
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[minmax(0,1.7fr)_130px_120px_190px] gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid">
            <span>Oferta</span>
            <span>Precio</span>
            <span>Stock</span>
            <span>Recojo</span>
          </div>

          {offers.map((offer) => {
            const display = offerDisplayStatus({
              status: offer.status,
              archived_at: offer.archivedAt,
            });

            return (
              <article
                key={offer.id}
                className="grid gap-3 border-b border-border px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(0,1.7fr)_130px_120px_190px] lg:items-center lg:gap-4"
              >
                <div className="min-w-0">
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
                  <h2 className="mt-1.5 font-heading text-base leading-snug">
                    {offer.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {offer.business ? (
                      <Link
                        href={`/admin/negocios/${offer.business.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {offer.business.name}
                      </Link>
                    ) : (
                      "Comercio no disponible"
                    )}
                  </p>
                </div>

                <div className="text-sm">
                  <p className="font-medium">
                    {formatPrice(offer.discountedPrice)}
                  </p>
                  <p className="text-xs text-muted-foreground line-through">
                    {formatPrice(offer.originalPrice)}
                  </p>
                </div>

                <div className="text-sm">
                  <p>
                    {offer.availableQuantity} de {offer.initialQuantity}
                  </p>
                  <p className="text-xs text-muted-foreground">disponibles</p>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Recojo</p>
                  <p>{formatTimeRange(offer.pickupStart, offer.pickupEnd)}</p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-card/70 px-6 py-14 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
            <ShoppingBag className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl">
            {status || search
              ? "No hay ofertas con esos filtros"
              : "Todavía no hay ofertas registradas"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {status || search
              ? "Prueba con otro estado o limpia la búsqueda."
              : "Cuando los comercios creen sus ofertas, aparecerán en este listado para consulta administrativa."}
          </p>
          {status || search ? (
            <Link
              href="/admin/ofertas"
              className={buttonVariants({ className: "mt-6 h-10 px-5" })}
            >
              Ver todas
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
