import { z } from "zod";

const quantityField = z
  .string()
  .trim()
  .min(1, "Indica cuántas unidades quieres reservar.")
  .refine((value) => /^\d{1,2}$/.test(value), "Usa un número entero.")
  .transform((value) => Number(value))
  .refine(
    (value) => value >= 1 && value <= 5,
    "Puedes reservar entre 1 y 5 unidades.",
  );

export const reservationSchema = z.object({
  offerId: z.uuid("La oferta indicada no es válida."),
  quantity: quantityField,
});

const pickupCodeField = z
  .string()
  .trim()
  .min(1, "Escribe el código de recojo.")
  .refine(
    (value) => /^RECOME:[0-9a-f-]{36}:[0-9a-f-]{36}$/i.test(value) || /^[A-HJ-NP-Z2-79]{6}$/i.test(value),
    "Escanea o pega un QR de ReCome válido. El código de seis caracteres solo sirve para reservas anteriores.",
  );

export const pickupCodeSchema = z.object({
  code: pickupCodeField,
});

export const reservationIdSchema = z.object({
  reservationId: z.uuid("La reserva indicada no es válida."),
});
