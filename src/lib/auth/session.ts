import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dashboardForRole, isUserRole, type UserRole } from "./roles";

export type SessionProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar_url: string | null;
};

/**
 * Devuelve el perfil del usuario autenticado o `null` si no hay sesión.
 *
 * Usa `getClaims()`, que verifica la firma del token, y luego lee el perfil
 * con la sesión del usuario (RLS aplica).
 *
 * `use cache: private` es el patrón documentado por Next 16 para leer sesión:
 * mantiene el resultado en el navegador, nunca en el servidor, y permite las
 * APIs de petición (`cookies()`) y los valores dependientes del tiempo como
 * `Date.now()`, que Supabase usa al validar el token. Un `cache()` de React no
 * sirve aquí: puede reutilizar un almacén de cookies de otro contexto.
 *
 * Las páginas y layouts que lo llaman deben estar dentro de un `<Suspense>`.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  "use cache: private";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) return null;

  const subject = data?.claims?.sub;
  if (typeof subject !== "string" || subject.length === 0) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, avatar_url")
    .eq("id", subject)
    .maybeSingle<ProfileRow>();

  if (profileError || !profile) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    role: isUserRole(profile.role) ? profile.role : "CLIENT",
    avatarUrl: profile.avatar_url,
  };
}

/**
 * Variante para componentes que aceptan visitantes sin sesión (por ejemplo la
 * cabecera). Marca la lectura como dinámica sin redirigir.
 */
export async function getRequestProfile(): Promise<SessionProfile | null> {
  await connection();
  return getSessionProfile();
}

/** Exige sesión. Si no hay, redirige al login conservando el destino. */
export async function requireSessionProfile(
  returnTo?: string,
): Promise<SessionProfile> {
  await connection();

  const profile = await getSessionProfile();

  if (!profile) {
    const target = returnTo
      ? `/login?next=${encodeURIComponent(returnTo)}`
      : "/login";
    redirect(target);
  }

  return profile;
}

/**
 * Exige uno o varios roles. Si el rol no coincide, lleva al panel que le
 * corresponde en lugar de mostrar un error genérico.
 */
export async function requireRole(
  allowed: UserRole | UserRole[],
  returnTo?: string,
): Promise<SessionProfile> {
  const profile = await requireSessionProfile(returnTo);
  const list = Array.isArray(allowed) ? allowed : [allowed];

  if (!list.includes(profile.role)) {
    redirect(dashboardForRole(profile.role));
  }

  return profile;
}
