"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2, LockKeyhole, ShoppingBag } from "lucide-react";
import { FormAlert } from "@/components/auth/fields";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { dashboardForRole, ROLE_LABEL, type UserRole } from "@/lib/auth/roles";
import { formatPrice } from "@/lib/format";
import { initialReservationState } from "@/lib/reservations/action-state";
import { createReservationAction } from "@/lib/reservations/actions";

type ReservationFormProps = {
  offerId: string;
  unitPrice: number;
  availableQuantity: number;
  isAuthenticated: boolean;
  role: UserRole | null;
};

export function ReservationForm({
  offerId,
  unitPrice,
  availableQuantity,
  isAuthenticated,
  role,
}: ReservationFormProps) {
  const [state, formAction, pending] = useActionState(
    createReservationAction,
    initialReservationState,
  );
  const [quantity, setQuantity] = useState(1);

  const maxQuantity = Math.min(Math.max(availableQuantity, 0), 10);

  if (!isAuthenticated) {
    return (
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 font-medium">
          <ShoppingBag className="size-4 text-primary" aria-hidden="true" />
          Reserva tu excedente
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Inicia sesión para reservar. Al reservar se descuenta el stock y
          recibirás un código de recojo para mostrar en el establecimiento.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/login?next=${encodeURIComponent(`/ofertas/${offerId}`)}`}
            className={buttonVariants({ className: "h-10 px-5" })}
          >
            Iniciar sesión para reservar
          </Link>
          <Link
            href="/registro"
            className={buttonVariants({
              variant: "outline",
              className: "h-10 px-5",
            })}
          >
            Crear una cuenta
          </Link>
        </div>
      </div>
    );
  }

  if (role !== "CLIENT") {
    return (
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 font-medium">
          <LockKeyhole className="size-4 text-primary" aria-hidden="true" />
          Reservas para clientes
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Estás usando una cuenta de {role ? ROLE_LABEL[role] : "otro rol"}. Solo
          las cuentas de cliente pueden reservar excedentes; usa una cuenta de
          cliente para completar una reserva.
        </p>
        {role ? (
          <Link
            href={dashboardForRole(role)}
            className={buttonVariants({
              variant: "outline",
              className: "mt-4 h-10 px-5",
            })}
          >
            Ir a mi panel
          </Link>
        ) : null}
      </div>
    );
  }

  if (maxQuantity < 1) {
    return (
      <div className="mt-5 rounded-2xl border border-border bg-secondary/50 p-5 text-sm leading-relaxed">
        <p className="font-medium">Sin stock disponible</p>
        <p className="mt-1 text-muted-foreground">
          Este excedente ya no tiene unidades disponibles. Prueba con otra oferta
          del catálogo.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 font-medium">
        <ShoppingBag className="size-4 text-primary" aria-hidden="true" />
        Reservar este excedente
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        El stock se reserva de inmediato. Recibirás un código de 6 caracteres
        para recoger y pagar en el establecimiento.
      </p>

      {state.status === "error" && state.message ? (
        <div className="mt-3">
          <FormAlert tone="error">{state.message}</FormAlert>
        </div>
      ) : null}

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="offerId" value={offerId} />

        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="quantity">Cantidad</Label>
            <select
              id="quantity"
              name="quantity"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              aria-invalid={state.fieldErrors?.quantity ? true : undefined}
              aria-describedby={
                state.fieldErrors?.quantity ? "quantity-error" : "quantity-hint"
              }
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {Array.from({ length: maxQuantity }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    {value} {value === 1 ? "unidad" : "unidades"}
                  </option>
                ),
              )}
            </select>
            {state.fieldErrors?.quantity ? (
              <p id="quantity-error" className="text-xs text-destructive">
                {state.fieldErrors.quantity}
              </p>
            ) : (
              <p id="quantity-hint" className="text-xs text-muted-foreground">
                Máximo {maxQuantity} por reserva.
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-semibold">
              {formatPrice(unitPrice * quantity)}
            </p>
          </div>
        </div>

        <Button type="submit" disabled={pending} className="h-10 w-full">
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <ShoppingBag aria-hidden="true" />
          )}
          {pending ? "Creando reserva..." : "Reservar y ver mi código"}
        </Button>

        <p className="text-xs leading-relaxed text-muted-foreground">
          No se realizan pagos en línea. Puedes cancelar sin costo antes de que
          empiece el horario de recojo. Mantén como máximo 5 reservas activas.
        </p>
      </form>
    </div>
  );
}
