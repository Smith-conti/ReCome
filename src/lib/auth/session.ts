import { cache } from "react";
import { redirect } from "next/navigation";
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
 * con la sesión del usuario (RLS aplica). Está memorizado por petición para
 * que el layout y la página compartan una sola consulta.
 */
export const getSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
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
  },
);

/** Exige sesión. Si no hay, redirige al login conservando el destino. */
export async function requireSessionProfile(
  returnTo?: string,
): Promise<SessionProfile> {
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
