import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CommissionForm } from "@/components/admin/commission-form";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
export const metadata = { title: "Comisión simulada" };
export default function ConfigurationPage() {
  return <Suspense fallback={<DashboardBodySkeleton />}><Configuration /></Suspense>;
}
async function Configuration() {
  await requireRole("ADMIN");
  const supabase = await createClient();
  const { data, error } = await supabase.from("commission_settings").select("rate").eq("id", true).single<{ rate: number }>();
  if (error || !data) throw new Error("No pudimos consultar la configuración de comisiones.");
  return <div className="space-y-5"><h1 className="text-3xl">Comisión simulada</h1><CommissionForm rate={Number(data.rate)} /></div>;
}
