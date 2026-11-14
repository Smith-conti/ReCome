import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { MapPin, Search, Store, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABEL,
  isBusinessType,
} from "@/lib/business/types";
import { listPublicBusinesses } from "@/lib/offers/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Establecimientos",
  description:
    "Directorio de panaderías, cafeterías, restaurantes y otros comercios de Cusco que ofrecen excedentes de alimentos.",
};

type PageProps = {
  searchParams: Promise<{ q?: string | string[]; tipo?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function BusinessesPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<DirectorySkeleton />}>
      <BusinessesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function BusinessesContent({ searchParams }: PageProps) {
  // El directorio cuenta ofertas activas según la hora actual.
  await connection();

  const params = await searchParams;
  const search = firstParam(params.q).slice(0, 80);
  const type = firstParam(params.tipo);
  const validType = isBusinessType(type) ? type : "";
  const hasFilters = Boolean(search || validType);

  const businesses = await listPublicBusinesses({
    search,
    type: validType || undefined,
  });

  return (
    <section className="section-space">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="eyebrow">Directorio</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">
            Comercios que salvan comida en Cusco
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Panaderías, cafeterías, restaurantes y más establecimientos
            verificados que publican excedentes de alimentos.
          </p>
        </div>

        <form
          action="/establecimientos"
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
              placeholder="Buscar por nombre del establecimiento"
              aria-label="Buscar establecimientos por nombre"
              maxLength={80}
              className="h-11 pl-9"
            />
          </div>

          <select
            name="tipo"
            defaultValue={validType}
            aria-label="Filtrar por tipo de comercio"
            className="h-11 rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-52"
          >
            <option value="">Todos los tipos</option>
            {BUSINESS_TYPES.map((businessType) => (
              <option key={businessType} value={businessType}>
                {BUSINESS_TYPE_LABEL[businessType]}
              </option>
            ))}
          </select>

          <Button type="submit" className="h-11 px-6">
            Buscar
          </Button>

          {hasFilters ? (
            <Link
              href="/establecimientos"
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

        <p className="mt-8 text-sm text-muted-foreground">
          {businesses.length === 0
            ? "Sin establecimientos"
            : `${businesses.length} ${businesses.length === 1 ? "establecimiento" : "establecimientos"}`}
          {search ? (
            <>
              {" "}
              para <span className="font-medium text-foreground">“{search}”</span>
            </>
          ) : null}
        </p>

        <div className="mt-4">
          {businesses.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {businesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/establecimientos/${business.slug}`}
                  className="group flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-primary">
                    {business.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={business.logo_url}
                        alt={`Logo de ${business.name}`}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <Store className="size-7" aria-hidden="true" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg leading-snug transition-colors group-hover:text-primary">
                        {business.name}
                      </h2>
                      <Badge variant="outline">
                        {BUSINESS_TYPE_LABEL[business.type]}
                      </Badge>
                    </div>

                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                      {[business.district, business.city]
                        .filter(Boolean)
                        .join(", ")}
                    </p>

                    {business.description ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {business.description}
                      </p>
                    ) : null}

                    <p
                      className={cn(
                        "mt-3 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        business.activeOffers > 0
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {business.activeOffers > 0
                        ? `${business.activeOffers} ${business.activeOffers === 1 ? "oferta activa" : "ofertas activas"}`
                        : "Sin ofertas activas"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card/70 px-6 py-14 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                <Store className="size-6" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-xl">
                {hasFilters
                  ? "No encontramos establecimientos con esos filtros"
                  : "Todavía no hay establecimientos aprobados"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {hasFilters
                  ? "Prueba con otro tipo de comercio o revisa la ortografía de tu búsqueda."
                  : "Cuando un administrador apruebe a los primeros comercios, aparecerán en este directorio."}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                {hasFilters ? (
                  <Link
                    href="/establecimientos"
                    className={buttonVariants({ className: "h-10 px-5" })}
                  >
                    Ver todos
                  </Link>
                ) : null}
                <Link
                  href="/ofertas"
                  className={buttonVariants({
                    variant: hasFilters ? "outline" : "default",
                    className: "h-10 px-5",
                  })}
                >
                  Explorar ofertas
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DirectorySkeleton() {
  return (
    <section className="section-space">
      <div className="container-page space-y-8">
        <div className="space-y-4">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-11 w-full max-w-xl animate-pulse rounded bg-muted" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
        </div>
        <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
