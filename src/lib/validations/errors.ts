import type { z } from "zod";

/** Convierte los errores de Zod en un mapa por campo para los formularios. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) {
      result[key] = issue.message;
    }
  }

  return result;
}

/** Lee un campo de texto de un `FormData` sin lanzar si no existe. */
export function readForm(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
