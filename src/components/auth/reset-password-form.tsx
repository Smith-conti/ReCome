"use client";

import { useActionState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initialAuthState } from "@/lib/auth/action-state";
import { updatePasswordAction } from "@/lib/auth/actions";
import { FormAlert, PasswordField } from "./fields";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    updatePasswordAction,
    initialAuthState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}

      <PasswordField
        id="password"
        label="Nueva contraseña"
        autoComplete="new-password"
        required
        hint="Mínimo 8 caracteres, con al menos una letra y un número."
        error={errors.password}
      />

      <PasswordField
        id="confirmPassword"
        label="Repite la nueva contraseña"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
      />

      <Button type="submit" className="h-10 w-full" disabled={isPending}>
        {isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <KeyRound aria-hidden="true" />
        )}
        {isPending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
