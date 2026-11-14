import { createClient } from "@/lib/supabase/server";
import type { BusinessType } from "@/lib/business/types";
import {
  isOfferStatus,
  type Category,
  type OfferDisplayStatus,
  type OfferStatus,
} from "./types";

const OFFER_BASE_COLUMNS = `
  id, business_id, category_id, title, slug, description,
  original_price, discounted_price, initial_quantity, available_quantity,
  image_url, pickup_start, pickup_end, expiration_at, status, archived_at,
  created_at, updated_at
`;

const PUBLIC_OFFER_COLUMNS = `${OFFER_BASE_COLUMNS},
  businesses ( id, name, slug, district, address, city, type, logo_url ),
  categories ( id, name, slug )`;

export type PublicBusinessSummary = {
  id: string;
  name: string;
  slug: string;
  district: string | null;
  address: string | null;
  city: string;
  type: BusinessType;
  logo_url: string | null;
};

export type OfferCategorySummary = {
  id: string;
  name: string;
  slug: string;
};

export type PublicOffer = {
  id: string;
  businessId: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string | null;
  originalPrice: number;
  discountedPrice: number;
  initialQuantity: number;
  availableQuantity: number;
  imageUrl: string | null;
  pickupStart: string;
  pickupEnd: string;
  expirationAt: string | null;
  status: OfferStatus;
  archivedAt: string | null;
  business: PublicBusinessSummary | null;
  category: OfferCategorySummary | null;
};

export type OfferDetail = PublicOffer & {
  ingredients: string | null;
  allergens: string | null;
  storageInstructions: string | null;
  business: (PublicBusinessSummary & {
    description: string | null;
    phone: string | null;
    opening_hours: unknown;
  }) | null;
};

export type BusinessOffer = {
  id: string;
  businessId: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string | null;
  originalPrice: number;
  discountedPrice: number;
  initialQuantity: number;
  availableQuantity: number;
  imageUrl: string | null;
  pickupStart: string;
  pickupEnd: string;
  expirationAt: string | null;
  ingredients: string | null;
  allergens: string | null;
  storageInstructions: string | null;
  status: OfferStatus;
  archivedAt: string | null;
  createdAt: string;
  category: OfferCategorySummary | null;
};

