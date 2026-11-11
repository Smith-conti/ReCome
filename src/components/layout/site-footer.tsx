import Link from "next/link";
import { cacheLife } from "next/cache";
import { SiteLogo } from "@/components/layout/site-logo";

const exploreLinks = [
  { href: "/ofertas", label: "Ofertas" },
  { href: "/#destacados", label: "Ofertas destacadas" },
  { href: "/establecimientos", label: "Establecimientos" },
  { href: "/#como-funciona", label: "Cómo funciona" },
];

const accountLinks = [
  { href: "/login", label: "Ingresar" },
  { href: "/registro", label: "Crear cuenta" },
  { href: "/#comercios", label: "Para comercios" },
];

export async function SiteFooter() {
  "use cache";
  cacheLife("days");

  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-primary text-primary-foreground">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <SiteLogo invert />
          <p className="mt-4 max-w-sm text-sm text-primary-foreground/80">
            ReCome conecta a consumidores con comercios gastronómicos de Cusco
            que tienen excedentes de alimentos. Menos desperdicio, mejores
            precios y más comercio local.
          </p>
          <p className="mt-4 text-sm text-primary-foreground/70">
            Cusco, Perú · Alineado al Objetivo de Desarrollo Sostenible 12.3
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/70">
            Explorar
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {exploreLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-primary-foreground/85 transition-colors hover:text-primary-foreground hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/70">
            Cuenta
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {accountLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-primary-foreground/85 transition-colors hover:text-primary-foreground hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-primary-foreground/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} ReCome. Todos los derechos reservados.</p>
          <p>
            Reservas sin pago en línea: el pago se realiza al recoger el pedido.
          </p>
        </div>
      </div>
    </footer>
  );
}
