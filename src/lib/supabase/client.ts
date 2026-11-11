import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnv } from "./env";

/**
 * Cliente de Supabase para componentes de cliente.
 * La clave publicable está diseñada para el navegador; nunca uses aquí la
 * clave secreta del proyecto.
 */
export function createClient() {
  const { url, key } = requireSupabaseEnv();

  return createBrowserClient(url, key);
}
