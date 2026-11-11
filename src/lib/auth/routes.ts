/**
 * Rutas del área privada por rol. Se usan en el proxy y en los guards de
 * servidor; la lista es intencionalmente corta para no duplicar el mapa de
 * rutas de docs/rutas.md.
 */
export const PROTECTED_PREFIXES = ["/cliente", "/negocio", "/admin"] as const;

export const AUTH_PAGES = ["/login", "/registro", "/recuperar"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`),
  );
}

/**
 * Solo acepta destinos internos. Evita redirecciones abiertas al estilo
 * `?next=https://otro-sitio`.
 */
export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  return value;
}
