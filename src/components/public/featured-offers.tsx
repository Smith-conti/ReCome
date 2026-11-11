import Link from "next/link";
import { ArrowRight, ShoppingBag, Store } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/**
 * Sección pública de ofertas destacadas.
 *
 * En la Fase 5 se conectará a Supabase para mostrar las últimas ofertas
 * activas. Mientras no existan ofertas reales se muestra un estado vacío
 * explícito, sin datos de ejemplo.
 */
export function FeaturedOffers() {
  return (
    <section id="destacados" className="section-space">
      <div className="container-page">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">Ofertas destacadas</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">
              Lo que los comercios de Cusco están salvando
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Excedentes de alimentos publicados por establecimientos locales,
              con precio reducido y horario de recojo. Puedes verlos sin crear
              una cuenta.
            </p>
          </div>
          <Link
            href="/ofertas"
            className={buttonVariants({ variant: "link", className: "px-0" })}
          >
            Ver todo el catálogo
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/70 px-6 py-12 text-center sm:px-12">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
            <ShoppingBag className="size-6" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-xl">Aún no hay ofertas publicadas</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Cuando los primeros comercios de Cusco sean aprobados y publiquen
            sus excedentes, aparecerán aquí. Mientras tanto, puedes explorar el
            catálogo o registrar tu negocio.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              href="/ofertas"
              className={buttonVariants({ className: "h-10 px-5" })}
            >
              Explorar catálogo
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link
              href="/registro"
              className={buttonVariants({
                variant: "outline",
                className: "h-10 px-5",
              })}
            >
              <Store aria-hidden="true" />
              Registrar mi negocio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
