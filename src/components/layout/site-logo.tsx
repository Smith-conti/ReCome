import Link from "next/link";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

type SiteLogoProps = {
  className?: string;
  invert?: boolean;
};

export function SiteLogo({ className, invert = false }: SiteLogoProps) {
  return (
    <Link
      href="/"
      aria-label="ReCome, ir a la página de inicio"
      className={cn("inline-flex items-center gap-2.5 rounded-md", className)}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl",
          invert
            ? "bg-primary-foreground text-primary"
            : "bg-primary text-primary-foreground",
        )}
      >
        <Leaf className="size-5" aria-hidden="true" />
      </span>
      <span
        className={cn(
          "font-heading text-xl font-semibold tracking-tight",
          invert ? "text-primary-foreground" : "text-foreground",
        )}
      >
        ReCome
      </span>
    </Link>
  );
}
