"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { logoutAction } from "@/lib/auth/actions";
import { ROLE_LABEL, type UserRole } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

export type HeaderUser = {
  fullName: string;
  role: UserRole;
  dashboard: string;
};

const navLinks = [
  { href: "/ofertas", label: "Ofertas" },
  { href: "/establecimientos", label: "Establecimientos" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#comercios", label: "Para comercios" },
];

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "R";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "Mi cuenta";
}

export function SiteHeaderActions({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 items-center justify-end gap-3">
      <nav
        aria-label="Navegación principal"
        className="hidden items-center gap-1 md:flex"
      >
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground",
              pathname === link.href
                ? "bg-secondary text-foreground"
                : "text-muted-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="hidden items-center gap-2 md:flex">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={buttonVariants({
                variant: "secondary",
                className: "h-9 gap-2 px-2.5",
              })}
            >
              <span className="grid size-6 place-items-center rounded-full bg-primary text-[0.65rem] font-semibold text-primary-foreground">
                {initials(user.fullName)}
              </span>
              <span className="max-w-28 truncate">{firstName(user.fullName)}</span>
              <ChevronDown
                className="size-3.5 opacity-60"
                aria-hidden="true"
              />
              <span className="sr-only">Abrir menú de cuenta</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <span className="block truncate text-sm font-medium text-foreground">
                  {user.fullName}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {ROLE_LABEL[user.role]}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href={user.dashboard} />}>
                <LayoutDashboard aria-hidden="true" />
                Mi panel
              </DropdownMenuItem>
              {user.role === "CLIENT" ? (
                <DropdownMenuItem render={<Link href="/cliente/perfil" />}>
                  <UserRound aria-hidden="true" />
                  Mi perfil
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <form action={logoutAction}>
                <DropdownMenuItem
                  variant="destructive"
                  render={<button type="submit" className="w-full" />}
                >
                  <LogOut aria-hidden="true" />
                  Cerrar sesión
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Link
              href="/login"
              className={buttonVariants({
                variant: "ghost",
                className: "h-9 px-3",
              })}
            >
              Ingresar
            </Link>
            <Link
              href="/registro"
              className={buttonVariants({ className: "h-9 px-4" })}
            >
              Crear cuenta
            </Link>
          </>
        )}
      </div>

      <div className="md:hidden">
        <Sheet>
          <SheetTrigger
            className={buttonVariants({
              variant: "outline",
              size: "icon",
              className: "size-9",
            })}
          >
            <Menu aria-hidden="true" />
            <span className="sr-only">Abrir menú</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-xs">
            <SheetHeader>
              <SheetTitle>Menú</SheetTitle>
            </SheetHeader>
            <nav
              aria-label="Navegación móvil"
              className="flex flex-col gap-1 px-3"
            >
              {navLinks.map((link) => (
                <SheetClose
                  key={link.href}
                  render={
                    <Link
                      href={link.href}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    />
                  }
                >
                  {link.label}
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
              {user ? (
                <>
                  <div className="mb-1">
                    <p className="truncate text-sm font-medium">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABEL[user.role]}
                    </p>
                  </div>
                  <SheetClose
                    render={
                      <Link
                        href={user.dashboard}
                        className={buttonVariants({ variant: "outline" })}
                      />
                    }
                  >
                    Mi panel
                  </SheetClose>
                  {user.role === "CLIENT" ? (
                    <SheetClose
                      render={
                        <Link
                          href="/cliente/perfil"
                          className={buttonVariants({ variant: "outline" })}
                        />
                      }
                    >
                      Mi perfil
                    </SheetClose>
                  ) : null}
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive",
                      )}
                    >
                      <LogOut aria-hidden="true" />
                      Cerrar sesión
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <SheetClose
                    render={
                      <Link
                        href="/login"
                        className={buttonVariants({ variant: "outline" })}
                      />
                    }
                  >
                    Ingresar
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link href="/registro" className={buttonVariants()} />
                    }
                  >
                    Crear cuenta
                  </SheetClose>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
