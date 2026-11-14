import { z } from "zod";
import { limaInputToIso } from "@/lib/format";

const priceField = z
  .string()
  .trim()
  .min(1, "Ingresa un precio.")
  .refine(
    (value) => /^\d{1,6}([.,]\d{1,2})?$/.test(value),
    "Usa un monto válido, por ejemplo 12.50.",
  )
  .transform((value) => Number(value.replace(",", ".")))
  .refine((value) => value > 0, "El precio debe ser mayor que cero.")
  .refine((value) => value <= 99999.99, "El precio es demasiado alto.");

const quantityField = z
  .string()
  .trim()
  .min(1, "Indica la cantidad disponible.")
  .refine((value) => /^\d{1,5}$/.test(value), "Usa un número entero.")
  .transform((value) => Number(value))
  .refine((value) => value >= 1, "Debe haber al menos 1 unidad.")
  .refine((value) => value <= 10000, "El máximo es 10 000 unidades.");

const requiredDateTimeField = z
  .string()
  .trim()
  .min(1, "Indica la fecha y hora.")
  .refine(
    (value) => limaInputToIso(value) !== null,
    "Usa una fecha y hora válidas.",
  )
  .transform((value) => limaInputToIso(value) as string);

const optionalDateTimeField = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || limaInputToIso(value) !== null,
    "Usa una fecha y hora válidas.",
  )
  .transform((value) => (value === "" ? null : limaInputToIso(value)));

function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} no puede superar ${max} caracteres.`)
    .transform((value) => (value === "" ? null : value));
}

const optionalImageUrl = z
  .string()
  .trim()
  .max(2048, "La URL de la imagen es demasiado larga.")
  .refine(
    (value) => value === "" || /^https:\/\//i.test(value),
    "La imagen debe ser una URL https válida.",
  )
  .transform((value) => (value === "" ? null : value));

export const offerSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "El título debe tener al menos 3 caracteres.")
      .max(140, "El título no puede superar 140 caracteres."),
    categoryId: z.uuid("Selecciona una categoría válida."),
    description: optionalText(1000, "La descripción"),
    originalPrice: priceField,
    discountedPrice: priceField,
    initialQuantity: quantityField,
    imageUrl: optionalImageUrl,
    pickupStart: requiredDateTimeField,
    pickupEnd: requiredDateTimeField,
    expirationAt: optionalDateTimeField,
    ingredients: optionalText(500, "Los ingredientes"),
    allergens: optionalText(500, "Los alérgenos"),
    storageInstructions: optionalText(500, "Las instrucciones de conservación"),
  })
  .superRefine((data, ctx) => {
    if (data.discountedPrice >= data.originalPrice) {
      ctx.addIssue({
        code: "custom",
        path: ["discountedPrice"],
        message: "El precio con descuento debe ser menor al precio original.",
      });
    }

    if (
      new Date(data.pickupEnd).getTime() <= new Date(data.pickupStart).getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["pickupEnd"],
        message: "El fin del recojo debe ser posterior al inicio.",
      });
    }

    if (
      data.expirationAt &&
      new Date(data.expirationAt).getTime() <
        new Date(data.pickupEnd).getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["expirationAt"],
        message: "El vencimiento no puede ser anterior al fin del recojo.",
      });
    }
  });

export type OfferInput = z.infer<typeof offerSchema>;
