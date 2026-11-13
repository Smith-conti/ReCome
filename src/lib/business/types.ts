export const BUSINESS_TYPES = [
  "BAKERY",
  "PASTRY",
  "CAFE",
  "ICE_CREAM",
  "RESTAURANT",
  "OTHER",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  BAKERY: "Panadería",
  PASTRY: "Pastelería",
  CAFE: "Cafetería",
  ICE_CREAM: "Heladería",
  RESTAURANT: "Restaurante",
  OTHER: "Otro",
};

export const APPROVAL_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  PENDING: "En revisión",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  SUSPENDED: "Suspendido",
};

export const APPROVAL_STATUS_TONE: Record<
  ApprovalStatus,
  "secondary" | "default" | "destructive"
> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
};

/** Días de la semana usados por `businesses.opening_hours`. */
export const DAY_LABEL: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

export type OpeningHour = {
  day: number;
  open: string;
  close: string;
};

export const ADMIN_ACTION_LABEL: Record<string, string> = {
  BUSINESS_APPROVED: "Solicitud aprobada",
  BUSINESS_REJECTED: "Solicitud rechazada",
  BUSINESS_SUSPENDED: "Establecimiento suspendido",
  USER_SUSPENDED: "Usuario suspendido",
  USER_REACTIVATED: "Usuario reactivado",
  OFFER_REMOVED: "Oferta retirada",
};

export function adminActionLabel(value: string): string {
  return ADMIN_ACTION_LABEL[value] ?? "Acción administrativa";
}

export function isBusinessType(value: unknown): value is BusinessType {
  return (
    typeof value === "string" &&
    BUSINESS_TYPES.includes(value as BusinessType)
  );
}

export function businessTypeLabel(value: string): string {
  return isBusinessType(value) ? BUSINESS_TYPE_LABEL[value] : "Otro";
}

export function isApprovalStatus(value: unknown): value is ApprovalStatus {
  return (
    typeof value === "string" &&
    APPROVAL_STATUSES.includes(value as ApprovalStatus)
  );
}

export function approvalStatusLabel(value: string): string {
  return isApprovalStatus(value) ? APPROVAL_STATUS_LABEL[value] : value;
}

export function approvalStatusTone(
  value: string,
): "secondary" | "default" | "destructive" {
  return isApprovalStatus(value) ? APPROVAL_STATUS_TONE[value] : "secondary";
}

/** Normaliza el JSON de horarios que llega de la base. */
export function parseOpeningHours(value: unknown): OpeningHour[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const { day, open, close } = item as Record<string, unknown>;

    if (
      typeof day !== "number" ||
      typeof open !== "string" ||
      typeof close !== "string"
    ) {
      return [];
    }

    return [{ day, open, close }];
  });
}

export function formatOpeningHours(hours: OpeningHour[]): string {
  if (hours.length === 0) return "Sin horario registrado";

  return [...hours]
    .sort((a, b) => a.day - b.day)
    .map((hour) => `${DAY_LABEL[hour.day] ?? "Día"} ${hour.open}–${hour.close}`)
    .join(" · ");
}
