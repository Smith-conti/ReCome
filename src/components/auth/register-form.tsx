"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Loader2, MailCheck, ShoppingBag, Store } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { initialAuthState } from "@/lib/auth/action-state";
import { registerAction } from "@/lib/auth/actions";
import { FormAlert, PasswordField, TextField } from "./fields";

const roleOptions = [
  {
    value: "CLIENT",
    title: "Quiero comprar",
    description: "Reserva excedentes y recógelos en el comercio.",
    icon: ShoppingBag,
  },
  {
    value: "BUSINESS",
    title: "Tengo un comercio",
    description: "Publica lo que no alcanzaste a vender.",
    icon: Store,
  },
] as const;

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerAction,
    initialAuthState,
  );
  const errors = state.fieldErrors ?? {};

  if (state.status === "success" && state.message) {
    return (
      <div className="space-y-4">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <FormAlert tone="success">{state.message}</FormAlert>
        <Link
          href="/login"
          className={buttonVariants({ className: "h-10 w-full" })}
        >
          Ir a ingresar
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Tipo de cuenta</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {roleOptions.map((option) => {
            const Icon = option.icon;

            return (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  defaultChecked={option.value === "CLIENT"}
                  className="peer sr-only"
                />
                <span className="flex h-full flex-col gap-1 rounded-xl border border-border bg-background p-3 transition-colors peer-checked:border-primary peer-checked:bg-secondary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    {option.title}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {errors.role ? (
          <p className="text-xs text-destructive" role="alert">
            {errors.role}
          </p>
        ) : null}
      </fieldset>

      <TextField
        id="fullName"
        label="Nombre completo"
        autoComplete="name"
        placeholder="Nombres y apellidos"
        required
        error={errors.fullName}
      />

      <TextField
        id="email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="tu@correo.com"
        required
        error={errors.email}
      />

      <TextField
        id="phone"
        label="Teléfono (opcional)"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="984 000 000"
        error={errors.phone}
      />

      <PasswordField
        id="password"
        label="Contraseña"
        autoComplete="new-password"
        required
        hint="Mínimo 8 caracteres, con al menos una letra y un número."
        error={errors.password}
      />

      <PasswordField
        id="confirmPassword"
        label="Repite la contraseña"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
      />

      <Button type="submit" className="h-10 w-full" disabled={isPending}>
        {isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : null}
        {isPending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Al crear una cuenta aceptas que ReCome use tus datos para gestionar
        reservas y entregas. No se realizan pagos en línea.
      </p>
    </form>
  );
}
