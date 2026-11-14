"use client";

import { useActionState } from "react";
import { Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/auth/fields";
import { initialOfferState } from "@/lib/offers/action-state";
import { setOfferStatusAction } from "@/lib/offers/actions";
import type { OfferStatus } from "@/lib/offers/types";

type OfferStatusActionsProps = {
  offerId: string;
  status: OfferStatus;
  archived: boolean;
  businessApproved: boolean;
};

const STATUS_BUTTONS: Record<string, { label: string; icon: typeof Play }> = {
  publish: { label: "Publicar", icon: Play },
  pause: { label: "Pausar", icon: Pause },
  draft: { label: "Volver a borrador", icon: RotateCcw },
};

export function OfferStatusActions({
  offerId,
  status,
  archived,
  businessApproved,
}: OfferStatusActionsProps) {
  const [state, formAction, pending] = useActionState(
    setOfferStatusAction,
    initialOfferState,
  );

  if (archived) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta oferta está archivada. Su historial se conserva, pero ya no puede
        publicarse.
      </p>
    );
  }

  const canPublish = status === "DRAFT" || status === "PAUSED";
  const canPause = status === "ACTIVE" || status === "SOLD_OUT";

  return (
    <div className="space-y-3">
      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}
      {state.status === "success" && state.message ? (
        <FormAlert tone="success">{state.message}</FormAlert>
      ) : null}

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="offerId" value={offerId} />

        {canPublish ? (
          <Button
            type="submit"
            name="status"
            value="ACTIVE"
            disabled={pending || !businessApproved}
            className="h-9 px-4"
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Play aria-hidden="true" />
            )}
            {STATUS_BUTTONS.publish.label}
          </Button>
        ) : null}

        {canPause ? (
          <Button
            type="submit"
            name="status"
            value="PAUSED"
            variant="outline"
            disabled={pending}
            className="h-9 px-4"
          >
            <Pause aria-hidden="true" />
            {STATUS_BUTTONS.pause.label}
          </Button>
        ) : null}

        {status !== "DRAFT" ? (
          <Button
            type="submit"
            name="status"
            value="DRAFT"
            variant="ghost"
            disabled={pending}
            className="h-9 px-4"
          >
            <RotateCcw aria-hidden="true" />
            {STATUS_BUTTONS.draft.label}
          </Button>
        ) : null}
      </form>

      {!businessApproved && canPublish ? (
        <p className="text-xs text-muted-foreground">
          Podrás publicar cuando un administrador apruebe tu comercio.
        </p>
      ) : null}
    </div>
  );
}
