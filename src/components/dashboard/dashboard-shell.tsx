import Link from "next/link";
import { LogOut } from "lucide-react";
import { SiteLogo } from "@/components/layout/site-logo";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { logoutAction } from "@/lib/auth/actions";
import { ROLE_LABEL } from "@/lib/auth/roles";
import type { SessionProfile } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

/**
 * Estructura común de los paneles privados. El guard de rol se aplica en el
 * layout de cada área antes de renderizar este componente.
 */
export function DashboardShell({
  profile,
  children,
}: {
  profile: SessionProfile;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SiteLogo />
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {ROLE_LABEL[profile.role]}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "hidden sm:inline-flex",
              })}
            >
              Ver sitio
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "gap-1.5",
                )}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="container-page grid flex-1 gap-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:py-10">
        <aside className="lg:border-r lg:border-border lg:pr-6">
          <div className="mb-4 hidden lg:block">
            <p className="truncate text-sm font-medium">{profile.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {profile.email}
            </p>
          </div>
          <DashboardNav role={profile.role} />
        </aside>

        <main id="contenido" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
