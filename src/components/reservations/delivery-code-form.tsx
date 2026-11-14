"use client";

import { useActionState, useEffect, useRef } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { FormAlert } from "@/components/auth/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialReservationState } from "@/lib/reservations/action-state";
import { deliverReservationAction } from "@/lib/reservations/actions";

export function DeliveryCodeForm() {
  const [state, formAction, pending] = useActionState(
    deliverReservationAction,
    initialReservationState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 font-medium">
        <KeyRound className="size-4 text-primary" aria-hidden="true" />
        Validar código de recojo
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Pídele el código de 6 caracteres al cliente. Al validarlo, la reserva
        queda entregada y ya no se puede volver a usar.
      </p>

      {state.status === "error" && state.message ? (
        <div className="mt-3">
          <FormAlert tone="error">{state.message}</FormAlert>
        </div>
      ) : null}
      {state.status === "success" && state.message ? (
        <div className="mt-3">
          <FormAlert tone="success">{state.message}</FormAlert>
        </div>
      ) : null}

      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="code">Código de recojo</Label>
          <Input
            id="code"
            name="code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={6}
            placeholder="ABC234"
            aria-invalid={state.fieldErrors?.code ? true : undefined}
            aria-describedby={
              state.fieldErrors?.code ? "code-error" : "code-hint"
            }
            className="h-12 text-center font-mono text-lg tracking-[0.35em] uppercase"
          />
          {state.fieldErrors?.code ? (
            <p id="code-error" className="text-xs text-destructive">
              {state.fieldErrors.code}
            </p>
          ) : (
            <p id="code-hint" className="text-xs text-muted-foreground">
              Solo letras y números. No distingue mayúsculas de minúsculas.
            </p>
          )}
        </div>

        <Button type="submit" disabled={pending} className="h-10 w-full">
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <KeyRound aria-hidden="true" />
          )}
          {pending ? "Validando..." : "Validar y registrar entrega"}
        </Button>
      </form>
    </div>
  );
}
