export type BusinessActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialBusinessState: BusinessActionState = { status: "idle" };
