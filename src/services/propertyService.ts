import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Live data layer — reads/writes the Supabase `listings` + `inquiries` tables.
// This is the single source of truth for the Property Manager.
// The client is cast to `any` because the generated `Database` type is generic;
// the mappers below fully shape every row, so runtime behavior is unaffected.
// ---------------------------------------------------------------------------

const db = supabase as any;

export type ListingType = "sale" | "rent";

export interface Listing {
  id: string;
  title: string;
  type: ListingType;
  price: number;
  city: string;
  neighborhood: string;
  beds: number;
  baths: number;
  sqft: number;
  image: string;
  images: string[];
  description: string;
  amenities: string[];
  yearBuilt: number | null;
  hasGarage: boolean;
  hasPool: boolean;
  hasGarden: boolean;
  hasTerrace: boolean;
  hasFireplace: boolean;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  reference: string;
  propertyId: number | null;
  propertyTitle: string;
  propertyImage: string;
  customerName: string;
  email: string;
  phone: string;
  physicalAddress: Record<string, string>;
  intent: "Buy" | "Rent";
  timeline: string;
  contactMethod: string;
  message: string;
  status: "New" | "Contacted" | "In Review" | "Closed";
  createdAt: string;
}

export interface ListingInput {
  title: string;
  type: ListingType;
  price: number;
  city: string;
  neighborhood: string;
  beds: number;
  baths: number;
  sqft: number;
  image: string;
  images: string[];
  description: string;
  amenities: string[];
  yearBuilt: number | null;
  hasGarage: boolean;
  hasPool: boolean;
  hasGarden: boolean;
  hasTerrace: boolean;
  hasFireplace: boolean;
}

export interface InquiryInput {
  reference: string;
  propertyId: number | null;
  propertyTitle: string;
  propertyImage: string;
  customerName: string;
  email: string;
  phone: string;
  physicalAddress: Record<string, string>;
  intent: "Buy" | "Rent";
  timeline: string;
  contactMethod: string;
  message: string;
  status: Inquiry["status"];
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80";

// --- mappers ---------------------------------------------------------------

function mapListing(row: Record<string, any>): Listing {
  return {
    id: row.id,
    title: row.title ?? "",
    type: (row.type === "rent" ? "rent" : "sale") as ListingType,
    price: Number(row.price ?? 0),
    city: row.city ?? "",
    neighborhood: row.neighborhood ?? "",
    beds: Number(row.beds ?? 0),
    baths: Number(row.baths ?? 0),
    sqft: Number(row.sqft ?? 0),
    image: row.image || FALLBACK_IMAGE,
    images: Array.isArray(row.images) && row.images.length ? row.images : [row.image || FALLBACK_IMAGE],
    description: row.description ?? "",
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    yearBuilt: row.year_built ?? null,
    hasGarage: !!row.has_garage,
    hasPool: !!row.has_pool,
    hasGarden: !!row.has_garden,
    hasTerrace: !!row.has_terrace,
    hasFireplace: !!row.has_fireplace,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function mapInquiry(row: Record<string, any>): Inquiry {
  return {
    id: row.id,
    reference: row.reference ?? "",
    propertyId: row.property_id ?? null,
    propertyTitle: row.property_title ?? "",
    propertyImage: row.property_image || "",
    customerName: row.customer_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    physicalAddress: row.physical_address && typeof row.physical_address === "object" ? row.physical_address : {},
    intent: (row.intent === "Rent" ? "Rent" : "Buy") as Inquiry["intent"],
    timeline: row.timeline ?? "",
    contactMethod: row.contact_method ?? "",
    message: row.message ?? "",
    status: (row.status ?? "New") as Inquiry["status"],
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

// --- listings ---------------------------------------------------------------

export async function fetchListings(): Promise<Listing[]> {
  const { data, error } = await db.from("listings").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapListing);
}

export async function createListing(input: ListingInput): Promise<Listing> {
  const { data, error } = await db.from("listings").insert(input).select("*").single();
  if (error) throw error;
  return mapListing(data);
}

export async function updateListing(id: string, input: Partial<ListingInput>): Promise<Listing> {
  const { data, error } = await db.from("listings").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return mapListing(data);
}

export async function deleteListing(id: string): Promise<void> {
  const { error } = await db.from("listings").delete().eq("id", id);
  if (error) throw error;
}

// --- inquiries --------------------------------------------------------------

export async function fetchInquiries(): Promise<Inquiry[]> {
  const { data, error } = await db.from("inquiries").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapInquiry);
}

export async function createInquiry(input: InquiryInput): Promise<Inquiry> {
  const { data, error } = await db.from("inquiries").insert(input).select("*").single();
  if (error) throw error;
  return mapInquiry(data);
}

export async function updateInquiry(id: string, input: Partial<InquiryInput>): Promise<Inquiry> {
  const { data, error } = await db.from("inquiries").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return mapInquiry(data);
}

export async function deleteInquiry(id: string): Promise<void> {
  const { error } = await db.from("inquiries").delete().eq("id", id);
  if (error) throw error;
}

// --- derived / utility ------------------------------------------------------

export function getDistinctCities(listings: Listing[]): string[] {
  return Array.from(new Set(listings.map((l) => l.city).filter(Boolean))).sort();
}

export function formatPrice(listing: Pick<Listing, "type" | "price">): string {
  const n = listing.price.toLocaleString("en-US");
  return listing.type === "rent" ? `KES ${n}/mo` : `KES ${n}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const NL = String.fromCharCode(10);

export function downloadCsv(filename: string, rows: Record<string, any>[]): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  const blob = new Blob([lines.join(NL)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
