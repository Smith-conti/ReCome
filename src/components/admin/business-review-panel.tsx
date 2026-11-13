"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert } from "@/components/auth/fields";
import { initialBusinessState } from "@/lib/business/action-state";
import {
  approveBusinessAction,
  rejectBusinessAction,
  suspendBusinessAction,
} from "@/lib/business/actions";

type BusinessReviewPanelProps = {
  businessId: string;
  status: string;
};

export function BusinessReviewPanel({
  businessId,
  status,
}: BusinessReviewPanelProps) {
  const [approveState, approveAction, approving] = useActionState(
    approveBusinessAction,
    initialBusinessState,
  );
  const [rejectState, rejectAction, rejecting] = useActionState(
    rejectBusinessAction,
    initialBusinessState,
  );
  const [suspendState, suspendAction, suspending] = useActionState(
    suspendBusinessAction,
    initialBusinessState,
  );

  const busy = approving || rejecting || suspending;
  const feedback = [approveState, rejectState, suspendState].find(
    (state) => state.status !== "idle",
  );

  return (
    <div className="space-y-4">
      {feedback?.message ? (
        <FormAlert tone={feedback.status === "error" ? "error" : "success"}>
          {feedback.message}
        </FormAlert>
      ) : null}

      {status !== "APPROVED" ? (
        <form action={approveAction}>
          <input type="hidden" name="businessId" value={businessId} />
          <Button type="submit" className="h-10" disabled={busy}>
            {approving ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 aria-hidden="true" />
            )}
            {status === "SUSPENDED"
              ? "Reactivar establecimiento"
              : "Aprobar establecimiento"}
          </Button>
        </form>
      ) : null}

      {status === "PENDING" || status === "REJECTED" ? (
        <details className="rounded-xl border border-border bg-background px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">
            Rechazar solicitud
          </summary>
          <form action={rejectAction} className="mt-3 space-y-3">
            <input type="hidden" name="businessId" value={businessId} />
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason">Motivo del rechazo</Label>
              <Textarea
                id="reject-reason"
                name="reason"
                rows={3}
                minLength={5}
                maxLength={500}
                required
                placeholder="Explica qué debe corregir el comercio antes de volver a postular."
                aria-invalid={rejectState.fieldErrors?.reason ? true : undefined}
                className="min-h-20 px-2.5 py-2 text-sm"
              />
              {rejectState.fieldErrors?.reason ? (
                <p className="text-xs text-destructive">
                  {rejectState.fieldErrors.reason}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  El comercio verá este motivo en su panel.
                </p>
              )}
            </div>
            <Button
              type="submit"
              variant="destructive"
              className="h-9"
              disabled={busy}
            >
              {rejecting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <XCircle aria-hidden="true" />
              )}
              Rechazar
            </Button>
          </form>
        </details>
      ) : null}

      {status === "APPROVED" ? (
        <details className="rounded-xl border border-border bg-background px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">
            Suspender establecimiento
          </summary>
          <form action={suspendAction} className="mt-3 space-y-3">
            <input type="hidden" name="businessId" value={businessId} />
            <div className="space-y-1.5">
              <Label htmlFor="suspend-reason">Motivo de la suspensión</Label>
              <Textarea
                id="suspend-reason"
                name="reason"
                rows={3}
                minLength={5}
                maxLength={500}
                required
                placeholder="Explica por qué se suspende el establecimiento."
                aria-invalid={
                  suspendState.fieldErrors?.reason ? true : undefined
                }
                className="min-h-20 px-2.5 py-2 text-sm"
              />
              {suspendState.fieldErrors?.reason ? (
                <p className="text-xs text-destructive">
                  {suspendState.fieldErrors.reason}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Mientras esté suspendido no podrá publicar ofertas ni recibir
                  reservas.
                </p>
              )}
            </div>
            <Button
              type="submit"
              variant="destructive"
              className="h-9"
              disabled={busy}
            >
              {suspending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <XCircle aria-hidden="true" />
              )}
              Suspender
            </Button>
          </form>
        </details>
      ) : null}
    </div>
  );
}
