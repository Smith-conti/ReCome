"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { getOwnBusiness } from "@/lib/business/queries";
import { createClient } from "@/lib/supabase/server";
import { offerSchema } from "@/lib/validations/offer";
import { fieldErrors, readForm } from "@/lib/validations/errors";
import type { OfferActionState } from "./action-state";
import { MANUAL_OFFER_STATUSES, type ManualOfferStatus } from "./types";

function revalidateOfferPaths(offerId?: string): void {
  revalidatePath("/");
  revalidatePath("/ofertas");
  revalidatePath("/ofertas/[id]", "page");
  revalidatePath("/establecimientos");
  revalidatePath("/establecimientos/[slug]", "page");
  revalidatePath("/negocio/dashboard");
  revalidatePath("/negocio/ofertas");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/ofertas");

  if (offerId) {
    revalidatePath(`/negocio/ofertas/${offerId}/editar`);
  }
}

function databaseMessage(error: { code?: string; message?: string }): string {
  if (error.code === "P0001" && error.message) return error.message;
  if (error.code === "23503") {
    return "La categoría seleccionada no existe. Actualiza la página e inténtalo de nuevo.";
  }
  if (error.code === "23514") {
    return "Los datos no cumplen las reglas de la oferta. Revisa precios, cantidades y horarios.";
  }
  return "No pudimos guardar los cambios. Inténtalo de nuevo.";
}

/**
 * Crea o actualiza una oferta del comercio autenticado.
 *
 * El estado, el stock y el archivado nunca se escriben aquí: las columnas están
 * revocadas para el rol `authenticated` y solo cambian mediante las funciones
 * SQL `set_offer_status`, `set_offer_stock` y `archive_offer`.
 */