export type AdminOffer = BusinessOffer & {
  business: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type RawBusiness = {
  id: string;
  name: string;
  slug: string;
  district: string | null;
  address: string | null;
  city: string;
  type: BusinessType;
  logo_url: string | null;
  description?: string | null;
  phone?: string | null;
  opening_hours?: unknown;
};

type RawCategory = {
  id: string;
  name: string;
  slug: string;
};

type RawOffer = {
  id: string;
  business_id: string;
  category_id: string;
  title: string;
  slug: string;
  description: string | null;
  original_price: number | string;
  discounted_price: number | string;
  initial_quantity: number;
  available_quantity: number;
  image_url: string | null;
  pickup_start: string;
  pickup_end: string;
  expiration_at: string | null;
  ingredients?: string | null;
  allergens?: string | null;
  storage_instructions?: string | null;
  status: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  businesses?: RawBusiness | RawBusiness[] | null;
  categories?: RawCategory | RawCategory[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function mapOffer(row: RawOffer): PublicOffer {
  const business = firstRelation(row.businesses);
  const category = firstRelation(row.categories);

  return {
    id: row.id,
    businessId: row.business_id,
    categoryId: row.category_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    originalPrice: toNumber(row.original_price),
    discountedPrice: toNumber(row.discounted_price),
    initialQuantity: row.initial_quantity,
    availableQuantity: row.available_quantity,
    imageUrl: row.image_url,
    pickupStart: row.pickup_start,
    pickupEnd: row.pickup_end,
    expirationAt: row.expiration_at,
    status: isOfferStatus(row.status) ? row.status : "DRAFT",
    archivedAt: row.archived_at,
    business: business
      ? {
          id: business.id,
          name: business.name,
          slug: business.slug,
          district: business.district,
          address: business.address,
          city: business.city,
          type: business.type,
          logo_url: business.logo_url,
        }
      : null,
    category: category
      ? { id: category.id, name: category.name, slug: category.slug }
      : null,
  };
}

function mapOfferDetail(row: RawOffer): OfferDetail {
  const base = mapOffer(row);
  const business = firstRelation(row.businesses);

  return {
    ...base,
    ingredients: row.ingredients ?? null,
    allergens: row.allergens ?? null,
    storageInstructions: row.storage_instructions ?? null,
    business: business
      ? {
          id: business.id,
          name: business.name,
          slug: business.slug,
          district: business.district,
          address: business.address,
          city: business.city,
          type: business.type,
          logo_url: business.logo_url,
          description: business.description ?? null,
          phone: business.phone ?? null,
          opening_hours: business.opening_hours ?? [],
        }
      : null,
  };
}

/** Quita caracteres que romperían el filtro de PostgREST. */
function sanitizeSearch(value: string | undefined): string {
  return (value ?? "")
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .trim()
    .slice(0, 80);
}

export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description")
    .eq("is_active", true)
    .order("name");

  return (data ?? []) as Category[];
}

export async function getCategoryIdBySlug(
  slug: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

export type PublicOfferFilters = {
  search?: string;
  categorySlug?: string;
  limit?: number;
};

export async function listPublicOffers(
  filters: PublicOfferFilters = {},
): Promise<PublicOffer[]> {
  const supabase = await createClient();
  let request = supabase
    .from("offers")
    .select(PUBLIC_OFFER_COLUMNS)
    .eq("status", "ACTIVE")
    .is("archived_at", null)
    .gt("pickup_end", new Date().toISOString())
    .order("pickup_end", { ascending: true })
    .limit(filters.limit ?? 60);

  if (filters.categorySlug) {
    const categoryId = await getCategoryIdBySlug(filters.categorySlug);
    if (!categoryId) return [];
    request = request.eq("category_id", categoryId);
  }

  const search = sanitizeSearch(filters.search);
  if (search) {
    request = request.ilike("title", `%${search}%`);
  }

  const { data } = await request;
  return ((data ?? []) as unknown as RawOffer[]).map(mapOffer);
}

export async function listFeaturedOffers(limit = 3): Promise<PublicOffer[]> {
  return listPublicOffers({ limit });
}

export async function getPublicOffer(id: string): Promise<OfferDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("offers")
    .select(
      `${OFFER_BASE_COLUMNS},
       ingredients, allergens, storage_instructions,
       businesses ( id, name, slug, district, address, city, type, logo_url, description, phone, opening_hours ),
       categories ( id, name, slug )`,
    )
    .eq("id", id)
    .eq("status", "ACTIVE")
    .is("archived_at", null)
    .gt("pickup_end", new Date().toISOString())
    .maybeSingle<RawOffer>();

  return data ? mapOfferDetail(data) : null;
}

export async function listOffersForBusiness(
  businessId: string,
): Promise<PublicOffer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offers")
    .select(PUBLIC_OFFER_COLUMNS)
    .eq("business_id", businessId)
    .eq("status", "ACTIVE")
    .is("archived_at", null)
    .gt("pickup_end", new Date().toISOString())
    .order("pickup_end", { ascending: true })
    .limit(30);

  return ((data ?? []) as unknown as RawOffer[]).map(mapOffer);
}

export type PublicBusiness = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: BusinessType;
  address: string | null;
  district: string | null;
  city: string;
  phone: string | null;
  logo_url: string | null;
  opening_hours: unknown;
};

export type BusinessDirectoryItem = PublicBusiness & {
  activeOffers: number;
};

export async function listPublicBusinesses(filters: {
  search?: string;
  type?: string;
}): Promise<BusinessDirectoryItem[]> {
  const supabase = await createClient();
  let request = supabase
    .from("businesses")
    .select(
      "id, name, slug, description, type, address, district, city, phone, logo_url, opening_hours",
    )
    .eq("approval_status", "APPROVED")
    .order("name")
    .limit(100);

  const search = sanitizeSearch(filters.search);
  if (search) {
    request = request.ilike("name", `%${search}%`);
  }

  if (filters.type) {
    request = request.eq("type", filters.type);
  }

  const { data } = await request;
  const businesses = (data ?? []) as PublicBusiness[];

  if (businesses.length === 0) return [];

  const { data: activeOffers } = await supabase
    .from("offers")
    .select("business_id")
    .eq("status", "ACTIVE")
    .is("archived_at", null)
    .gt("pickup_end", new Date().toISOString())
    .in(
      "business_id",
      businesses.map((business) => business.id),
    );

  const counts = new Map<string, number>();
  for (const row of (activeOffers ?? []) as { business_id: string }[]) {
    counts.set(row.business_id, (counts.get(row.business_id) ?? 0) + 1);
  }

  return businesses.map((business) => ({
    ...business,
    activeOffers: counts.get(business.id) ?? 0,
  }));
}

export async function getPublicBusiness(slug: string): Promise<{
  business: PublicBusiness | null;
  offers: PublicOffer[];
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select(
      "id, name, slug, description, type, address, district, city, phone, logo_url, opening_hours",
    )
    .eq("slug", slug)
    .eq("approval_status", "APPROVED")
    .maybeSingle<PublicBusiness>();

  if (!data) return { business: null, offers: [] };

  const offers = await listOffersForBusiness(data.id);
  return { business: data, offers };
}

