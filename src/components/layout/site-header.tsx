import { Suspense } from "react";
import { SiteLogo } from "@/components/layout/site-logo";
import {
  SiteHeaderActions,
  type HeaderUser,
} from "@/components/layout/site-header-actions";
import { dashboardForRole } from "@/lib/auth/roles";
import { getRequestProfile } from "@/lib/auth/session";

/**
 * Cabecera del sitio. El estado de sesión se transmite desde el servidor y se
 * muestra en un límite de Suspense para que las páginas públicas sigan siendo
 * estáticas.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <SiteLogo />
        <Suspense fallback={<SiteHeaderActions user={null} />}>
          <HeaderSession />
        </Suspense>
      </div>
    </header>
  );
}

async function HeaderSession() {
  const profile = await getRequestProfile();

  const user: HeaderUser | null = profile
    ? {
        fullName: profile.fullName,
        role: profile.role,
        dashboard: dashboardForRole(profile.role),
      }
    : null;

  return <SiteHeaderActions user={user} />;
}
