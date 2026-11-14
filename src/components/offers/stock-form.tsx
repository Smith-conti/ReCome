"use client";

import { useActionState } from "react";
import { Loader2, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/auth/fields";
import { initialOfferState } from "@/lib/offers/action-state";
import { setOfferStockAction } from "@/lib/offers/actions";

type StockFormProps = {
  offerId: string;
  availableQuantity: number;
  initialQuantity: number;
  disabled?: boolean;
};

export function StockForm({
  offerId,
  availableQuantity,
  initialQuantity,
  disabled = false,
}: StockFormProps) {
  const [state, formAction, pending] = useActionState(
    setOfferStockAction,
    initialOfferState,
  );

  return (
    <div className="space-y-3">
      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}
      {state.status === "success" && state.message ? (
        <FormAlert tone="success">{state.message}</FormAlert>
      ) : null}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="offerId" value={offerId} />
        <div className="space-y-1.5">
          <Label htmlFor="availableQuantity">Unidades disponibles</Label>
          <Input
            id="availableQuantity"
            name="availableQuantity"
            type="number"
            min={0}
            max={initialQuantity}
            step={1}
            inputMode="numeric"
            defaultValue={availableQuantity}
            disabled={disabled}
            className="h-10"
            required
          />
          {state.fieldErrors?.availableQuantity ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.availableQuantity}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Entre 0 y {initialQuantity} unidades. Al llegar a 0 la oferta se
              marca como agotada.
            </p>
          )}
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={pending || disabled}
          className="h-9 px-4"
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <PackageCheck aria-hidden="true" />
          )}
          Actualizar stock
        </Button>
      </form>
    </div>
  );
}