/* -------------------------------------------------------------------------- */
/* Panel del comercio                                                         */
/* -------------------------------------------------------------------------- */

const BUSINESS_OFFER_COLUMNS = `${OFFER_BASE_COLUMNS},
  ingredients, allergens, storage_instructions,
  categories ( id, name, slug )`;

function mapBusinessOffer(row: RawOffer): BusinessOffer {
  const category = firstRelation(row.categories);

  return {
    id: row.id,
    businessId: row.business_id,
    categoryId: row.category_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    originalPrice: toNumber(row.original_price),
    discountedPrice: toNumber(row.discounted_price),
    initialQuantity: row.initial_quantity,
    availableQuantity: row.available_quantity,
    imageUrl: row.image_url,
    pickupStart: row.pickup_start,
    pickupEnd: row.pickup_end,
    expirationAt: row.expiration_at,
    ingredients: row.ingredients ?? null,
    allergens: row.allergens ?? null,
    storageInstructions: row.storage_instructions ?? null,
    status: isOfferStatus(row.status) ? row.status : "DRAFT",
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    category: category
      ? { id: category.id, name: category.name, slug: category.slug }
      : null,
  };
}

export type OwnOfferFilters = {
  status?: OfferDisplayStatus;
  search?: string;
};

export async function listOwnOffers(
  filters: OwnOfferFilters = {},
): Promise<BusinessOffer[]> {
  const supabase = await createClient();
  let request = supabase
    .from("offers")
    .select(BUSINESS_OFFER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.status === "ARCHIVED") {
    request = request.not("archived_at", "is", null);
  } else if (filters.status) {
    request = request.is("archived_at", null).eq("status", filters.status);
  }

  const search = sanitizeSearch(filters.search);
  if (search) {
    request = request.ilike("title", `%${search}%`);
  }

  const { data } = await request;
  return ((data ?? []) as unknown as RawOffer[]).map(mapBusinessOffer);
}

export async function countOwnOffers(): Promise<
  Record<OfferDisplayStatus, number>
> {
  const supabase = await createClient();
  const { data } = await supabase.from("offers").select("status, archived_at");

  const counts: Record<OfferDisplayStatus, number> = {
    DRAFT: 0,
    ACTIVE: 0,
    SOLD_OUT: 0,
    EXPIRED: 0,
    PAUSED: 0,
    ARCHIVED: 0,
  };

  for (const row of (data ?? []) as {
    status: string;
    archived_at: string | null;
  }[]) {
    const key: OfferDisplayStatus = row.archived_at
      ? "ARCHIVED"
      : isOfferStatus(row.status)
        ? row.status
        : "DRAFT";
    counts[key] += 1;
  }

  return counts;
}

export async function getOwnOffer(id: string): Promise<BusinessOffer | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("offers")
    .select(BUSINESS_OFFER_COLUMNS)
    .eq("id", id)
    .maybeSingle<RawOffer>();

  return data ? mapBusinessOffer(data) : null;
}

/* -------------------------------------------------------------------------- */
/* Administración (solo lectura)                                              */
/* -------------------------------------------------------------------------- */

export async function listOffersForAdmin(
  filters: OwnOfferFilters = {},
): Promise<AdminOffer[]> {
  const supabase = await createClient();
  let request = supabase
    .from("offers")
    .select(
      `${BUSINESS_OFFER_COLUMNS},
       businesses ( id, name, slug, district, address, city, type, logo_url )`,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.status === "ARCHIVED") {
    request = request.not("archived_at", "is", null);
  } else if (filters.status) {
    request = request.is("archived_at", null).eq("status", filters.status);
  }

  const search = sanitizeSearch(filters.search);
  if (search) {
    request = request.ilike("title", `%${search}%`);
  }

  const { data } = await request;

  return ((data ?? []) as unknown as RawOffer[]).map((row) => {
    const business = firstRelation(row.businesses);

    return {
      ...mapBusinessOffer(row),
      business: business
        ? { id: business.id, name: business.name, slug: business.slug }
        : null,
    };
  });
}

export async function countOffersForAdmin(): Promise<
  Record<OfferDisplayStatus, number>
> {
  const supabase = await createClient();
  const { data } = await supabase.from("offers").select("status, archived_at");

  const counts: Record<OfferDisplayStatus, number> = {
    DRAFT: 0,
    ACTIVE: 0,
    SOLD_OUT: 0,
    EXPIRED: 0,
    PAUSED: 0,
    ARCHIVED: 0,
  };

  for (const row of (data ?? []) as {
    status: string;
    archived_at: string | null;
  }[]) {
    const key: OfferDisplayStatus = row.archived_at
      ? "ARCHIVED"
      : isOfferStatus(row.status)
        ? row.status
        : "DRAFT";
    counts[key] += 1;
  }

  return counts;
}
