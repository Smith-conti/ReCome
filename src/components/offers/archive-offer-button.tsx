"use client";

import { useActionState } from "react";
import { Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/auth/fields";
import { initialOfferState } from "@/lib/offers/action-state";
import { archiveOfferAction } from "@/lib/offers/actions";

type ArchiveOfferButtonProps = {
  offerId: string;
  archived: boolean;
};

export function ArchiveOfferButton({
  offerId,
  archived,
}: ArchiveOfferButtonProps) {
  const [state, formAction, pending] = useActionState(
    archiveOfferAction,
    initialOfferState,
  );

  if (archived) {
    return (
      <p className="text-sm text-muted-foreground">
        La oferta ya está archivada.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}
      {state.status === "success" && state.message ? (
        <FormAlert tone="success">{state.message}</FormAlert>
      ) : null}

      <form
        action={formAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              "¿Archivar esta oferta? Dejará de mostrarse en el catálogo y no podrá publicarse de nuevo.",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="offerId" value={offerId} />
        <Button
          type="submit"
          variant="destructive"
          disabled={pending}
          className="h-9 px-4"
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Archive aria-hidden="true" />
          )}
          Archivar oferta
        </Button>
      </form>
    </div>
  );
}
