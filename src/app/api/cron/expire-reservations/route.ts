import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Vencimiento automático de reservas.
 *
 * Vercel Cron llama a esta ruta cada 15 minutos y añade la cabecera
 * `Authorization: Bearer <CRON_SECRET>` cuando la variable existe en el
 * proyecto. La función SQL `expire_reservations` solo está concedida a
 * `service_role`, por eso aquí se usa la clave secreta y nunca la del
 * navegador.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("[cron] Falta CRON_SECRET.");
    return NextResponse.json(
      { error: "El cron no está configurado." },
      { status: 500 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    console.error("[cron] Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
    return NextResponse.json(
      { error: "La base de datos no está configurada." },
      { status: 500 },
    );
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.rpc("expire_reservations");

  if (error) {
    console.error("[cron] No se pudieron vencer las reservas:", error.message);
    return NextResponse.json(
      { error: "No se pudieron vencer las reservas." },
      { status: 500 },
    );
  }

  return NextResponse.json({ expired: typeof data === "number" ? data : 0 });
}
