import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  Store,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BUSINESS_TYPE_LABEL,
  formatOpeningHours,
  parseOpeningHours,
} from "@/lib/business/types";
import {
  formatDateTime,
  formatPrice,
  formatTime,
  formatTimeRange,
} from "@/lib/format";
import { getPublicOffer } from "@/lib/offers/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

// La ficha se resuelve en cada petición: depende del estado de la oferta y de
// la sesión de Supabase, así que no se prerenderiza una cáscara estática.
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const offer = await getPublicOffer(id);

  if (!offer) {
    return { title: "Oferta no disponible" };
  }

  return {
    title: offer.title,
    description:
      offer.description ??
      `${offer.title} con ${Math.round(
        (1 - offer.discountedPrice / offer.originalPrice) * 100,
      )}% de descuento en ${offer.business?.name ?? "un comercio de Cusco"}.`,
    openGraph: offer.imageUrl
      ? { images: [{ url: offer.imageUrl, alt: offer.title }] }
      : undefined,
  };
}

export default function OfferDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<OfferDetailSkeleton />}>
      <OfferDetailContent params={params} />
    </Suspense>
  );
}

async function OfferDetailContent({ params }: PageProps) {
  const { id } = await params;
  const offer = await getPublicOffer(id);

  if (!offer) notFound();

  const business = offer.business;
  const hours = parseOpeningHours(business?.opening_hours);
  const discount = Math.round(
    (1 - offer.discountedPrice / offer.originalPrice) * 100,
  );
  const savings = offer.originalPrice - offer.discountedPrice;

  const mapQuery = [business?.address, business?.district, business?.city]
    .filter(Boolean)
    .join(", ");
  const mapUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null;

  return (
    <section className="container-page py-10 sm:py-14">
      <Link
        href="/ofertas"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "-ml-2 mb-6 gap-1.5 text-muted-foreground",
        })}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver al catálogo
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-border bg-secondary">
            {offer.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={offer.imageUrl}
                alt={offer.title}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[4/3] place-items-center text-primary/60">
                <ShoppingBag className="size-14" aria-hidden="true" />
              </div>
            )}
          </div>

          {offer.description ? (
            <div>
              <h2 className="text-lg">Sobre este excedente</h2>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {offer.description}
              </p>
            </div>
          ) : null}

          {offer.ingredients || offer.allergens || offer.storageInstructions ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {offer.ingredients ? (
                <InfoBlock title="Ingredientes" value={offer.ingredients} />
              ) : null}
              {offer.allergens ? (
                <InfoBlock title="Alérgenos" value={offer.allergens} />
              ) : null}
              {offer.storageInstructions ? (
                <InfoBlock
                  title="Conservación"
                  value={offer.storageInstructions}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {offer.category ? (
              <Badge variant="secondary">{offer.category.name}</Badge>
            ) : null}
            {discount > 0 ? <Badge>-{discount}%</Badge> : null}
            <Badge variant={offer.availableQuantity > 0 ? "outline" : "destructive"}>
              {offer.availableQuantity > 0
                ? `${offer.availableQuantity} disponibles`
                : "Agotada"}
            </Badge>
          </div>

          <h1 className="mt-4 text-3xl leading-tight sm:text-4xl">
            {offer.title}
          </h1>

          {business ? (
            <Link
              href={`/establecimientos/${business.slug}`}
              className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Store className="size-4" aria-hidden="true" />
              {business.name}
              {business.district ? (
                <span aria-hidden="true">· {business.district}</span>
              ) : null}
            </Link>
          ) : null}

          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <p className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-semibold">
                {formatPrice(offer.discountedPrice)}
              </span>
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(offer.originalPrice)}
              </span>
            </p>
            <p className="mt-1 text-sm text-primary">
              Ahorras {formatPrice(savings)} por unidad
            </p>

            <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
              <div className="flex items-start gap-2.5">
                <Clock3
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <dt className="font-medium">Horario de recojo</dt>
                  <dd className="text-muted-foreground">
                    {formatTimeRange(offer.pickupStart, offer.pickupEnd)}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Package
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <dt className="font-medium">Stock disponible</dt>
                  <dd className="text-muted-foreground">
                    {offer.availableQuantity} de {offer.initialQuantity}{" "}
                    unidades
                  </dd>
                </div>
              </div>

              {offer.expirationAt ? (
                <div className="flex items-start gap-2.5">
                  <CalendarClock
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="font-medium">Consumir antes de</dt>
                    <dd className="text-muted-foreground">
                      {formatDateTime(offer.expirationAt)}
                    </dd>
                  </div>
                </div>
              ) : null}

              {business?.address ? (
                <div className="flex items-start gap-2.5">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="font-medium">Punto de recojo</dt>
                    <dd className="text-muted-foreground">
                      {business.address}
                      {business.district ? `, ${business.district}` : ""}
                    </dd>
                  </div>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-secondary/50 p-5 text-sm leading-relaxed">
            <p className="font-medium">Reservas en línea</p>
            <p className="mt-1 text-muted-foreground">
              Estamos habilitando las reservas dentro de la aplicación. Por
              ahora puedes revisar los datos del establecimiento y acercarte
              dentro del horario de recojo.
            </p>
            {business ? (
              <Link
                href={`/establecimientos/${business.slug}`}
                className={buttonVariants({
                  variant: "outline",
                  className: "mt-4 h-10 px-4",
                })}
              >
                Ver establecimiento
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {business ? (
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Datos del establecimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium">{business.name}</p>
              <p className="text-muted-foreground">
                {BUSINESS_TYPE_LABEL[business.type]}
                {business.district ? ` · ${business.district}` : ""}
              </p>
              {business.description ? (
                <p className="leading-relaxed text-muted-foreground">
                  {business.description}
                </p>
              ) : null}
              <p className="flex items-start gap-2 text-muted-foreground">
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
              {business.phone ? (
                <p className="flex items-center gap-2 text-muted-foreground">
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
              <p className="text-muted-foreground">
                {formatOpeningHours(hours)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cómo llegar y recoger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Acércate al establecimiento dentro de la ventana de recojo.
                Menciona el nombre de la oferta y la cantidad reservada.
              </p>
              <p>
                Revisa el estado del producto al recibirlo. Si tienes alguna
                alergia o restricción alimentaria, consulta antes con el
                comercio.
              </p>
              <p className="flex items-center gap-2">
                <Clock3 className="size-4 shrink-0 text-primary" aria-hidden="true" />
                Recojo hasta las {formatTime(offer.pickupEnd)}
              </p>
              {mapUrl ? (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-primary hover:underline"
                >
                  Abrir ubicación en Google Maps
                </a>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
        {value}
      </p>
    </div>
  );
}

function OfferDetailSkeleton() {
  return (
    <section className="container-page space-y-6 py-10 sm:py-14">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-[4/3] animate-pulse rounded-3xl bg-muted" />
        <div className="space-y-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-12 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    </section>
  );
}
