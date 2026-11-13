import { createClient } from "@/lib/supabase/server";
import type { ApprovalStatus, BusinessType } from "./types";

export type BusinessRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  type: BusinessType;
  address: string | null;
  district: string | null;
  city: string;
  phone: string | null;
  email: string | null;
  opening_hours: unknown;
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

const BUSINESS_COLUMNS =
  "id, owner_id, name, slug, description, type, address, district, city, phone, email, opening_hours, approval_status, rejection_reason, approved_at, created_at, updated_at";

/** Establecimiento del usuario autenticado (uno por dueño en el MVP). */
export async function getOwnBusiness(
  ownerId: string,
): Promise<BusinessRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select(BUSINESS_COLUMNS)
    .eq("owner_id", ownerId)
    .maybeSingle<BusinessRow>();

  return data ?? null;
}

export type AdminBusinessListItem = {
  id: string;
  name: string;
  type: BusinessType;
  district: string | null;
  city: string;
  approval_status: ApprovalStatus;
  created_at: string;
};

/** Nombres y estados para las pestañas de filtro del panel admin. */
export async function countBusinessesByStatus(): Promise<
  Record<ApprovalStatus, number>
> {
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("approval_status");

  const counts: Record<ApprovalStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    SUSPENDED: 0,
  };

  for (const row of (data ?? []) as { approval_status: ApprovalStatus }[]) {
    if (row.approval_status in counts) {
      counts[row.approval_status] += 1;
    }
  }

  return counts;
}

/** Quita caracteres que romperían el filtro de PostgREST. */
function sanitizeSearch(value: string): string {
  return value.replace(/[^\p{L}\p{N}\s'-]/gu, "").trim().slice(0, 80);
}

export async function listBusinessesForAdmin(filters: {
  status?: ApprovalStatus;
  search?: string;
}): Promise<AdminBusinessListItem[]> {
  const supabase = await createClient();
  let request = supabase
    .from("businesses")
    .select("id, name, type, district, city, approval_status, created_at")
    .order("created_at", { ascending: false });

  if (filters.status) {
    request = request.eq("approval_status", filters.status);
  }

  const search = sanitizeSearch(filters.search ?? "");
  if (search) {
    request = request.ilike("name", `%${search}%`);
  }

  const { data } = await request;
  return (data ?? []) as AdminBusinessListItem[];
}

export type BusinessOwner = {
  full_name: string;
  email: string;
  phone: string | null;
};

export type AuditEntry = {
  id: string;
  action: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export async function getBusinessForAdmin(id: string): Promise<{
  business: BusinessRow | null;
  owner: BusinessOwner | null;
  offersCount: number;
  audit: AuditEntry[];
}> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select(BUSINESS_COLUMNS)
    .eq("id", id)
    .maybeSingle<BusinessRow>();

  if (!business) {
    return { business: null, owner: null, offersCount: 0, audit: [] };
  }

  const [ownerResult, offersResult, auditResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", business.owner_id)
      .maybeSingle<BusinessOwner>(),
    supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id),
    supabase
      .from("audit_logs")
      .select("id, action, created_at, metadata")
      .eq("entity", "business")
      .eq("entity_id", business.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    business,
    owner: ownerResult.data ?? null,
    offersCount: offersResult.count ?? 0,
    audit: (auditResult.data ?? []) as AuditEntry[],
  };
}
