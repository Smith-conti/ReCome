import QRCode from "qrcode";

export async function PickupQr({ reservationId, token }: { reservationId: string; token: string }) {
  const payload = `RECOME:${reservationId}:${token}`;
  const image = await QRCode.toDataURL(payload, { width: 280, margin: 4, errorCorrectionLevel: "M" });
  return <div className="space-y-3 text-center">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={image} width={280} height={280} alt="QR de recojo de tu reserva confirmada" className="mx-auto max-w-full rounded-xl bg-white" />
    <p className="text-xs text-muted-foreground">Muéstralo solo en el establecimiento. Es válido una única vez y dentro del horario de recojo.</p>
    <details className="text-left text-xs">
      <summary className="cursor-pointer text-primary">Ver contenido para validación manual</summary>
      <textarea aria-label="Contenido del QR" readOnly value={payload} rows={4} className="mt-2 w-full rounded border border-border bg-background p-2 font-mono" />
    </details>
  </div>;
}
