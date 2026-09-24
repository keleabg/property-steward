export type PropertyType = "Apartment" | "Mansion" | "Villa" | "Commercial" | "Land" | "Penthouse";
export type PropertyStatus = "Sale" | "Rent" | "Offplan";
export type ListingLocation =
  | "Nairobi"
  | "Kilimani"
  | "Westlands"
  | "Kileleshwa"
  | "Karen"
  | "Lavington"
  | "Runda"
  | "South B"
  | "South C"
  | "Eastleigh"
  | "Upper Hill"
  | "Ngong Road"
  | "Kiambu Road"
  | "Thika Road"
  | "Langata Road";

export interface PropertyImage {
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  price: number;
  currency: "KES" | "USD";
  location: ListingLocation;
  bedrooms: number;
  bathrooms: number;
  sizeSqm: number;
  features: string[];
  images: PropertyImage[];
  agentName: string;
  category: string;
  listingUrl: string;
  referenceNumber: string;
  slug: string;
  importedAt: string;
  lastSyncedAt: string | null;
  syncStatus: "synced" | "pending" | "failed" | "archived";
  originalImageUrl?: string;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  action: "import" | "update" | "delete" | "duplicate_skip" | "image_download" | "price_change" | "new_listing" | "delisted";
  propertyName: string;
  referenceNumber: string;
  details: string;
  severity: "info" | "warning" | "error";
  batchId?: string;
}

export interface CrawlBatch {
  id: string;
  targetUrl: string;
  status: "queued" | "running" | "completed" | "paused" | "failed";
  totalFound: number;
  imported: number;
  failed: number;
  remaining: number;
  currentBatch: number;
  totalBatches: number;
  etaSeconds: number;
  startedAt: string;
  completedAt: string | null;
  progressPercent: number;
}

export interface DeltaChange {
  id: string;
  propertyId: string;
  referenceNumber: string;
  changeType: "price_drop" | "price_increase" | "new_listing" | "delisted" | "description_update" | "amenity_change" | "image_update";
  oldValue: string;
  newValue: string;
  detectedAt: string;
}

export interface FilterState {
  search: string;
  status: PropertyStatus | "All";
  propertyType: PropertyType | "All";
  location: ListingLocation | "All";
  priceMin: number | "";
  priceMax: number | "";
  syncStatus: "all" | "synced" | "pending" | "failed" | "archived";
  sortBy: "title" | "price" | "date" | "bedrooms";
  sortOrder: "asc" | "desc";
}

export interface CsvColumnMapping {
  csvHeader: string;
  propertyField: keyof Property;
  required: boolean;
}
