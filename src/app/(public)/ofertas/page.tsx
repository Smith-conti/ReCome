import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Search, SlidersHorizontal, ShoppingBag, Store, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  OfferCard,
  OfferGridSkeleton,
} from "@/components/offers/offer-card";
import { listCategories, listPublicOffers, listCatalogDistricts } from "@/lib/offers/queries";
import { parseCatalogFilters, catalogHref, type CatalogParams } from "@/lib/offers/catalog-filters";
import { BUSINESS_TYPES, BUSINESS_TYPE_LABEL } from "@/lib/business/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ofertas",
  description:
    "Catálogo de excedentes de alimentos con descuento en Cusco. Consulta precios, horarios de recojo y establecimientos.",
};

type PageProps = { searchParams: Promise<CatalogParams> };

export default function OffersPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <OffersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OffersContent({ searchParams }: PageProps) {
  // La consulta filtra por hora de recojo vigente: se resuelve en cada
  // petición para no usar `new Date()` durante el prerender.
  await connection();

  const filters = parseCatalogFilters(await searchParams);
  const { values, errors, page } = filters;
  const search = values.q, categorySlug = values.categoria;
  const pageSize = 24;
  const [categories, districts, results] = await Promise.all([
    listCategories(), listCatalogDistricts(),
    errors.length ? Promise.resolve([]) : listPublicOffers({ ...filters, limit: pageSize + 1, offset: (page-1)*pageSize }),
  ]);
  const offers = results.slice(0, pageSize);
  const hasNext = results.length > pageSize;
  const hasFilters = Object.values(values).some(Boolean);
  const fieldClass = "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
          className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
          role="search"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative sm:col-span-2 lg:col-span-2">
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

          <div className="relative">
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

          <label className="space-y-1.5 text-xs font-medium">Tipo de negocio
            <select name="tipo" defaultValue={values.tipo} className={fieldClass}>
              <option value="">Todos los tipos</option>
              {BUSINESS_TYPES.map(type => <option key={type} value={type}>{BUSINESS_TYPE_LABEL[type]}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium">Zona / distrito
            <select name="zona" defaultValue={values.zona} className={fieldClass}>
              <option value="">Todas las zonas</option>
              {districts.map(district => <option key={district} value={district}>{district}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1.5 text-xs font-medium">Precio mínimo (S/)
              <Input name="min" type="number" min="0" max="99999.99" step="0.01" defaultValue={values.min.replace(",", ".")} placeholder="0.00" className="h-11" />
            </label>
            <label className="space-y-1.5 text-xs font-medium">Precio máximo (S/)
              <Input name="max" type="number" min="0" max="99999.99" step="0.01" defaultValue={values.max.replace(",", ".")} placeholder="Sin límite" className="h-11" />
            </label>
          </div>
          <label className="space-y-1.5 text-xs font-medium">Fecha de recojo
            <Input name="fecha" type="date" defaultValue={values.fecha} className="h-11" />
          </label>
          <label className="space-y-1.5 text-xs font-medium">Disponible desde
            <Input name="desde" type="time" defaultValue={values.desde} className="h-11" />
          </label>
          <label className="space-y-1.5 text-xs font-medium">Disponible hasta
            <Input name="hasta" type="time" defaultValue={values.hasta} className="h-11" />
          </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button type="submit" className="h-11 px-6">
            Aplicar filtros
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
          </div>
          <p className="text-xs text-muted-foreground">Precios por unidad. Horario de Cusco (UTC−5): mostramos ofertas cuyo recojo coincida con el rango elegido.</p>
        </form>
        {errors.length ? <div role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{errors.map(error => <p key={error}>{error}</p>)}</div> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={catalogHref(values, { categoria: "" })}
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
                href={catalogHref(values, { categoria: category.slug })}
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
              ? (hasFilters ? "Sin ofertas con estos filtros" : "Sin ofertas disponibles")
              : `${offers.length} ${offers.length === 1 ? "oferta disponible" : "ofertas disponibles"} · Página ${page}`}
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

        <div className="mt-4" aria-label="Resultados de ofertas">
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
                  ? "Amplía el precio o el horario, cambia la zona o elimina los filtros para ver más opciones."
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
        {page > 1 || hasNext ? <nav aria-label="Páginas del catálogo" className="mt-8 flex justify-center gap-3">
          {page > 1 ? <Link href={catalogHref(values, { pagina: String(page-1) })} className={buttonVariants({variant:"outline"})}>Anterior</Link> : null}
          {hasNext ? <Link href={catalogHref(values, { pagina: String(page+1) })} className={buttonVariants({variant:"outline"})}>Siguiente</Link> : null}
        </nav> : null}
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
