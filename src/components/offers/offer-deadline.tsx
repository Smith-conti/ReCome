import { connection } from "next/server";
export async function OfferDeadline({ expiresAt }: { expiresAt: string | null }) {
  await connection();
  if (!expiresAt) return <p className="text-xs text-muted-foreground">Fecha límite del producto no indicada</p>;
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" }) + "T00:00:00-05:00");
  const deadline = new Date(new Date(expiresAt).toLocaleDateString("en-CA", { timeZone: "America/Lima" }) + "T00:00:00-05:00");
  const days = Math.max(0, Math.round((deadline.getTime()-today.getTime())/86400000));
  return <p className="text-xs font-medium text-primary">{days === 0 ? "Fecha límite: hoy" : days === 1 ? "Fecha límite: mañana · 1 día restante" : `Fecha límite: ${days} días restantes`}</p>;
}
