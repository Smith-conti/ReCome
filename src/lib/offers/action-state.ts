export type OfferActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  offerId?: string;
};

export const initialOfferState: OfferActionState = { status: "idle" };
