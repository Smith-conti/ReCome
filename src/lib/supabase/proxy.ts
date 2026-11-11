import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { dashboardForRole, isUserRole } from "@/lib/auth/roles";
import { isAuthPage, isProtectedPath } from "@/lib/auth/routes";
import { getSupabaseEnv } from "./env";

/**
 * Refresca el token de Supabase en cada petición, propaga las cookies
 * actualizadas y aplica la primera barrera de protección de rutas:
 *
 * - sin sesión, el área privada redirige a /login con el destino original;
 * - con sesión, /login y /registro redirigen al panel del rol.
 *
 * La validación del rol y de la propiedad de los recursos se hace además en
 * el servidor (layouts, Server Actions y RLS).
 *
 * Si las variables de entorno no están configuradas, la aplicación sigue
 * funcionando en modo público (sin sesión).
 */
export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();

  if (!env) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Valida el token y lo renueva si hace falta. No uses getSession() en el
  // servidor: getClaims() verifica la firma del JWT.
  const { data } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;
  const authenticated = typeof subject === "string" && subject.length > 0;
  const { pathname, search } = request.nextUrl;

  if (!authenticated && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);

    return carryCookies(NextResponse.redirect(url), response);
  }

  if (authenticated && isAuthPage(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", subject)
      .maybeSingle<{ role: string }>();

    const role =
      profile && isUserRole(profile.role) ? profile.role : "CLIENT";

    const url = request.nextUrl.clone();
    url.pathname = dashboardForRole(role);
    url.search = "";

    return carryCookies(NextResponse.redirect(url), response);
  }

  return response;
}

/** Conserva las cookies renovadas al emitir una redirección. */
function carryCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach(({ name, value, ...options }) => {
    target.cookies.set(name, value, options);
  });

  return target;
}
