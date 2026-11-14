import { createClient } from "@/lib/supabase/server";
import {
  isReservationStatus,
  RESERVATION_EVENT_LABEL,
  type Reservation,
  type ReservationBusinessSummary,
  type ReservationCustomerSummary,
  type ReservationDetail,
  type ReservationEvent,
  type ReservationEventType,
  type ReservationOfferSummary,
  type ReservationStatus,
} from "./types";

const RESERVATION_BASE_COLUMNS = `
  id, offer_id, business_id, customer_id, quantity, unit_price, total_price,
  status, pickup_code, failed_attempts, expires_at, created_at, updated_at
`;

const RESERVATION_RELATIONS = `${RESERVATION_BASE_COLUMNS},
  offers ( id, title, slug, image_url, pickup_start, pickup_end ),
  businesses ( id, name, slug, address, district, phone )`;

const RESERVATION_WITH_CUSTOMER_COLUMNS = `${RESERVATION_RELATIONS},
  profiles ( full_name, email, phone )`;

type RawOfferSummary = {
  id: string;
  title: string;
  slug: string;
  image_url: string | null;
  pickup_start: string;
  pickup_end: string;
};

type RawBusinessSummary = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  district: string | null;
  phone: string | null;
};

type RawCustomerSummary = {
  full_name: string;
  email: string;
  phone: string | null;
};

type RawEvent = {
  id: string;
  event: string;
  description: string | null;
  created_at: string;
  actor_id: string | null;
};

type RawReservation = {
  id: string;
  offer_id: string;
  business_id: string;
  customer_id: string;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
  status: string;
  pickup_code: string;
  failed_attempts: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
  offers?: RawOfferSummary | RawOfferSummary[] | null;
  businesses?: RawBusinessSummary | RawBusinessSummary[] | null;
  profiles?: RawCustomerSummary | RawCustomerSummary[] | null;
  reservation_events?: RawEvent[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function toEventType(value: string): ReservationEventType | null {
  return value in RESERVATION_EVENT_LABEL
    ? (value as ReservationEventType)
    : null;
}

function mapOfferSummary(
  value: RawOfferSummary | null,
): ReservationOfferSummary | null {
  if (!value) return null;

  return {
    id: value.id,
    title: value.title,
    slug: value.slug,
    imageUrl: value.image_url,
    pickupStart: value.pickup_start,
    pickupEnd: value.pickup_end,
  };
}

function mapBusinessSummary(
  value: RawBusinessSummary | null,
): ReservationBusinessSummary | null {
  if (!value) return null;

  return {
    id: value.id,
    name: value.name,
    slug: value.slug,
    address: value.address,
    district: value.district,
    phone: value.phone,
  };
}

function mapCustomerSummary(
  value: RawCustomerSummary | null,
): ReservationCustomerSummary | null {
  if (!value) return null;

  return {
    fullName: value.full_name,
    email: value.email,
    phone: value.phone,
  };
}

function mapReservation(row: RawReservation): Reservation {
  return {
    id: row.id,
    offerId: row.offer_id,
    businessId: row.business_id,
    customerId: row.customer_id,
    quantity: row.quantity,
    unitPrice: toNumber(row.unit_price),
    totalPrice: toNumber(row.total_price),
    status: isReservationStatus(row.status) ? row.status : "PENDING",
    pickupCode: row.pickup_code,
    failedAttempts: row.failed_attempts,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    offer: mapOfferSummary(firstRelation(row.offers)),
    business: mapBusinessSummary(firstRelation(row.businesses)),
    customer: mapCustomerSummary(firstRelation(row.profiles)),
  };
}

function mapEvent(row: RawEvent): ReservationEvent | null {
  const event = toEventType(row.event);
  if (!event) return null;

  return {
    id: row.id,
    event,
    description: row.description,
    createdAt: row.created_at,
    actorId: row.actor_id,
  };
}

function emptyStatusCounts(): Record<ReservationStatus, number> {
  return {
    PENDING: 0,
    CONFIRMED: 0,
    DELIVERED: 0,
    CANCELLED: 0,
    EXPIRED: 0,
  };
}

function countByStatus(rows: { status: string }[]): Record<
  ReservationStatus,
  number
> {
  const counts = emptyStatusCounts();

  for (const row of rows) {
    if (isReservationStatus(row.status)) {
      counts[row.status] += 1;
    }
  }

  return counts;
}

/* -------------------------------------------------------------------------- */
/* Cliente                                                                    */
/* -------------------------------------------------------------------------- */

export type CustomerReservationFilters = {
  status?: ReservationStatus;
  limit?: number;
};

export async function listReservationsForCustomer(
  filters: CustomerReservationFilters = {},
): Promise<Reservation[]> {
  const supabase = await createClient();
  let request = supabase
    .from("reservations")
    .select(RESERVATION_RELATIONS)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.status) {
    request = request.eq("status", filters.status);
  }

  const { data } = await request;
  return ((data ?? []) as unknown as RawReservation[]).map(mapReservation);
}

/** Próximas reservas activas para el resumen del panel. */
export async function listUpcomingReservationsForCustomer(
  limit = 3,
): Promise<Reservation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select(RESERVATION_RELATIONS)
    .in("status", ["PENDING", "CONFIRMED"])
    .order("expires_at", { ascending: true })
    .limit(limit);

  return ((data ?? []) as unknown as RawReservation[]).map(mapReservation);
}

