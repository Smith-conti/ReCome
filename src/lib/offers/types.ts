export const OFFER_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "SOLD_OUT",
  "EXPIRED",
  "PAUSED",
] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Publicada",
  SOLD_OUT: "Agotada",
  EXPIRED: "Vencida",
  PAUSED: "Pausada",
};

export type BadgeTone = "default" | "secondary" | "destructive" | "outline";

export const OFFER_STATUS_TONE: Record<OfferStatus, BadgeTone> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  SOLD_OUT: "destructive",
  EXPIRED: "outline",
  PAUSED: "outline",
};

/** La archivación se guarda en `archived_at`, no en `status`. */
export type OfferDisplayStatus = OfferStatus | "ARCHIVED";

export const OFFER_DISPLAY_LABEL: Record<OfferDisplayStatus, string> = {
  ...OFFER_STATUS_LABEL,
  ARCHIVED: "Archivada",
};

export const OFFER_DISPLAY_TONE: Record<OfferDisplayStatus, BadgeTone> = {
  ...OFFER_STATUS_TONE,
  ARCHIVED: "outline",
};

export function isOfferStatus(value: unknown): value is OfferStatus {
  return (
    typeof value === "string" &&
    OFFER_STATUSES.includes(value as OfferStatus)
  );
}

export function offerDisplayStatus(offer: {
  status: OfferStatus;
  archived_at: string | null;
}): OfferDisplayStatus {
  return offer.archived_at ? "ARCHIVED" : offer.status;
}

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

/** Estados que el comercio puede fijar manualmente mediante la RPC. */
export const MANUAL_OFFER_STATUSES = ["DRAFT", "ACTIVE", "PAUSED"] as const;

export type ManualOfferStatus = (typeof MANUAL_OFFER_STATUSES)[number];

export function isManualOfferStatus(
  value: unknown,
): value is ManualOfferStatus {
  return (
    typeof value === "string" &&
    MANUAL_OFFER_STATUSES.includes(value as ManualOfferStatus)
  );
}
