"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/auth/fields";
import { initialReservationState } from "@/lib/reservations/action-state";
import { updateCommissionAction } from "@/lib/reservations/commission-actions";

export function CommissionForm({ rate }: { rate: number }) {
  const [state, action, pending] = useActionState(updateCommissionAction, initialReservationState);
  return <form action={action} className="max-w-lg space-y-4 rounded-2xl border border-border bg-card p-5">
    <Label htmlFor="percentage">Comisión simulada (%)</Label>
    <Input id="percentage" name="percentage" type="number" min="0" max="100" step="0.01" defaultValue={Number((rate * 100).toFixed(2))} required />
    <p className="text-sm text-muted-foreground">Se calcula sobre el total con descuento únicamente al entregar. No se realizan cobros, transferencias ni liquidaciones reales. Cada reserva conserva la tasa vigente al crearla.</p>
    {state.message ? <FormAlert tone={state.status === "success" ? "success" : "error"}>{state.message}</FormAlert> : null}
    <Button disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar comisión"}</Button>
  </form>;
}
