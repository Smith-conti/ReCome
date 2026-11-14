"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ReservationActionState } from "./action-state";

export async function updateCommissionAction(
  _previous: ReservationActionState, formData: FormData,
): Promise<ReservationActionState> {
  await requireRole("ADMIN");
  const parsed = z.string().regex(/^\d{1,3}([.,]\d{1,2})?$/)
    .transform(v => Number(v.replace(",", ".")))
    .refine(v => v >= 0 && v <= 100).safeParse(formData.get("percentage"));
  if (!parsed.success) return { status: "error", message: "Indica un porcentaje entre 0 y 100, con hasta dos decimales." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_commission_rate", { p_rate: parsed.data / 100 });
  if (error) return { status: "error", message: "No pudimos guardar la comisión." };
  revalidatePath("/admin/configuracion");
  return { status: "success", message: "Comisión actualizada para las reservas nuevas. Las existentes conservan su tasa." };
}
