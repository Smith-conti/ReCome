import { z } from "zod";

const quantityField = z
  .string()
  .trim()
  .min(1, "Indica cuántas unidades quieres reservar.")
  .refine((value) => /^\d{1,2}$/.test(value), "Usa un número entero.")
  .transform((value) => Number(value))
  .refine(
    (value) => value >= 1 && value <= 10,
    "Puedes reservar entre 1 y 10 unidades.",
  );

export const reservationSchema = z.object({
  offerId: z.uuid("La oferta indicada no es válida."),
  quantity: quantityField,
});

const pickupCodeField = z
  .string()
  .trim()
  .min(1, "Escribe el código de recojo.")
  .transform((value) => value.toUpperCase())
  .refine(
    (value) => /^[A-HJ-NP-Z2-79]{6}$/.test(value),
    "El código tiene 6 caracteres (letras y números, sin O, I ni 0/1).",
  );

export const pickupCodeSchema = z.object({
  code: pickupCodeField,
});

export const reservationIdSchema = z.object({
  reservationId: z.uuid("La reserva indicada no es válida."),
});
