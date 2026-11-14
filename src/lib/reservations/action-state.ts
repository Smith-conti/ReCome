export type ReservationActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  reservationId?: string;
};

export const initialReservationState: ReservationActionState = {
  status: "idle",
};
