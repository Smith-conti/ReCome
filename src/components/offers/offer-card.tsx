import Link from "next/link";
import { Clock3, MapPin, ShoppingBag, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatTimeRange } from "@/lib/format";
import type { PublicOffer } from "@/lib/offers/queries";
import { cn } from "@/lib/utils";

function discountPercent(offer: PublicOffer): number {
  if (offer.originalPrice <= 0) return 0;
  return Math.max(
    0,
    Math.round((1 - offer.discountedPrice / offer.originalPrice) * 100),
  );
}

export function OfferCard({
  offer,
  className,
}: {
  offer: PublicOffer;
  className?: string;
}) {
  const discount = discountPercent(offer);
  const hasStock = offer.availableQuantity > 0;

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <Link
        href={`/ofertas/${offer.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-secondary"
        aria-label={`Ver ${offer.title}`}
      >
        {offer.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={offer.imageUrl}
            alt={offer.title}
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid size-full place-items-center text-primary/60">
            <ShoppingBag className="size-10" aria-hidden="true" />
          </span>
        )}

        {offer.category ? (
          <Badge className="absolute top-3 left-3" variant="secondary">
            {offer.category.name}
          </Badge>
        ) : null}

        {discount > 0 ? (
          <span className="absolute top-3 right-3 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
            -{discount}%
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 font-heading text-lg leading-snug">
            <Link
              href={`/ofertas/${offer.id}`}
              className="transition-colors hover:text-primary focus-visible:underline focus-visible:outline-none"
            >
              {offer.title}
            </Link>
          </h3>
          {offer.business ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Store className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{offer.business.name}</span>
              {offer.business.district ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{offer.business.district}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="mt-auto space-y-2">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-xl font-semibold text-foreground">
              {formatPrice(offer.discountedPrice)}
            </span>
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(offer.originalPrice)}
            </span>
          </p>

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              Recojo: {formatTimeRange(offer.pickupStart, offer.pickupEnd)}
            </span>
          </p>

          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {offer.business?.address ?? "Consulta el punto de recojo"}
              </span>
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                hasStock
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {hasStock
                ? `${offer.availableQuantity} disponibles`
                : "Agotada"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function OfferCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-6 w-2/5 animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function OfferGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <OfferCardSkeleton key={index} />
      ))}
    </div>
  );
}
