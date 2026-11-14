/**
 * ReCome · Cliente mínimo para los scripts de seed
 *
 * Lee las credenciales de `.env.local` (o del entorno) y expone `api()`,
 * un envoltorio de `fetch` contra la API REST y la API de administración de
 * Supabase usando la clave secreta (salta RLS).
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY      (no la compartas)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

function loadEnv(file) {
  const out = {};
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, "").trim();
      if (value) out[match[1]] = value;
    }
  } catch {
    // Sin archivo: se usan las variables del entorno.
  }
  return out;
}

export const env = { ...loadEnv(resolve(root, ".env.local")), ...process.env };
export const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
export const SECRET = env.SUPABASE_SECRET_KEY;
export const PUBLISHABLE_KEY =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const headers = {
  apikey: SECRET,
  Authorization: `Bearer ${SECRET}`,
  "Content-Type": "application/json",
};

export function requireCredentials() {
  if (!URL_BASE || !SECRET) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local.",
    );
    process.exit(1);
  }
}

export async function api(path, options = {}) {
  const response = await fetch(`${URL_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const detail =
      body?.message ?? body?.error_description ?? body?.error ?? text;
    throw new Error(
      `${options.method ?? "GET"} ${path} → ${response.status}: ${detail}`,
    );
  }

  return body;
}

export const encode = (value) => encodeURIComponent(value);

/**
 * Inicia sesión como un usuario de prueba y devuelve su access token.
 * Se usa para ejecutar las RPC de reservas con la identidad real del usuario
 * (las funciones leen `auth.uid()` y validan el rol).
 */
export async function signIn(email, password) {
  if (!PUBLISHABLE_KEY) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.",
    );
  }

  const response = await fetch(
    `${URL_BASE}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  );

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok || !body?.access_token) {
    const detail =
      body?.error_description ?? body?.msg ?? body?.error ?? response.status;
    throw new Error(`No se pudo iniciar sesión como ${email}: ${detail}`);
  }

  return body.access_token;
}

/** Ejecuta una RPC con el token de un usuario (respeta RLS y roles). */
export async function rpcAs(name, args, token) {
  if (!PUBLISHABLE_KEY) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.",
    );
  }

  const response = await fetch(`${URL_BASE}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args ?? {}),
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const detail =
      body?.message ?? body?.error_description ?? body?.error ?? text;
    throw new Error(`RPC ${name} → ${response.status}: ${detail}`);
  }

  return body;
}

