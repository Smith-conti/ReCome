"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/auth/fields";
import { formatPrice } from "@/lib/format";
import { initialReservationState } from "@/lib/reservations/action-state";
import { simulatePaymentAction } from "@/lib/reservations/actions";

export function ReservationDeadline({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    const refresh = setInterval(() => router.refresh(), 15000);
    return () => { clearInterval(timer); clearInterval(refresh); };
  }, [expiresAt, router]);
  return <p className="text-sm font-medium text-primary" aria-live="off">
    {seconds === null ? "Consultando plazo…" : seconds === 0 ? "El plazo terminó. Actualizando el estado…" : `Tiempo restante: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
  </p>;
}

export function SimulatedPaymentForm({ reservationId, total, expiresAt }: {
  reservationId: string; total: number; expiresAt: string;
}) {
  const [state, action, pending] = useActionState(simulatePaymentAction, initialReservationState);
  return <section className="space-y-4 rounded-2xl border border-primary/30 bg-secondary/40 p-5">
    <h2 className="text-xl">Completa tu pago simulado</h2>
    <p className="text-sm">Total de prueba: <strong>{formatPrice(total)}</strong>. Tienes 10 minutos desde la reserva. Después, el comercio dispone de 15 minutos para confirmar.</p>
    <ReservationDeadline expiresAt={expiresAt} />
    <p className="text-sm font-medium">Es una simulación: no se cobra dinero ni se solicitan tarjetas, cuentas o billeteras reales.</p>
    {state.message ? <FormAlert tone={state.status === "success" ? "success" : "error"}>{state.message}</FormAlert> : null}
    <form action={action}>
      <input type="hidden" name="reservationId" value={reservationId} />
      <Button type="submit" disabled={pending}>{pending ? "Registrando…" : "Completar pago simulado"}</Button>
    </form>
  </section>;
}
