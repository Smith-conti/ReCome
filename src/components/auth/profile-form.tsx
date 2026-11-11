"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initialAuthState } from "@/lib/auth/action-state";
import { updateProfileAction } from "@/lib/auth/actions";
import { FormAlert, TextField } from "@/components/auth/fields";

export function ProfileForm({
  fullName,
  phone,
}: {
  fullName: string;
  phone: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    initialAuthState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-lg space-y-4" noValidate>
      {state.message ? (
        <FormAlert tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </FormAlert>
      ) : null}

      <TextField
        id="fullName"
        label="Nombre completo"
        autoComplete="name"
        defaultValue={fullName}
        required
        error={errors.fullName}
      />

      <TextField
        id="phone"
        label="Teléfono"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="984 000 000"
        defaultValue={phone ?? ""}
        error={errors.phone}
        hint="Lo usará el comercio para coordinar la entrega si hay algún problema."
      />

      <Button type="submit" className="h-10" disabled={isPending}>
        {isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Save aria-hidden="true" />
        )}
        {isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
