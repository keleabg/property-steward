import type { Property, PropertyType, PropertyStatus, ListingLocation } from "@/types/property";

const locations: ListingLocation[] = [
  "Kilimani", "Westlands", "Kileleshwa", "Karen", "Lavington", "Runda",
  "Upper Hill", "South B", "South C", "Ngong Road", "Kiambu Road",
  "Langata Road", "Nairobi", "Thika Road", "Eastleigh"
];

const agents = [
  "James Mwangi", "Amina Hassan", "David Ochieng", "Grace Wanjiku",
  "Peter Kamau", "Sarah Njeri", "Michael Otieno", "Faith Chebet",
  "John Kipchoge", "Mary Akinyi", "Robert Mutua", "Lucy Wambui"
];

const categories = ["Residential", "Commercial", "Land", "Mixed-Use", "Industrial"];

const featuresPool = [
  "Swimming Pool", "Gym", "Security 24/7", "Parking", "Garden",
  "Balcony", "Terrace", "Fireplace", "Built-in Wardrobes", "Central AC",
  "Solar Panels", "Backup Generator", "Elevator", "Concierge",
  "Children Play Area", "BBQ Area", "Tennis Court", "Sauna",
  "Home Theatre", "Smart Home System", "Wine Cellar", "Staff Quarters",
  "Laundry Room", "Study Room", "Walk-in Closet", "En-suite Bathroom",
  "Open Plan Kitchen", "Island Kitchen", "Pantry", "Double Garage"
];

const descriptions: Record<string, string[]> = {
  Apartment: [
    "Modern luxury apartment with panoramic city views, open-plan living, and premium finishes throughout.",
    "Spacious family apartment featuring large bedrooms, modern kitchen, and access to building amenities.",
    "Contemporary apartment in a prime location with floor-to-ceiling windows and designer interiors.",
    "Elegant apartment with high ceilings, polished floors, and a private balcony overlooking the garden."
  ],
  Mansion: [
    "Stunning mansion on an expansive plot with lush gardens, infinity pool, and state-of-the-art security.",
    "Grand estate featuring multiple living areas, a home theatre, wine cellar, and staff quarters.",
    "Architectural masterpiece with sweeping views, marble finishes, and resort-style outdoor living.",
    "Prestigious mansion set in gated community with tennis court, swimming pool, and landscaped grounds."
  ],
  Villa: [
    "Beautiful villa with contemporary design, private garden, and seamless indoor-outdoor living spaces.",
    "Charming villa offering spacious rooms, modern amenities, and a tranquil setting away from the bustle.",
    "Luxury villa with open-plan living, gourmet kitchen, and a stunning infinity pool overlooking the valley.",
    "Exclusive villa featuring smart home technology, landscaped gardens, and a private guest house."
  ],
  Commercial: [
    "Prime commercial space in the heart of the business district with high foot traffic and excellent visibility.",
    "Modern office complex with flexible floor plans, ample parking, and 24-hour security access.",
    "Retail space in a busy shopping center with high customer flow and excellent transport links.",
    "Warehouse facility with loading bays, high ceilings, and strategic location near major highways."
  ],
  Land: [
    "Prime development land with approved plans for residential construction in a rapidly growing area.",
    "Expansive plot zoned for mixed-use development with excellent road access and utility connections.",
    "Scenic land parcel with panoramic views, perfect for a luxury residential project or holiday home.",
    "Commercial-ready land in a thriving business corridor with all infrastructure in place."
  ],
  Penthouse: [
    "Spectacular penthouse with wraparound terrace, private elevator, and breathtaking skyline views.",
    "Ultra-luxury penthouse featuring bespoke finishes, rooftop pool, and world-class concierge service.",
    "Exclusive penthouse duplex with double-height living spaces, chef kitchen, and private sky garden.",
    "Premium penthouse in an iconic tower with floor-to-ceiling glass, smart home integration, and valet parking."
  ]
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
function genSlug(title: string, ref: string): string {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${ref}`;
}

function generateProperty(index: number): Property {
  const types: PropertyType[] = ["Apartment", "Mansion", "Villa", "Commercial", "Land", "Penthouse"];
  const statuses: PropertyStatus[] = ["Sale", "Rent", "Offplan"];
  const type = types[index % types.length];
  const status = index < 60 ? "Sale" : index < 85 ? "Rent" : "Offplan";
  const loc = locations[index % locations.length];
  const agent = agents[index % agents.length];
  const cat = categories[index % categories.length];
  const beds = type === "Land" || type === "Commercial" ? 0 : [1, 2, 3, 4, 5, 6][index % 6];
  const baths = type === "Land" || type === "Commercial" ? 0 : [1, 2, 2, 3, 3, 4][index % 6];
  const sizeBase = type === "Land" ? 500 + index * 200 : type === "Commercial" ? 200 + index * 50 : 50 + index * 15;
  const priceBase = type === "Land" ? 5000000 + index * 2000000 : type === "Commercial" ? 15000000 + index * 5000000 : 5000000 + index * 3000000;
  const price = status === "Rent" ? Math.round(priceBase / 12) : priceBase;
  const descArr = descriptions[type];
  const desc = descArr ? descArr[index % descArr.length] : descArr[0];
  const numFeatures = type === "Land" ? 2 + (index % 3) : 5 + (index % 8);
  const refs = Array.from({ length: 120 }, (_, i) => `CAL-${String(i + 1).padStart(4, "0")}`);
  const ref = refs[index % refs.length];
  const slug = genSlug(`${type} ${loc}`, ref);
  const baseDate = new Date(2024, 0, 1);
  const importedAt = new Date(baseDate.getTime() + index * 86400000 * 0.3).toISOString();
  const lastSynced = index % 5 !== 0 ? new Date(baseDate.getTime() + index * 86400000 * 0.3 + 86400000 * 10).toISOString() : null;
  const syncStat: Property["syncStatus"] = index % 20 === 0 ? "failed" : index % 15 === 0 ? "pending" : "synced";

  return {
    id: `prop-${index + 1}`,
    title: `${beds}-Bedroom ${type} in ${loc}`,
    description: desc,
    propertyType: type,
    status,
    price,
    currency: "KES",
    location: loc,
    bedrooms: beds,
    bathrooms: baths,
    sizeSqm: sizeBase,
    features: pickN(featuresPool, numFeatures),
    images: [
      { url: `https://images.unsplash.com/photo-${1500000000000 + index * 1000}?w=800&q=80`, alt: `${type} exterior`, isPrimary: true },
      { url: `https://images.unsplash.com/photo-${1500000001000 + index * 1000}?w=800&q=80`, alt: `${type} interior`, isPrimary: false },
      { url: `https://images.unsplash.com/photo-${1500000002000 + index * 1000}?w=800&q=80`, alt: `${type} view`, isPrimary: false }
    ],
    agentName: agent,
    category: cat,
    listingUrl: `https://calphahomes.co.ke/properties/${slug}`,
    referenceNumber: ref,
    slug,
    importedAt,
    lastSyncedAt: lastSynced,
    syncStatus: syncStat,
    originalImageUrl: `https://calphahomes.co.ke/images/${ref}.jpg`
  };
}

export const properties: Property[] = Array.from({ length: 120 }, (_, i) => generateProperty(i));
