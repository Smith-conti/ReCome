import { z } from "zod";
import { BUSINESS_TYPES } from "@/lib/business/types";

const timeField = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:MM.");

const optionalPhone = z
  .string()
  .trim()
  .max(30, "El teléfono no puede superar 30 caracteres.")
  .refine(
    (value) => value === "" || /^[0-9+()\-\s]{6,30}$/.test(value),
    "Ingresa un teléfono válido (solo números, espacios, +, - y paréntesis).",
  )
  .transform((value) => (value === "" ? null : value));

const optionalEmail = z
  .string()
  .trim()
  .max(254, "El correo es demasiado largo.")
  .transform((value) => value.toLowerCase())
  .refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Ingresa un correo válido.",
  )
  .transform((value) => (value === "" ? null : value));

const optionalDescription = z
  .string()
  .trim()
  .max(1000, "La descripción no puede superar 1000 caracteres.")
  .transform((value) => (value === "" ? null : value));

export const openingHourSchema = z
  .object({
    day: z.coerce
      .number()
      .int("Elige un día válido.")
      .min(1, "Elige un día válido.")
      .max(7, "Elige un día válido."),
    open: timeField,
    close: timeField,
  })
  .refine((value) => value.open < value.close, {
    path: ["close"],
    message: "El cierre debe ser posterior a la apertura.",
  });

export const businessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Escribe el nombre del establecimiento.")
    .max(120, "El nombre no puede superar 120 caracteres."),
  type: z.enum(BUSINESS_TYPES, {
    error: "Elige el rubro del establecimiento.",
  }),
  description: optionalDescription,
  address: z
    .string()
    .trim()
    .min(5, "Escribe la dirección del establecimiento.")
    .max(200, "La dirección no puede superar 200 caracteres."),
  district: z
    .string()
    .trim()
    .min(2, "Escribe el distrito.")
    .max(80, "El distrito no puede superar 80 caracteres."),
  city: z
    .string()
    .trim()
    .min(2, "Escribe la ciudad.")
    .max(80, "La ciudad no puede superar 80 caracteres."),
  phone: optionalPhone,
  email: optionalEmail,
  openingHours: z
    .array(openingHourSchema)
    .min(1, "Registra al menos un día de atención.")
    .max(7, "Registra como máximo un horario por día.")
    .refine(
      (hours) => new Set(hours.map((hour) => hour.day)).size === hours.length,
      "Cada día solo puede aparecer una vez.",
    ),
});

export type BusinessInput = z.infer<typeof businessSchema>;
