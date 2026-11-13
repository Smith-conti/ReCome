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

/** Fecha corta en hora de Perú (UTC-5). */
export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

/** Fecha y hora en hora de Perú (UTC-5). */
export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}
