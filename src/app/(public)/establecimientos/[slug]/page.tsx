import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowLeft,
  Clock3,
  MapPin,
  Phone,
  ShoppingBag,
  Store,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  OfferCard,
  OfferGridSkeleton,
} from "@/components/offers/offer-card";
import {
  BUSINESS_TYPE_LABEL,
  formatOpeningHours,
  parseOpeningHours,
} from "@/lib/business/types";
import { getPublicBusiness } from "@/lib/offers/queries";

type PageProps = {
  params: Promise<{ slug: string }>;
};

// La ficha del comercio se resuelve en cada petición para reflejar sus ofertas
// activas y el estado de aprobación.
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const { business } = await getPublicBusiness(slug);

  if (!business) {
    return { title: "Establecimiento no disponible" };
  }

  return {
    title: business.name,
    description:
      business.description ??
      `Ofertas de excedentes de alimentos de ${business.name} en ${business.city}.`,
  };
}

export default function BusinessDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<BusinessDetailSkeleton />}>
      <BusinessDetailContent params={params} />
    </Suspense>
  );
}

async function BusinessDetailContent({ params }: PageProps) {
  const { slug } = await params;
  const { business, offers } = await getPublicBusiness(slug);

  if (!business) notFound();

  const hours = parseOpeningHours(business.opening_hours);
  const mapQuery = [business.address, business.district, business.city]
    .filter(Boolean)
    .join(", ");
  const mapUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null;

  return (
    <section className="container-page py-10 sm:py-14">
      <Link
        href="/establecimientos"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "-ml-2 mb-6 gap-1.5 text-muted-foreground",
        })}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver al directorio
      </Link>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary text-primary">
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo_url}
                alt={`Logo de ${business.name}`}
                className="size-full object-cover"
              />
            ) : (
              <Store className="size-9" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {BUSINESS_TYPE_LABEL[business.type]}
              </Badge>
              <Badge variant={offers.length > 0 ? "default" : "secondary"}>
                {offers.length > 0
                  ? `${offers.length} ${offers.length === 1 ? "oferta activa" : "ofertas activas"}`
                  : "Sin ofertas activas"}
              </Badge>
            </div>

            <h1 className="mt-3 text-3xl sm:text-4xl">{business.name}</h1>

            {business.description ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {business.description}
              </p>
            ) : null}

            <div className="mt-5 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <p className="flex items-start gap-2">
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>
                  {business.address ?? "Dirección no registrada"}
                  {business.district ? `, ${business.district}` : ""}
                  {business.city ? `, ${business.city}` : ""}
                </span>
              </p>

              <p className="flex items-start gap-2">
                <Clock3
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>{formatOpeningHours(hours)}</span>
              </p>

              {business.phone ? (
                <p className="flex items-center gap-2 sm:col-span-2">
                  <Phone
                    className="size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <a
                    href={`tel:${business.phone}`}
                    className="hover:text-primary hover:underline"
                  >
                    {business.phone}
                  </a>
                </p>
              ) : null}
            </div>

            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant: "outline",
                  className: "mt-5 h-9 px-4",
                })}
              >
                Ver ubicación
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Ofertas activas</p>
          <h2 className="mt-2 text-2xl sm:text-3xl">
            Excedentes disponibles hoy
          </h2>
        </div>
        <Link
          href="/ofertas"
          className="text-sm text-primary hover:underline"
        >
          Ver todo el catálogo
        </Link>
      </div>

      <div className="mt-5">
        {offers.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-card/70 px-6 py-12 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
              <ShoppingBag className="size-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-xl">
              Este establecimiento no tiene ofertas activas
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Puede que sus ofertas estén pausadas, agotadas o fuera del
              horario de recojo. Vuelve más tarde o explora otros comercios.
            </p>
            <Link
              href="/ofertas"
              className={buttonVariants({ className: "mt-6 h-10 px-5" })}
            >
              Explorar ofertas
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function BusinessDetailSkeleton() {
  return (
    <section className="container-page space-y-8 py-10 sm:py-14">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded-3xl bg-muted" />
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      <OfferGridSkeleton count={3} />
    </section>
  );
}
