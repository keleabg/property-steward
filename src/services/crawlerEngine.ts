import type { Property, SyncLog, CrawlBatch, DeltaChange, CsvColumnMapping } from "@/types/property";
import { properties as seedProperties } from "@/data/calphaSeedData";

const BATCH_SIZE = 50;
const CRAWL_DELAY_MS = 80;

let existingProperties: Property[] = [...seedProperties];
let syncLogs: SyncLog[] = [];
let crawlBatches: CrawlBatch[] = [];
let deltaChanges: DeltaChange[] = [];

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getProperties(): Property[] {
  return [...existingProperties];
}

export function getPropertyById(id: string): Property | undefined {
  return existingProperties.find(p => p.id === id);
}

export function deleteProperty(id: string): boolean {
  const idx = existingProperties.findIndex(p => p.id === id);
  if (idx === -1) return false;
  const prop = existingProperties[idx];
  existingProperties.splice(idx, 1);
  addLog("delete", prop.title, prop.referenceNumber, "Property removed from inventory", "info");
  return true;
}

export function updateProperty(id: string, updates: Partial<Property>): Property | null {
  const idx = existingProperties.findIndex(p => p.id === id);
  if (idx === -1) return null;
  existingProperties[idx] = { ...existingProperties[idx], ...updates };
  const prop = existingProperties[idx];
  addLog("update", prop.title, prop.referenceNumber, `Updated: ${Object.keys(updates).join(", ")}`, "info");
  return prop;
}

export function addLog(action: SyncLog["action"], propertyName: string, referenceNumber: string, details: string, severity: SyncLog["severity"], batchId?: string): void {
  syncLogs.unshift({
    id: generateId("log"),
    timestamp: new Date().toISOString(),
    action,
    propertyName,
    referenceNumber,
    details,
    severity,
    batchId
  });
}

export function getSyncLogs(): SyncLog[] {
  return [...syncLogs];
}

export function getCrawlBatches(): CrawlBatch[] {
  return [...crawlBatches];
}

export function getDeltaChanges(): DeltaChange[] {
  return [...deltaChanges];
}

function checkDuplicate(property: Partial<Property>): string | null {
  for (const existing of existingProperties) {
    if (existing.referenceNumber === property.referenceNumber) {
      return `Duplicate reference number: ${property.referenceNumber}`;
    }
    if (existing.listingUrl === property.listingUrl) {
      return `Duplicate listing URL: ${property.listingUrl}`;
    }
    if (existing.title.toLowerCase() === property.title?.toLowerCase()) {
      return `Duplicate title: ${property.title}`;
    }
  }
  return null;
}

function generateSlug(title: string, ref: string): string {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${ref}`;
}

export interface HeroSeek {
  search: string;
  status: string;
  propertyType: string;
  location: string;
  priceMin: number | "";
  priceMax: number | "";
  beds: "" | 1 | 2 | 3 | 4 | 5;
}

export function countMatching(seek: HeroSeek): number {
  const q = seek.search.toLowerCase().trim();
  const wantCommercial = seek.status === "Commercial";
  return existingProperties.filter(p => {
    if (seek.status !== "All" && !wantCommercial && p.status !== seek.status) return false;
    if (wantCommercial && p.propertyType !== "Commercial") return false;
    if (!wantCommercial && seek.propertyType !== "All" && p.propertyType !== seek.propertyType) return false;
    if (seek.location !== "All" && p.location !== seek.location) return false;
    const annual = p.status === "Rent" ? p.price * 12 : p.price;
    if (seek.priceMin !== "" && annual < seek.priceMin) return false;
    if (seek.priceMax !== "" && annual > seek.priceMax) return false;
    if (seek.beds !== "" && p.bedrooms < seek.beds) return false;
    if (q && !`${p.title} ${p.location} ${p.propertyType} ${p.referenceNumber}`.toLowerCase().includes(q)) return false;
    return true;
  }).length;
}

export function seekProperties(seek: HeroSeek): Property[] {
  const q = seek.search.toLowerCase().trim();
  const wantCommercial = seek.status === "Commercial";
  return existingProperties
    .filter(p => {
      if (seek.status !== "All" && !wantCommercial && p.status !== seek.status) return false;
      if (wantCommercial && p.propertyType !== "Commercial") return false;
      if (!wantCommercial && seek.propertyType !== "All" && p.propertyType !== seek.propertyType) return false;
      if (seek.location !== "All" && p.location !== seek.location) return false;
      const annual = p.status === "Rent" ? p.price * 12 : p.price;
      if (seek.priceMin !== "" && annual < seek.priceMin) return false;
      if (seek.priceMax !== "" && annual > seek.priceMax) return false;
      if (seek.beds !== "" && p.bedrooms < seek.beds) return false;
      if (q && !`${p.title} ${p.location} ${p.propertyType} ${p.referenceNumber}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => b.price - a.price);
}

