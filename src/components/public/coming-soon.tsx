import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

type ComingSoonProps = {
  icon: LucideIcon;
  badge: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

/**
 * Estado vacío honesto para las secciones que se habilitan en fases
 * posteriores (catálogo, directorio y acceso). No simula datos.
 */
export function ComingSoon({
  icon: Icon,
  badge,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref = "/",
  secondaryLabel = "Volver al inicio",
}: ComingSoonProps) {
  return (
    <section className="container-page py-16 sm:py-24">
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
          <Icon className="size-7" aria-hidden="true" />
        </span>
        <Badge variant="secondary" className="mt-6 h-7 px-3">
          {badge}
        </Badge>
        <h1 className="mt-4 text-3xl sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href={primaryHref}
            className={buttonVariants({ className: "h-10 px-5" })}
          >
            {primaryLabel}
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link
            href={secondaryHref}
            className={buttonVariants({
              variant: "outline",
              className: "h-10 px-5",
            })}
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
