"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, KeyRound, Loader2 } from "lucide-react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop(): void } | null>(null);
  const scanId = useRef(0);
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => () => { scanId.current++; scannerRef.current?.stop(); }, []);

  function stopCamera() {
    scanId.current++;
    scannerRef.current?.stop();
    scannerRef.current = null;
    setScanning(false);
  }

  async function startCamera() {
    const attempt = ++scanId.current;
    setCameraError("");
    setScanning(true);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (attempt !== scanId.current || !videoRef.current) return;
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } }, videoRef.current,
        (result, _error, control) => {
          if (!result || attempt !== scanId.current) return;
          setCode(result.getText());
          control.stop();
          scanId.current++;
          setScanning(false);
        },
      );
      if (attempt !== scanId.current) controls.stop();
      else scannerRef.current = controls;
    } catch {
      if (attempt !== scanId.current) return;
      setCameraError("No pudimos abrir la cámara. Permite el acceso o pega el contenido del QR.");
      setScanning(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 font-medium">
        <KeyRound className="size-4 text-primary" aria-hidden="true" />
        Validar QR de recojo
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Escanea el QR del cliente o pega su contenido. Solo se admite dentro
        del horario de una reserva confirmada y una única vez. La comisión es simulada.
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

      <form action={formAction} className="mt-4 space-y-3">
        <div className="space-y-2">
          <Button type="button" variant="outline" onClick={scanning ? stopCamera : startCamera}>
            <Camera aria-hidden="true" />{scanning ? "Detener cámara" : "Escanear QR con cámara"}
          </Button>
          <video ref={videoRef} muted playsInline className={scanning ? "w-full rounded-xl bg-black" : "hidden"} aria-label="Cámara para leer el QR" />
          {cameraError ? <p role="alert" className="text-sm text-destructive">{cameraError}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code">Contenido del QR</Label>
          <Input
            id="code"
            name="code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={100}
            placeholder="RECOME:…"
            aria-invalid={state.fieldErrors?.code ? true : undefined}
            aria-describedby={
              state.fieldErrors?.code ? "code-error" : "code-hint"
            }
            className="h-12 font-mono text-sm"
          />
          {state.fieldErrors?.code ? (
            <p id="code-error" className="text-xs text-destructive">
              {state.fieldErrors.code}
            </p>
          ) : (
            <p id="code-hint" className="text-xs text-muted-foreground">
              Escanea o pega el contenido completo. Para reservas anteriores se admite el código de seis caracteres.
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