async function simulateCrawl(url: string, depth: number): Promise<Property[]> {
  await new Promise(r => setTimeout(r, CRAWL_DELAY_MS));
  const count = Math.min(depth * 25, 150);
  const results: Property[] = [];
  for (let i = 0; i < count; i++) {
    const seedIdx = (crawlBatches.length * BATCH_SIZE + i) % seedProperties.length;
    const seed = seedProperties[seedIdx];
    const modified = {
      ...seed,
      id: generateId("prop"),
      importedAt: new Date().toISOString(),
      lastSyncedAt: null,
      syncStatus: "pending" as const,
      listingUrl: url.includes("properties") ? `${url}/item-${i + 1}` : seed.listingUrl,
      referenceNumber: `CAL-CRAWL-${String(i + 1).padStart(4, "0")}`
    };
    results.push(modified);
  }
  return results;
}

export async function startCrawl(targetUrl: string, depth: number = 3, batchSize: number = BATCH_SIZE): Promise<CrawlBatch> {
  const batchId = generateId("batch");
  const batch: CrawlBatch = {
    id: batchId,
    targetUrl,
    status: "running",
    totalFound: 0,
    imported: 0,
    failed: 0,
    remaining: 0,
    currentBatch: 0,
    totalBatches: 0,
    etaSeconds: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    progressPercent: 0
  };
  crawlBatches.unshift(batch);

  try {
    const crawled = await simulateCrawl(targetUrl, depth);
    batch.totalFound = crawled.length;
    batch.remaining = crawled.length;
    batch.totalBatches = Math.ceil(crawled.length / batchSize);

    for (let i = 0; i < crawled.length; i += batchSize) {
      batch.currentBatch = Math.floor(i / batchSize) + 1;
      const chunk = crawled.slice(i, i + batchSize);
      let batchImported = 0;
      let batchFailed = 0;

      for (const prop of chunk) {
        const dupCheck = checkDuplicate(prop);
        if (dupCheck) {
          addLog("duplicate_skip", prop.title || "Unknown", prop.referenceNumber, dupCheck, "warning", batchId);
          batchFailed++;
        } else {
          const slug = generateSlug(prop.title || "Untitled", prop.referenceNumber);
          const fullProp: Property = {
            ...prop,
            slug,
            images: prop.images.map(img => ({
              ...img,
              url: `/storage/bucket/${slug}/${img.url.split("/").pop()}`
            }))
          };
          existingProperties.unshift(fullProp);
          addLog("import", fullProp.title, fullProp.referenceNumber, `Imported in batch ${batch.currentBatch}`, "info", batchId);
          addLog("image_download", fullProp.title, fullProp.referenceNumber, `Downloaded ${fullProp.images.length} images`, "info", batchId);
          batchImported++;
        }
        batch.imported += batchImported;
        batch.failed += batchFailed;
        batch.remaining = crawled.length - (batch.imported + batch.failed);
        batch.progressPercent = Math.round(((batch.imported + batch.failed) / crawled.length) * 100);
        batch.etaSeconds = Math.max(0, Math.ceil((crawled.length - batch.imported - batch.failed) / 10));
        await new Promise(r => setTimeout(r, CRAWL_DELAY_MS));
      }
    }

    batch.status = "completed";
    batch.completedAt = new Date().toISOString();
    batch.progressPercent = 100;
    batch.etaSeconds = 0;
    addLog("import", "Crawl Complete", "", `Finished: ${batch.imported} imported, ${batch.failed} skipped`, "info", batchId);
  } catch (error) {
    batch.status = "failed";
    batch.completedAt = new Date().toISOString();
    addLog("import", "Crawl Failed", "", error instanceof Error ? error.message : "Unknown error", "error", batchId);
  }

  return batch;
}

export function pauseCrawl(batchId: string): boolean {
  const batch = crawlBatches.find(b => b.id === batchId);
  if (batch && batch.status === "running") {
    batch.status = "paused";
    return true;
  }
  return false;
}

export function resumeCrawl(batchId: string): boolean {
  const batch = crawlBatches.find(b => b.id === batchId);
  if (batch && batch.status === "paused") {
    batch.status = "running";
    return true;
  }
  return false;
}

export function stopCrawl(batchId: string): boolean {
  const batch = crawlBatches.find(b => b.id === batchId);
  if (batch && (batch.status === "running" || batch.status === "paused")) {
    batch.status = "failed";
    batch.completedAt = new Date().toISOString();
    addLog("import", "Crawl Stopped", "", "User stopped crawl manually", "warning", batchId);
    return true;
  }
  return false;
}

