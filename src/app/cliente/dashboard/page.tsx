import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, ChevronRight, Mail, Phone, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireSessionProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Mi panel",
};

export default async function ClienteDashboardPage() {
  const profile = await requireSessionProfile();
  const firstName = profile.fullName.split(/\s+/)[0] ?? profile.fullName;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Panel del cliente</p>
        <h1 className="mt-2 text-2xl sm:text-3xl">Hola, {firstName}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Desde aquí vas a gestionar tus reservas de excedentes y tus datos de
          contacto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="size-4 text-primary" aria-hidden="true" />
            Tu cuenta
          </CardTitle>
          <CardDescription>
            Estos son los datos asociados a tu sesión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{ROLE_LABEL[profile.role]}</Badge>
            <span className="text-sm text-muted-foreground">
              Cuenta verificada con Supabase Auth
            </span>
          </div>

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Nombre</dt>
              <UserRound
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <dd className="truncate">{profile.fullName}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Correo</dt>
              <Mail
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <dd className="truncate">{profile.email}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Teléfono</dt>
              <Phone
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <dd className="truncate">
                {profile.phone ?? "Sin teléfono registrado"}
              </dd>
            </div>
          </dl>

          <Link
            href="/cliente/perfil"
            className={buttonVariants({
              variant: "outline",
              className: "mt-2 h-9 w-fit",
            })}
          >
            Editar mis datos
            <ChevronRight aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="size-4 text-primary" aria-hidden="true" />
            Mis reservas
          </CardTitle>
          <CardDescription>
            Aquí verás los excedentes que reserves y su código de recojo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm font-medium">Todavía no tienes reservas</p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              El catálogo de ofertas se habilitará muy pronto. Cuando reserves
              un excedente, aparecerá aquí con su estado y su código de recojo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
