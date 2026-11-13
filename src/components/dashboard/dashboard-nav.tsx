"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Store, UserRound } from "lucide-react";
import type { UserRole } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

const NAV_BY_ROLE: Record<
  UserRole,
  readonly { href: string; label: string; icon: typeof LayoutDashboard }[]
> = {
  CLIENT: [
    { href: "/cliente/dashboard", label: "Resumen", icon: LayoutDashboard },
    { href: "/cliente/perfil", label: "Mi perfil", icon: UserRound },
  ],
  BUSINESS: [
    { href: "/negocio/dashboard", label: "Resumen", icon: LayoutDashboard },
    { href: "/negocio/perfil", label: "Mi establecimiento", icon: Store },
  ],
  ADMIN: [
    { href: "/admin/dashboard", label: "Resumen", icon: LayoutDashboard },
    { href: "/admin/negocios", label: "Comercios", icon: Building2 },
  ],
};

export function DashboardNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];

  return (
    <nav
      aria-label="Navegación del panel"
      className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:mx-0 lg:flex-col lg:overflow-visible"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
