"use client";

import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/auth/actions";
import { ROLE_LABEL, type UserRole } from "@/lib/auth/roles";

export type AccountMenuUser = {
  fullName: string;
  role: UserRole;
  dashboard: string;
};

export function AccountMenu({
  user,
  email,
}: {
  user: AccountMenuUser;
  email?: string;
}) {
  const parts = user.fullName.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (parts[0]?.slice(0, 2).toUpperCase() ?? "R");
  const profileUrl = user.role === "CLIENT"
    ? "/cliente/perfil"
    : user.role === "BUSINESS" ? "/negocio/perfil" : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Abrir menú de cuenta de ${user.fullName}`}
        className={buttonVariants({
          variant: email ? "ghost" : "secondary",
          className: email
            ? "h-auto w-full justify-start gap-2 px-2 py-2 text-left"
            : "h-9 gap-2 px-2.5",
        })}
      >
        {email ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.fullName}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">{email}</span>
          </span>
        ) : (
          <>
            <span className="grid size-6 place-items-center rounded-full bg-primary text-[0.65rem] font-semibold text-primary-foreground">
              {initials}
            </span>
            <span className="max-w-28 truncate">{parts[0] ?? "Mi cuenta"}</span>
          </>
        )}
        <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={email ? "start" : "end"} className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate text-sm font-medium text-foreground">{user.fullName}</span>
            <span className="block text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={user.dashboard} />}>
          <LayoutDashboard aria-hidden="true" />
          Mi panel
        </DropdownMenuItem>
        {profileUrl ? (
          <DropdownMenuItem render={<Link href={profileUrl} />}>
            <UserRound aria-hidden="true" />
            {user.role === "BUSINESS" ? "Mi establecimiento" : "Mi perfil"}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem
            variant="destructive"
            nativeButton
            render={<button type="submit" className="w-full" />}
          >
            <LogOut aria-hidden="true" />
            Cerrar sesión
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
