export const RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "DELIVERED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
};

export type BadgeTone = "default" | "secondary" | "destructive" | "outline";

export const RESERVATION_STATUS_TONE: Record<ReservationStatus, BadgeTone> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  DELIVERED: "outline",
  CANCELLED: "destructive",
  EXPIRED: "outline",
};

/** Estados que todavía ocupan stock de la oferta. */
export const ACTIVE_RESERVATION_STATUSES = ["PENDING", "CONFIRMED"] as const;

export function isReservationStatus(
  value: string,
): value is ReservationStatus {
  return (RESERVATION_STATUSES as readonly string[]).includes(value);
}

export function isActiveReservationStatus(
  value: ReservationStatus,
): boolean {
  return value === "PENDING" || value === "CONFIRMED";
}

export const RESERVATION_EVENT_LABEL = {
  CREATED: "Reserva creada",
  CONFIRMED: "Reserva confirmada",
  DELIVERED: "Entrega registrada",
  CANCELLED: "Reserva cancelada",
  EXPIRED: "Reserva vencida",
} as const;

export type ReservationEventType = keyof typeof RESERVATION_EVENT_LABEL;

export type ReservationOfferSummary = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  pickupStart: string;
  pickupEnd: string;
};

export type ReservationBusinessSummary = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  district: string | null;
  phone: string | null;
};

export type ReservationCustomerSummary = {
  fullName: string;
  email: string;
  phone: string | null;
};

export type Reservation = {
  id: string;
  offerId: string;
  businessId: string;
  customerId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: ReservationStatus;
  pickupCode: string;
  failedAttempts: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  offer: ReservationOfferSummary | null;
  business: ReservationBusinessSummary | null;
  customer: ReservationCustomerSummary | null;
};

export type ReservationEvent = {
  id: string;
  event: ReservationEventType;
  description: string | null;
  createdAt: string;
  actorId: string | null;
};

export type ReservationDetail = Reservation & {
  events: ReservationEvent[];
};