export function runSync(): { added: number; updated: number; delisted: number; priceChanges: number } {
  const stats = { added: 0, updated: 0, delisted: 0, priceChanges: 0 };
  const seedRefs = new Set(seedProperties.map(s => s.referenceNumber));
  const existingRefs = new Set(existingProperties.map(p => p.referenceNumber));

  for (const seed of seedProperties) {
    if (!existingRefs.has(seed.referenceNumber)) {
      const slug = generateSlug(seed.title, seed.referenceNumber);
      const newProp: Property = {
        ...seed,
        id: generateId("prop"),
        importedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        syncStatus: "synced"
      };
      existingProperties.unshift(newProp);
      addLog("new_listing", newProp.title, newProp.referenceNumber, "Detected via sync", "info");
      stats.added++;
    }
  }

  for (const existing of existingProperties) {
    const seed = seedProperties.find(s => s.referenceNumber === existing.referenceNumber);
    if (seed && existing.syncStatus !== "archived") {
      if (seed.price !== existing.price) {
        const changeType = seed.price > existing.price ? "price_increase" : "price_drop";
        deltaChanges.unshift({
          id: generateId("delta"),
          propertyId: existing.id,
          referenceNumber: existing.referenceNumber,
          changeType,
          oldValue: `KES ${existing.price.toLocaleString()}`,
          newValue: `KES ${seed.price.toLocaleString()}`,
          detectedAt: new Date().toISOString()
        });
        existing.price = seed.price;
        existing.lastSyncedAt = new Date().toISOString();
        existing.syncStatus = "synced";
        stats.updated++;
        stats.priceChanges++;
        addLog("price_change", existing.title, existing.referenceNumber, `${changeType}: ${deltaChanges[0].oldValue} → ${deltaChanges[0].newValue}`, "info");
      } else {
        existing.lastSyncedAt = new Date().toISOString();
        stats.updated++;
      }
    } else if (seed && existing.syncStatus === "archived") {
      stats.delisted++;
    }
  }

  for (const existing of existingProperties) {
    if (!seedRefs.has(existing.referenceNumber) && existing.syncStatus !== "archived") {
      existing.syncStatus = "archived";
      addLog("delisted", existing.title, existing.referenceNumber, "No longer on source site", "warning");
      stats.delisted++;
    }
  }

  return stats;
}

export function exportToCsv(propertiesToExport: Property[]): string {
  const headers = ["id", "title", "description", "propertyType", "status", "price", "currency", "location", "bedrooms", "bathrooms", "sizeSqm", "features", "agentName", "category", "listingUrl", "referenceNumber", "slug", "importedAt", "syncStatus"];
  const rows = propertiesToExport.map(p => [
    p.id, `"${p.title.replace(/"/g, '""')}"`, `"${p.description.replace(/"/g, '""')}"`,
    p.propertyType, p.status, p.price, p.currency, p.location,
    p.bedrooms, p.bathrooms, p.sizeSqm, `"${p.features.join("; ").replace(/"/g, '""')}"`,
    p.agentName, p.category, p.listingUrl, p.referenceNumber, p.slug,
    p.importedAt, p.syncStatus
  ]);
  return [headers.join(","), ...rows.map(r => r.join(","))].join(String.fromCharCode(10));
}

export function downloadCsv(propertiesToExport: Property[], filename: string = "properties_export.csv"): void {
  const csv = exportToCsv(propertiesToExport);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  addLog("import", "CSV Export", "", `Exported ${propertiesToExport.length} properties to ${filename}`, "info");
}

export const columnMappings: CsvColumnMapping[] = [
  { csvHeader: "title", propertyField: "title", required: true },
  { csvHeader: "description", propertyField: "description", required: true },
  { csvHeader: "propertyType", propertyField: "propertyType", required: true },
  { csvHeader: "status", propertyField: "status", required: true },
  { csvHeader: "price", propertyField: "price", required: true },
  { csvHeader: "location", propertyField: "location", required: true },
  { csvHeader: "bedrooms", propertyField: "bedrooms", required: false },
  { csvHeader: "bathrooms", propertyField: "bathrooms", required: false },
  { csvHeader: "sizeSqm", propertyField: "sizeSqm", required: false },
  { csvHeader: "agentName", propertyField: "agentName", required: false },
  { csvHeader: "listingUrl", propertyField: "listingUrl", required: false },
  { csvHeader: "referenceNumber", propertyField: "referenceNumber", required: true }
];