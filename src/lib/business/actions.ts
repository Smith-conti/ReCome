"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { businessSchema } from "@/lib/validations/business";
import { fieldErrors, readForm } from "@/lib/validations/errors";
import type { BusinessActionState } from "./action-state";

function revalidateBusinessPaths(): void {
  revalidatePath("/negocio/dashboard");
  revalidatePath("/negocio/perfil");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/negocios");
}

/**
 * Crea o actualiza el establecimiento del comercio autenticado.
 *
 * La propiedad se resuelve siempre con la sesión del servidor: el formulario
 * nunca envía `owner_id` ni el estado de aprobación. Si el establecimiento
 * estaba rechazado, guardar los cambios lo devuelve a revisión.
 */
export async function saveBusinessAction(
  _previous: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  const profile = await getSessionProfile();

  if (!profile) {
    return { status: "error", message: "Tu sesión expiró. Vuelve a ingresar." };
  }

  if (profile.role !== "BUSINESS") {
    return {
      status: "error",
      message: "Solo las cuentas de comercio pueden registrar establecimientos.",
    };
  }

  let openingHours: unknown;
  try {
    const raw = readForm(formData, "openingHours");
    openingHours = raw ? JSON.parse(raw) : [];
  } catch {
    return {
      status: "error",
      message: "Revisa los horarios de atención.",
      fieldErrors: { openingHours: "Revisa los horarios de atención." },
    };
  }

  const parsed = businessSchema.safeParse({
    name: readForm(formData, "name"),
    type: readForm(formData, "type"),
    description: readForm(formData, "description"),
    address: readForm(formData, "address"),
    district: readForm(formData, "district"),
    city: readForm(formData, "city"),
    phone: readForm(formData, "phone"),
    email: readForm(formData, "email"),
    openingHours,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const {
    name,
    type,
    description,
    address,
    district,
    city,
    phone,
    email,
    openingHours: hours,
  } = parsed.data;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("businesses")
    .select("id, approval_status")
    .eq("owner_id", profile.id)
    .maybeSingle<{ id: string; approval_status: string }>();

  const payload = {
    name,
    type,
    description,
    address,
    district,
    city,
    phone,
    email,
    opening_hours: hours,
  };

  if (!existing) {
    const { error } = await supabase
      .from("businesses")
      .insert({ ...payload, owner_id: profile.id });

    if (error) {
      return {
        status: "error",
        message:
          "No pudimos registrar el establecimiento. Revisa los datos e inténtalo de nuevo.",
      };
    }

    revalidateBusinessPaths();

    return {
      status: "success",
      message:
        "Registramos tu establecimiento. Quedó en revisión; te avisaremos cuando un administrador lo apruebe.",
    };
  }

  const { error } = await supabase
    .from("businesses")
    .update(payload)
    .eq("id", existing.id)
    .eq("owner_id", profile.id);

  if (error) {
    return {
      status: "error",
      message: "No pudimos guardar los cambios. Inténtalo de nuevo.",
    };
  }

  // Un establecimiento rechazado vuelve a revisión al corregir sus datos.
  let resubmitted = false;
  if (existing.approval_status === "REJECTED") {
    const { error: resubmitError } = await supabase.rpc("resubmit_business", {
      p_business_id: existing.id,
    });
    resubmitted = !resubmitError;
  }

  revalidateBusinessPaths();

  return {
    status: "success",
    message: resubmitted
      ? "Guardamos los cambios y tu solicitud volvió a revisión."
      : "Guardamos los datos de tu establecimiento.",
  };
}

const reviewSchema = z.object({
  businessId: z.uuid("El establecimiento no es válido."),
  reason: z.string().trim().max(500, "El motivo no puede superar 500 caracteres."),
});

type ReviewIntent = "approve" | "reject" | "suspend";

/**
 * Cambia el estado de un establecimiento. La autorización real vive en las
 * funciones SQL (`approve_business`, `reject_business`, `suspend_business`),
 * que además escriben en `audit_logs`.
 */
async function reviewBusiness(
  intent: ReviewIntent,
  formData: FormData,
): Promise<BusinessActionState> {
  const profile = await getSessionProfile();

  if (!profile) {
    return { status: "error", message: "Tu sesión expiró. Vuelve a ingresar." };
  }

  if (profile.role !== "ADMIN") {
    return {
      status: "error",
      message: "No tienes permisos para revisar establecimientos.",
    };
  }

  const parsed = reviewSchema.safeParse({
    businessId: readForm(formData, "businessId"),
    reason: readForm(formData, "reason"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos de la acción.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  if (intent !== "approve" && parsed.data.reason.length < 5) {
    return {
      status: "error",
      message: "Explica el motivo (mínimo 5 caracteres).",
      fieldErrors: { reason: "Explica el motivo (mínimo 5 caracteres)." },
    };
  }

  const supabase = await createClient();
  const { error } =
    intent === "approve"
      ? await supabase.rpc("approve_business", {
          p_business_id: parsed.data.businessId,
        })
      : intent === "reject"
        ? await supabase.rpc("reject_business", {
            p_business_id: parsed.data.businessId,
            p_reason: parsed.data.reason,
          })
        : await supabase.rpc("suspend_business", {
            p_business_id: parsed.data.businessId,
            p_reason: parsed.data.reason,
          });

  if (error) {
    // Las funciones SQL lanzan mensajes en español (SQLSTATE P0001).
    return {
      status: "error",
      message:
        error.code === "P0001" && error.message
          ? error.message
          : "No pudimos completar la acción. Inténtalo de nuevo.",
    };
  }

  revalidateBusinessPaths();
  revalidatePath(`/admin/negocios/${parsed.data.businessId}`);

  return {
    status: "success",
    message:
      intent === "approve"
        ? "El establecimiento quedó aprobado."
        : intent === "reject"
          ? "El establecimiento quedó rechazado."
          : "El establecimiento quedó suspendido.",
  };
}

export async function approveBusinessAction(
  _previous: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  return reviewBusiness("approve", formData);
}

export async function rejectBusinessAction(
  _previous: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  return reviewBusiness("reject", formData);
}

export async function suspendBusinessAction(
  _previous: BusinessActionState,
  formData: FormData,
): Promise<BusinessActionState> {
  return reviewBusiness("suspend", formData);
}
