"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initialAuthState } from "@/lib/auth/action-state";
import { loginAction } from "@/lib/auth/actions";
import { FormAlert, PasswordField, TextField } from "./fields";

export function LoginForm({ next }: { next?: string | null }) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialAuthState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}

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

      <PasswordField
        id="password"
        label="Contraseña"
        autoComplete="current-password"
        required
        error={errors.password}
      />

      <div className="flex justify-end">
        <Link
          href="/recuperar"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <Button type="submit" className="h-10 w-full" disabled={isPending}>
        {isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <LogIn aria-hidden="true" />
        )}
        {isPending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
