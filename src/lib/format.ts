const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Lima",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

const timeFormatter = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Lima",
});

const priceFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const limaPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Lima",
});

/** Fecha corta en hora de Perú (UTC-5). */
export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

/** Fecha y hora en hora de Perú (UTC-5). */
export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

/** Hora en formato 24 h en hora de Perú (UTC-5). */
export function formatTime(value: string): string {
  return timeFormatter.format(new Date(value));
}

/** Precio en soles peruanos, por ejemplo `S/ 12.50`. */
export function formatPrice(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "S/ 0.00";
  return priceFormatter.format(amount);
}

/** Rango de recojo legible, por ejemplo `13 nov 2026, 18:00 – 20:00`. */
export function formatTimeRange(start: string, end: string): string {
  return `${formatDateTime(start)} – ${formatTime(end)}`;
}

function limaParts(value: Date): Record<string, string> {
  const parts = limaPartsFormatter.formatToParts(value);
  const result: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }
  }

  if (result.hour === "24") result.hour = "00";
  return result;
}

/**
 * Convierte un valor ISO a un valor válido para `<input type="datetime-local">`
 * interpretado en hora de Perú.
 */
export function toLimaInputValue(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = limaParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * Convierte un valor de `<input type="datetime-local">` (hora de Perú) al ISO
 * con desplazamiento UTC-5 que espera la base de datos.
 */
export function limaInputToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:00-05:00`,
  );

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Ventana de recojo sugerida: mañana de 18:00 a 20:00, hora de Perú. */
export function defaultPickupWindow(): { start: string; end: string } {
  const tomorrow = limaParts(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const day = `${tomorrow.year}-${tomorrow.month}-${tomorrow.day}`;

  return { start: `${day}T18:00`, end: `${day}T20:00` };
}