export async function saveOfferAction(
  _previous: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const profile = await getSessionProfile();

  if (!profile) {
    return { status: "error", message: "Tu sesión expiró. Vuelve a ingresar." };
  }

  if (profile.role !== "BUSINESS") {
    return {
      status: "error",
      message: "Solo las cuentas de comercio pueden administrar ofertas.",
    };
  }

  const business = await getOwnBusiness(profile.id);

  if (!business) {
    return {
      status: "error",
      message:
        "Primero registra tu establecimiento en «Mi establecimiento» y espera la revisión.",
    };
  }

  const parsed = offerSchema.safeParse({
    title: readForm(formData, "title"),
    categoryId: readForm(formData, "categoryId"),
    description: readForm(formData, "description"),
    originalPrice: readForm(formData, "originalPrice"),
    discountedPrice: readForm(formData, "discountedPrice"),
    initialQuantity: readForm(formData, "initialQuantity"),
    imageUrl: readForm(formData, "imageUrl"),
    pickupStart: readForm(formData, "pickupStart"),
    pickupEnd: readForm(formData, "pickupEnd"),
    expirationAt: readForm(formData, "expirationAt"),
    ingredients: readForm(formData, "ingredients"),
    allergens: readForm(formData, "allergens"),
    storageInstructions: readForm(formData, "storageInstructions"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const {
    title,
    categoryId,
    description,
    originalPrice,
    discountedPrice,
    initialQuantity,
    imageUrl,
    pickupStart,
    pickupEnd,
    expirationAt,
    ingredients,
    allergens,
    storageInstructions,
  } = parsed.data;

  const payload = {
    category_id: categoryId,
    title,
    description,
    original_price: originalPrice,
    discounted_price: discountedPrice,
    initial_quantity: initialQuantity,
    image_url: imageUrl,
    pickup_start: pickupStart,
    pickup_end: pickupEnd,
    expiration_at: expirationAt,
    ingredients,
    allergens,
    storage_instructions: storageInstructions,
  };

  const supabase = await createClient();
  const offerId = readForm(formData, "offerId");

  if (!offerId) {
    const { data: created, error } = await supabase
      .from("offers")
      .insert({
        ...payload,
        business_id: business.id,
        slug: "",
        available_quantity: initialQuantity,
        status: "DRAFT",
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error || !created) {
      return {
        status: "error",
        message: error
          ? databaseMessage(error)
          : "No pudimos crear la oferta. Inténtalo de nuevo.",
      };
    }

    revalidateOfferPaths(created.id);
    redirect(`/negocio/ofertas/${created.id}/editar?creada=1`);
  }

  const parsedId = z.uuid().safeParse(offerId);
  if (!parsedId.success) {
    return { status: "error", message: "La oferta indicada no es válida." };
  }

  const { data: updated, error } = await supabase
    .from("offers")
    .update(payload)
    .eq("id", parsedId.data)
    .eq("business_id", business.id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    return { status: "error", message: databaseMessage(error) };
  }

  if (!updated) {
    return {
      status: "error",
      message:
        "No encontramos la oferta o está archivada. Actualiza la página e inténtalo de nuevo.",
    };
  }

  revalidateOfferPaths(parsedId.data);

  return {
    status: "success",
    message: "Guardamos los cambios de la oferta.",
    offerId: parsedId.data,
  };
}

const statusSchema = z.object({
  offerId: z.uuid("La oferta indicada no es válida."),
  status: z.enum(MANUAL_OFFER_STATUSES, {
    error: "El estado indicado no es válido.",
  }),
});

/** Publica, pausa o devuelve a borrador una oferta. */
export async function setOfferStatusAction(
  _previous: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const profile = await getSessionProfile();

  if (!profile) {
    return { status: "error", message: "Tu sesión expiró. Vuelve a ingresar." };
  }

  if (profile.role !== "BUSINESS" && profile.role !== "ADMIN") {
    return {
      status: "error",
      message: "No tienes permisos para cambiar el estado de esta oferta.",
    };
  }

  const parsed = statusSchema.safeParse({
    offerId: readForm(formData, "offerId"),
    status: readForm(formData, "status"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos de la acción.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_offer_status", {
    p_offer_id: parsed.data.offerId,
    p_status: parsed.data.status as ManualOfferStatus,
  });

  if (error) {
    return {
      status: "error",
      message:
        error.code === "P0001" && error.message
          ? error.message
          : "No pudimos cambiar el estado de la oferta.",
    };
  }

  revalidateOfferPaths(parsed.data.offerId);

  const message: Record<ManualOfferStatus, string> = {
    DRAFT: "La oferta volvió a borrador y ya no es visible al público.",
    ACTIVE: "La oferta quedó publicada en el catálogo.",
    PAUSED: "La oferta quedó pausada y no es visible al público.",
  };

  return { status: "success", message: message[parsed.data.status] };
}

const stockSchema = z.object({
  offerId: z.uuid("La oferta indicada no es válida."),
  availableQuantity: z
    .string()
    .trim()
    .refine((value) => /^\d{1,5}$/.test(value), "Usa un número entero.")
    .transform((value) => Number(value))
    .refine((value) => value >= 0, "El stock no puede ser negativo.")
    .refine((value) => value <= 10000, "El máximo es 10 000 unidades."),
});

/** Ajusta el stock disponible mediante la función SQL atómica. */
export async function setOfferStockAction(
  _previous: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const profile = await getSessionProfile();

  if (!profile) {
    return { status: "error", message: "Tu sesión expiró. Vuelve a ingresar." };
  }

  if (profile.role !== "BUSINESS" && profile.role !== "ADMIN") {
    return {
      status: "error",
      message: "No tienes permisos para cambiar el stock de esta oferta.",
    };
  }

  const parsed = stockSchema.safeParse({
    offerId: readForm(formData, "offerId"),
    availableQuantity: readForm(formData, "availableQuantity"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa la cantidad disponible.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_offer_stock", {
    p_offer_id: parsed.data.offerId,
    p_available_quantity: parsed.data.availableQuantity,
  });

  if (error) {
    return {
      status: "error",
      message:
        error.code === "P0001" && error.message
          ? error.message
          : "No pudimos actualizar el stock de la oferta.",
    };
  }

  revalidateOfferPaths(parsed.data.offerId);

  return { status: "success", message: "Actualizamos el stock disponible." };
}

const archiveSchema = z.object({
  offerId: z.uuid("La oferta indicada no es válida."),
});

/** Archiva una oferta. La función SQL la deja pausada y fuera del catálogo. */
export async function archiveOfferAction(
  _previous: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const profile = await getSessionProfile();

  if (!profile) {
    return { status: "error", message: "Tu sesión expiró. Vuelve a ingresar." };
  }

  if (profile.role !== "BUSINESS" && profile.role !== "ADMIN") {
    return {
      status: "error",
      message: "No tienes permisos para archivar esta oferta.",
    };
  }

  const parsed = archiveSchema.safeParse({
    offerId: readForm(formData, "offerId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos de la acción.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_offer", {
    p_offer_id: parsed.data.offerId,
  });

  if (error) {
    return {
      status: "error",
      message:
        error.code === "P0001" && error.message
          ? error.message
          : "No pudimos archivar la oferta.",
    };
  }

  revalidateOfferPaths(parsed.data.offerId);

  return {
    status: "success",
    message: "La oferta quedó archivada y fuera del catálogo.",
  };
}
