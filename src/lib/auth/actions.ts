"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/routes";
import { dashboardForRole, isUserRole } from "@/lib/auth/roles";
import { getSessionProfile } from "@/lib/auth/session";
import type { AuthActionState } from "@/lib/auth/action-state";
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  updatePasswordSchema,
  updateProfileSchema,
} from "@/lib/validations/auth";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) {
      result[key] = issue.message;
    }
  }

  return result;
}

function errorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Correo o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada.";
    case "user_already_exists":
    case "email_exists":
      return "Ese correo ya está registrado. Inicia sesión o recupera tu contraseña.";
    case "weak_password":
      return "La contraseña es demasiado débil. Usa al menos 8 caracteres con letras y números.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Hicimos demasiados intentos seguidos. Espera unos minutos y vuelve a probar.";
    case "same_password":
      return "La nueva contraseña debe ser distinta a la anterior.";
    case "otp_expired":
      return "El enlace expiró o ya se usó. Solicita uno nuevo.";
    case "signup_disabled":
      return "El registro está deshabilitado en este momento.";
    case "email_address_invalid":
      return "Ese correo no es válido para registrarse.";
    default:
      return "No pudimos completar la operación. Inténtalo de nuevo.";
  }
}

function readForm(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// ---------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------
export async function registerAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    fullName: readForm(formData, "fullName"),
    email: readForm(formData, "email"),
    phone: readForm(formData, "phone"),
    role: readForm(formData, "role"),
    password: readForm(formData, "password"),
    confirmPassword: readForm(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const { fullName, email, phone, role, password } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone || null,
        role,
      },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(
        dashboardForRole(role),
      )}`,
    },
  });

  if (error) {
    return { status: "error", message: errorMessage(error) };
  }

  // Con la confirmación de correo activada, Supabase no devuelve sesión.
  if (!data.session) {
    return {
      status: "success",
      message:
        "Te enviamos un correo para confirmar tu cuenta. Abre el enlace y podrás ingresar. Si no lo ves, revisa la carpeta de spam.",
    };
  }

  redirect(dashboardForRole(role));
}

// ---------------------------------------------------------------------------
// Inicio y cierre de sesión
// ---------------------------------------------------------------------------
export async function loginAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: readForm(formData, "email"),
    password: readForm(formData, "password"),
    next: readForm(formData, "next") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: errorMessage(error) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle<{ role: string }>();

  if (!profile || !isUserRole(profile.role)) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message:
        "Tu cuenta no tiene un perfil válido. Contacta al administrador de ReCome.",
    };
  }

  const next = safeInternalPath(parsed.data.next);

  redirect(next ?? dashboardForRole(profile.role));
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------
export async function updateProfileAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const profile = await getSessionProfile();

  if (!profile) {
    return {
      status: "error",
      message: "Tu sesión expiró. Vuelve a ingresar.",
    };
  }

  const parsed = updateProfileSchema.safeParse({
    fullName: readForm(formData, "fullName"),
    phone: readForm(formData, "phone"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
    })
    .eq("id", profile.id);

  if (error) {
    return {
      status: "error",
      message: "No pudimos guardar los cambios. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/", "layout");

  return {
    status: "success",
    message: "Tus datos se actualizaron correctamente.",
  };
}

// ---------------------------------------------------------------------------
// Recuperación de contraseña
// ---------------------------------------------------------------------------
export async function requestPasswordResetAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: readForm(formData, "email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(
        "/restablecer",
      )}`,
    },
  );

  if (error && error.code === "over_email_send_rate_limit") {
    return { status: "error", message: errorMessage(error) };
  }

  // No revelamos si el correo existe o no.
  return {
    status: "success",
    message:
      "Si ese correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.",
  };
}

export async function updatePasswordAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const profile = await getSessionProfile();

  if (!profile) {
    return {
      status: "error",
      message:
        "El enlace expiró o tu sesión ya no es válida. Solicita uno nuevo.",
    };
  }

  const parsed = updatePasswordSchema.safeParse({
    password: readForm(formData, "password"),
    confirmPassword: readForm(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: errorMessage(error) };
  }

  redirect(dashboardForRole(profile.role));
}