export async function countReservationsForCustomer(): Promise<
  Record<ReservationStatus, number>
> {
  const supabase = await createClient();
  const { data } = await supabase.from("reservations").select("status");

  return countByStatus((data ?? []) as { status: string }[]);
}

export async function getReservationForCustomer(
  id: string,
  customerId: string,
): Promise<ReservationDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select(
      `${RESERVATION_RELATIONS},
       reservation_events ( id, event, description, created_at, actor_id )`,
    )
    .eq("id", id)
    .eq("customer_id", customerId)
    .maybeSingle<RawReservation>();

  if (!data) return null;

  const events = (data.reservation_events ?? [])
    .map(mapEvent)
    .filter((event): event is ReservationEvent => event !== null)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  return { ...mapReservation(data), events };
}

/* -------------------------------------------------------------------------- */
/* Comercio                                                                   */
/* -------------------------------------------------------------------------- */

export type BusinessReservationFilters = {
  status?: ReservationStatus;
  limit?: number;
};

export async function listReservationsForBusiness(
  businessId: string,
  filters: BusinessReservationFilters = {},
): Promise<Reservation[]> {
  const supabase = await createClient();
  let request = supabase
    .from("reservations")
    .select(RESERVATION_WITH_CUSTOMER_COLUMNS)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.status) {
    request = request.eq("status", filters.status);
  }

  const { data } = await request;
  return ((data ?? []) as unknown as RawReservation[]).map(mapReservation);
}

/**
 * Reservas que todavía pueden recogerse. Se usa en la pantalla de entregas:
 * las pendientes deben confirmarse primero y las confirmadas ya se pueden
 * entregar con el código.
 */
export async function listPickupQueue(
  businessId: string,
): Promise<Reservation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select(RESERVATION_WITH_CUSTOMER_COLUMNS)
    .eq("business_id", businessId)
    .in("status", ["PENDING", "CONFIRMED"])
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true })
    .limit(50);

  return ((data ?? []) as unknown as RawReservation[]).map(mapReservation);
}

export async function countReservationsForBusiness(
  businessId: string,
): Promise<Record<ReservationStatus, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select("status")
    .eq("business_id", businessId);

  return countByStatus((data ?? []) as { status: string }[]);
}

/* -------------------------------------------------------------------------- */
/* Administración (solo lectura)                                              */
/* -------------------------------------------------------------------------- */

export type AdminReservationFilters = {
  status?: ReservationStatus;
  limit?: number;
};

export async function listReservationsForAdmin(
  filters: AdminReservationFilters = {},
): Promise<Reservation[]> {
  const supabase = await createClient();
  let request = supabase
    .from("reservations")
    .select(RESERVATION_WITH_CUSTOMER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.status) {
    request = request.eq("status", filters.status);
  }

  const { data } = await request;
  return ((data ?? []) as unknown as RawReservation[]).map(mapReservation);
}

export async function countReservationsForAdmin(): Promise<
  Record<ReservationStatus, number>
> {
  const supabase = await createClient();
  const { data } = await supabase.from("reservations").select("status");

  return countByStatus((data ?? []) as { status: string }[]);
}
