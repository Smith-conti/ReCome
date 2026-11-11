"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2, MailCheck, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { initialAuthState } from "@/lib/auth/action-state";
import { requestPasswordResetAction } from "@/lib/auth/actions";
import { FormAlert, TextField } from "./fields";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    initialAuthState,
  );
  const errors = state.fieldErrors ?? {};

  if (state.status === "success" && state.message) {
    return (
      <div className="space-y-4">
        <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <MailCheck className="size-6" aria-hidden="true" />
        </span>
        <FormAlert tone="success">{state.message}</FormAlert>
        <Link
          href="/login"
          className={buttonVariants({ variant: "outline", className: "h-10 w-full" })}
        >
          Volver a ingresar
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
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
        hint="Te enviaremos un enlace válido por tiempo limitado."
      />

      <Button type="submit" className="h-10 w-full" disabled={isPending}>
        {isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Send aria-hidden="true" />
        )}
        {isPending ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  );
}
