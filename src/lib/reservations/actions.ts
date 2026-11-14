"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, readForm } from "@/lib/validations/errors";
import {
  pickupCodeSchema,
  reservationIdSchema,
  reservationSchema,
} from "@/lib/validations/reservation";
import type { ReservationActionState } from "./action-state";

function revalidateReservationPaths(reservationId?: string): void {
  revalidatePath("/");
  revalidatePath("/ofertas");
  revalidatePath("/ofertas/[id]", "page");
  revalidatePath("/establecimientos/[slug]", "page");
  revalidatePath("/cliente/dashboard");
  revalidatePath("/cliente/reservas");
  revalidatePath("/negocio/dashboard");
  revalidatePath("/negocio/reservas");
  revalidatePath("/negocio/entregas");
  revalidatePath("/admin/reservas");

  if (reservationId) {
    revalidatePath(`/cliente/reservas/${reservationId}`);
  }
}

function databaseMessage(error: { code?: string; message?: string }): string {
  if (error.code === "P0001" && error.message) return error.message;
  return "No pudimos completar la operación. Inténtalo de nuevo.";
}

type DeliverRpcResult = {
  ok?: boolean;
  error?: string;
  already_delivered?: boolean;
  failed_attempts?: number;
  status?: string;
  reservation?: { id?: string };
};

function deliverErrorMessage(result: DeliverRpcResult): string {
  switch (result.error) {
    case "unauthenticated":
      return "Tu sesión expiró. Vuelve a ingresar.";
    case "not_found":
      return "La reserva no existe.";
    case "forbidden":
      return "Esta reserva no pertenece a tu establecimiento.";
    case "invalid_status":
      return result.status === "PENDING"
        ? "La reserva todavía está pendiente. Confírmala antes de entregarla."
        : "Esta reserva ya no se puede entregar.";
    case "locked":
      return "Esta reserva está bloqueada por demasiados intentos. Contacta al administrador.";
    case "invalid_code": {
      const attempts =
        typeof result.failed_attempts === "number" ? result.failed_attempts : 0;
      const remaining = Math.max(0, 5 - attempts);

      return remaining > 0
        ? `El código no coincide. Te quedan ${remaining} ${
            remaining === 1 ? "intento" : "intentos"
          }.`
        : "El código no coincide. La reserva quedó bloqueada; contacta al administrador.";
    }
    default:
      return "No pudimos registrar la entrega. Inténtalo de nuevo.";
  }
}

/** Crea una reserva para el cliente autenticado y abre su detalle. */
export async function createReservationAction(
  _previous: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const profile = await getSessionProfile();

  if (!profile) {
    return { status: "error", message: "Tu sesión expiró. Vuelve a ingresar." };
  }

  if (profile.role !== "CLIENT") {
    return {
      status: "error",
      message: "Solo las cuentas de cliente pueden reservar excedentes.",
    };
  }

  const parsed = reservationSchema.safeParse({
    offerId: readForm(formData, "offerId"),
    quantity: readForm(formData, "quantity"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos de la reserva.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_reservation", {
    p_offer_id: parsed.data.offerId,
    p_quantity: parsed.data.quantity,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error) };
  }

  const reservation = data as { id?: string } | null;

  if (!reservation?.id) {
    return {
      status: "error",
      message: "La reserva se creó, pero no pudimos abrir su detalle.",
    };
  }

  revalidateReservationPaths(reservation.id);
  redirect(`/cliente/reservas/${reservation.id}?creada=1`);
}

/** Cancela una reserva y devuelve el stock. La función SQL valida el rol. */
export async function cancelReservationAction(
  _previous: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const profile = await getSessionProfile();

  if (!profile) {
    return { status: "error", message: "Tu sesión expiró. Vuelve a ingresar." };
  }

  const parsed = reservationIdSchema.safeParse({
    reservationId: readForm(formData, "reservationId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos de la acción.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_reservation", {
    p_reservation_id: parsed.data.reservationId,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error) };
  }

  revalidateReservationPaths(parsed.data.reservationId);

  if (profile.role === "CLIENT") {
    redirect(`/cliente/reservas/${parsed.data.reservationId}?cancelada=1`);
  }

  return {
    status: "success",
    message: "La reserva quedó cancelada y el stock volvió a la oferta.",
    reservationId: parsed.data.reservationId,
  };
}

/** Confirma una reserva pendiente. Solo el comercio dueño o un admin. */
export async function confirmReservationAction(
  _previous: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const profile = await getSessionProfile();

  if (!profile) {
    return { status: "error", message: "Tu sesión expiró. Vuelve a ingresar." };
  }

  if (profile.role !== "BUSINESS" && profile.role !== "ADMIN") {
    return {
      status: "error",
      message: "No tienes permisos para confirmar esta reserva.",
    };
  }

  const parsed = reservationIdSchema.safeParse({
    reservationId: readForm(formData, "reservationId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos de la acción.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_reservation", {
    p_reservation_id: parsed.data.reservationId,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error) };
  }

  revalidateReservationPaths(parsed.data.reservationId);

  return {
    status: "success",
    message: "La reserva quedó confirmada y lista para entregar.",
    reservationId: parsed.data.reservationId,
  };
}

/**
 * Registra una entrega a partir del código de recojo.
 *
 * El comercio escribe el código; la consulta por `pickup_code` respeta RLS, así
 * que solo encuentra reservas de su propio establecimiento. La validación real
 * (estado, bloqueo e intentos) la hace `deliver_reservation`.
 */
export async function deliverReservationAction(
  _previous: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const profile = await getSessionProfile();

  if (!profile) {
    return { status: "error", message: "Tu sesión expiró. Vuelve a ingresar." };
  }

  if (profile.role !== "BUSINESS" && profile.role !== "ADMIN") {
    return {
      status: "error",
      message: "No tienes permisos para registrar entregas.",
    };
  }

  const parsed = pickupCodeSchema.safeParse({
    code: readForm(formData, "code"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: fieldErrors(parsed.error).code ?? "Revisa el código.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("reservations")
    .select("id")
    .eq("pickup_code", parsed.data.code)
    .maybeSingle<{ id: string }>();

  if (!match) {
    return {
      status: "error",
      message:
        "No encontramos una reserva con ese código en tu establecimiento. Revisa que esté bien escrito.",
    };
  }

  const { data, error } = await supabase.rpc("deliver_reservation", {
    p_reservation_id: match.id,
    p_code: parsed.data.code,
  });

  if (error) {
    return { status: "error", message: databaseMessage(error) };
  }

  const result = (data ?? {}) as DeliverRpcResult;

  if (!result.ok) {
    revalidateReservationPaths(match.id);
    return { status: "error", message: deliverErrorMessage(result) };
  }

  revalidateReservationPaths(match.id);

  return {
    status: "success",
    message: result.already_delivered
      ? "Esta reserva ya estaba marcada como entregada."
      : "Entrega registrada. La reserva quedó completada.",
    reservationId: match.id,
  };
}
