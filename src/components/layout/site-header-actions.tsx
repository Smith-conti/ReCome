"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AccountMenu, type AccountMenuUser } from "@/components/auth/account-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { logoutAction } from "@/lib/auth/actions";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

export type HeaderUser = AccountMenuUser;

const navLinks = [
  { href: "/ofertas", label: "Ofertas" },
  { href: "/establecimientos", label: "Establecimientos" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#comercios", label: "Para comercios" },
];

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
          <AccountMenu user={user} />
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
