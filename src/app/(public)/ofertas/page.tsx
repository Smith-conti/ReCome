import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search, SlidersHorizontal, ShoppingBag, Store, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  OfferCard,
  OfferGridSkeleton,
} from "@/components/offers/offer-card";
import { listCategories, listPublicOffers } from "@/lib/offers/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ofertas",
  description:
    "Catálogo de excedentes de alimentos con descuento en Cusco. Consulta precios, horarios de recojo y establecimientos.",
};

type PageProps = {
  searchParams: Promise<{ q?: string | string[]; categoria?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function offersHref(params: { q?: string; categoria?: string }): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.categoria) search.set("categoria", params.categoria);
  const query = search.toString();
  return query ? `/ofertas?${query}` : "/ofertas";
}

export default function OffersPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <OffersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OffersContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = firstParam(params.q).slice(0, 80);
  const categorySlug = firstParam(params.categoria);

  const [categories, offers] = await Promise.all([
    listCategories(),
    listPublicOffers({ search, categorySlug: categorySlug || undefined }),
  ]);

  const hasFilters = Boolean(search || categorySlug);

  return (
    <section className="section-space">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="eyebrow">Catálogo</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">
            Excedentes ricos, precios más justos
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Productos en buen estado de comercios de Cusco, con precio reducido
            y un horario claro de recojo. Sin delivery ni intermediarios.
          </p>
        </div>

        <form
          action="/ofertas"
          method="get"
          className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center"
          role="search"
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              name="q"
              type="search"
              defaultValue={search}
              placeholder="Buscar por nombre de la oferta"
              aria-label="Buscar ofertas por nombre"
              maxLength={80}
              className="h-11 pl-9"
            />
          </div>

          <div className="relative sm:w-56">
            <SlidersHorizontal
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <select
              name="categoria"
              defaultValue={categorySlug}
              aria-label="Filtrar por categoría"
              className="h-11 w-full appearance-none rounded-lg border border-input bg-transparent pr-3 pl-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" className="h-11 px-6">
            Buscar
          </Button>

          {hasFilters ? (
            <Link
              href="/ofertas"
              className={buttonVariants({
                variant: "ghost",
                className: "h-11 px-4",
              })}
            >
              <X aria-hidden="true" />
              Limpiar
            </Link>
          ) : null}
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={offersHref({ q: search })}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              !categorySlug
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            Todas
          </Link>
          {categories.map((category) => {
            const active = category.slug === categorySlug;
            return (
              <Link
                key={category.id}
                href={offersHref({ q: search, categoria: category.slug })}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {category.name}
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex items-baseline justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {offers.length === 0
              ? "Sin ofertas activas"
              : `${offers.length} ${offers.length === 1 ? "oferta activa" : "ofertas activas"}`}
            {search ? (
              <>
                {" "}
                para <span className="font-medium text-foreground">“{search}”</span>
              </>
            ) : null}
          </p>
          <Link
            href="/establecimientos"
            className="hidden text-sm text-primary hover:underline sm:inline"
          >
            Ver establecimientos
          </Link>
        </div>

        <div className="mt-4">
          {offers.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card/70 px-6 py-14 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                <ShoppingBag className="size-6" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-xl">
                {hasFilters
                  ? "No encontramos ofertas con esos filtros"
                  : "Todavía no hay ofertas activas"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {hasFilters
                  ? "Prueba con otra categoría o revisa la ortografía de tu búsqueda."
                  : "Cuando los comercios aprobados publiquen sus excedentes, aparecerán aquí. También puedes explorar los establecimientos disponibles."}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                {hasFilters ? (
                  <Link
                    href="/ofertas"
                    className={buttonVariants({ className: "h-10 px-5" })}
                  >
                    Ver todas las ofertas
                  </Link>
                ) : null}
                <Link
                  href="/establecimientos"
                  className={buttonVariants({
                    variant: hasFilters ? "outline" : "default",
                    className: "h-10 px-5",
                  })}
                >
                  <Store aria-hidden="true" />
                  Ver establecimientos
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CatalogSkeleton() {
  return (
    <section className="section-space">
      <div className="container-page space-y-8">
        <div className="space-y-4">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-11 w-full max-w-xl animate-pulse rounded bg-muted" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
        </div>
        <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-8 w-24 animate-pulse rounded-full bg-muted"
            />
          ))}
        </div>
        <OfferGridSkeleton />
      </div>
    </section>
  );
}
