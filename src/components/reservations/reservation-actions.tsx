"use client";

import { useActionState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { FormAlert } from "@/components/auth/fields";
import { Button } from "@/components/ui/button";
import { initialReservationState } from "@/lib/reservations/action-state";
import {
  cancelReservationAction,
  confirmReservationAction,
} from "@/lib/reservations/actions";

type ReservationActionsProps = {
  reservationId: string;
  showConfirm?: boolean;
  showCancel?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  className?: string;
};

export function ReservationActions({
  reservationId,
  showConfirm = false,
  showCancel = false,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  className,
}: ReservationActionsProps) {
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmReservationAction,
    initialReservationState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelReservationAction,
    initialReservationState,
  );

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {showConfirm ? (
          <form action={confirmAction}>
            <input
              type="hidden"
              name="reservationId"
              value={reservationId}
            />
            <Button
              type="submit"
              size="sm"
              disabled={confirmPending}
              className="h-8 px-3"
            >
              {confirmPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Check aria-hidden="true" />
              )}
              {confirmLabel}
            </Button>
          </form>
        ) : null}

        {showCancel ? (
          <form action={cancelAction}>
            <input
              type="hidden"
              name="reservationId"
              value={reservationId}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={cancelPending}
              className="h-8 px-3"
            >
              {cancelPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <X aria-hidden="true" />
              )}
              {cancelLabel}
            </Button>
          </form>
        ) : null}
      </div>

      {confirmState.status === "error" && confirmState.message ? (
        <div className="mt-2">
          <FormAlert tone="error">{confirmState.message}</FormAlert>
        </div>
      ) : null}
      {confirmState.status === "success" && confirmState.message ? (
        <div className="mt-2">
          <FormAlert tone="success">{confirmState.message}</FormAlert>
        </div>
      ) : null}
      {cancelState.status === "error" && cancelState.message ? (
        <div className="mt-2">
          <FormAlert tone="error">{cancelState.message}</FormAlert>
        </div>
      ) : null}
      {cancelState.status === "success" && cancelState.message ? (
        <div className="mt-2">
          <FormAlert tone="success">{cancelState.message}</FormAlert>
        </div>
      ) : null}
    </div>
  );
}
