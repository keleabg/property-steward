import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Eye, Trash2, Pencil, Plus, MapPin, Home, Bed, Bath, Maximize2, DollarSign, X, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  createListing,
  updateListing,
  deleteListing,
  formatPrice,
  getDistinctCities,
  type Listing,
  type ListingInput,
  type ListingType,
} from "@/services/propertyService";

const statusColors: Record<ListingType, string> = {
  sale: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rent: "bg-blue-100 text-blue-700 border-blue-200",
};

const AMENITY_OPTIONS = ["Garage", "Pool", "Garden", "Terrace", "Fireplace"];

interface FormState {
  title: string;
  type: ListingType;
  price: string;
  city: string;
  neighborhood: string;
  beds: string;
  baths: string;
  sqft: string;
  image: string;
  description: string;
  yearBuilt: string;
  amenities: string[];
}

const emptyForm: FormState = {
  title: "",
  type: "sale",
  price: "",
  city: "",
  neighborhood: "",
  beds: "0",
  baths: "1",
  sqft: "",
  image: "",
  description: "",
  yearBuilt: "",
  amenities: [],
};

export function InventoryManager({
  listings,
  onListingsChange,
}: {
  listings: Listing[];
  onListingsChange: (l: Listing[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListingType | "All">("All");
  const [locationFilter, setLocationFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"date" | "title" | "price">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const cities = useMemo(() => getDistinctCities(listings), [listings]);

  const filtered = useMemo(() => {
    let list = listings;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.neighborhood.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "All") list = list.filter((l) => l.type === statusFilter);
    if (locationFilter !== "All") list = list.filter((l) => l.city === locationFilter);
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "title") cmp = a.title.localeCompare(b.title);
      else if (sortBy === "price") cmp = a.price - b.price;
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return list;
  }, [listings, search, statusFilter, locationFilter, sortBy, sortOrder]);

  const selected = selectedId ? listings.find((l) => l.id === selectedId) ?? null : null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((l) => l.id)));
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (l: Listing) => {
    setEditing(l);
    setForm({
      title: l.title,
      type: l.type,
      price: String(l.price),
      city: l.city,
      neighborhood: l.neighborhood,
      beds: String(l.beds),
      baths: String(l.baths),
      sqft: String(l.sqft),
      image: l.image,
      description: l.description,
      yearBuilt: l.yearBuilt ? String(l.yearBuilt) : "",
      amenities: l.amenities,
    });
    setFormOpen(true);
  };

  const buildInput = (): ListingInput => ({
    title: form.title.trim(),
    type: form.type,
    price: Number(form.price) || 0,
    city: form.city.trim(),
    neighborhood: form.neighborhood.trim(),
    beds: Number(form.beds) || 0,
    baths: Number(form.baths) || 0,
    sqft: Number(form.sqft) || 0,
    image: form.image.trim(),
    images: form.image.trim() ? [form.image.trim()] : [],
    description: form.description.trim(),
    amenities: form.amenities,
    yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : null,
    hasGarage: form.amenities.includes("Garage"),
    hasPool: form.amenities.includes("Pool"),
    hasGarden: form.amenities.includes("Garden"),
    hasTerrace: form.amenities.includes("Terrace"),
    hasFireplace: form.amenities.includes("Fireplace"),
  });

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const input = buildInput();
      if (editing) {
        const updated = await updateListing(editing.id, input);
        onListingsChange(listings.map((l) => (l.id === updated.id ? updated : l)));
        toast.success("Listing updated");
      } else {
        const created = await createListing(input);
        onListingsChange([created, ...listings]);
        toast.success("Listing created");
      }
      setFormOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save listing");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const prev = listings;
    onListingsChange(listings.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
    setSelectedIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    try {
      await deleteListing(id);
      toast.success("Listing deleted");
    } catch (e: any) {
      onListingsChange(prev);
      toast.error(e?.message ?? "Failed to delete");
    }
  };

  const handleBulkDelete = async () => {
    const prev = listings;
    const ids = Array.from(selectedIds);
    onListingsChange(listings.filter((l) => !selectedIds.has(l.id)));
    setSelectedIds(new Set());
    try {
      await Promise.all(ids.map((id) => deleteListing(id)));
      toast.success(`${ids.length} listings deleted`);
    } catch (e: any) {
      onListingsChange(prev);
      toast.error(e?.message ?? "Bulk delete failed");
    }
  };

  const field = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition";
  const label = "text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block";

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/40 bg-gradient-to-br from-emerald-50 to-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Listings</p>
            <p className="text-2xl font-bold">{listings.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">For Sale</p>
            <p className="text-2xl font-bold text-emerald-600">{listings.filter((l) => l.type === "sale").length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">For Rent</p>
            <p className="text-2xl font-bold text-blue-600">{listings.filter((l) => l.type === "rent").length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Cities</p>
            <p className="text-2xl font-bold text-purple-600">{cities.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/40">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, city, or neighborhood..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ListingType | "All")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Cities</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort: Date</SelectItem>
                <SelectItem value="title">Sort: Title</SelectItem>
                <SelectItem value="price">Sort: Price</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Listing
            </Button>
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete ({selectedIds.size})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Property Table */}
      <Card className="border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Beds/Baths</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filtered.map((l, i) => (
                <motion.tr
                  key={l.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.01 }}
                  className={selectedId === l.id ? "bg-emerald-50/50" : "cursor-pointer hover:bg-muted/30"}
                  onClick={() => setSelectedId(l.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(l.id)} onCheckedChange={() => toggleSelect(l.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img src={l.image} alt={l.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-medium text-sm truncate max-w-[220px]">{l.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[220px]">{l.neighborhood || l.city}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[l.type]}>
                      {l.type === "sale" ? "Sale" : "Rent"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {l.city}
                  </TableCell>
                  <TableCell className="font-semibold text-sm">{formatPrice(l)}</TableCell>
                  <TableCell className="text-sm">
                    {l.beds}/{l.baths}
                  </TableCell>
                  <TableCell className="text-sm">{l.sqft.toLocaleString()} ft²</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setSelectedId(l.id)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(l)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500" onClick={() => handleDelete(l.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No listings found matching your filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-start justify-between gap-3">
                  <span>{selected.title}</span>
                  <Badge className={statusColors[selected.type]}>{selected.type === "sale" ? "For Sale" : "For Rent"}</Badge>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 text-sm">
                  <MapPin className="w-3 h-3" />
                  {selected.neighborhood ? `${selected.neighborhood}, ` : ""}
                  {selected.city}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden aspect-video bg-muted">
                  <img src={selected.image} alt={selected.title} className="w-full h-full object-cover" />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-bold text-sm">{formatPrice(selected)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Home className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-bold text-sm capitalize">{selected.type}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Bed className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Beds</p>
                    <p className="font-bold text-sm">{selected.beds}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Bath className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Baths</p>
                    <p className="font-bold text-sm">{selected.baths}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Maximize2 className="w-4 h-4 text-muted-foreground" />
                    <span>{selected.sqft.toLocaleString()} sqft</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span>{selected.yearBuilt ? `Built ${selected.yearBuilt}` : "Year N/A"}</span>
                  </div>
                </div>

                {selected.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>
                  </div>
                )}

                {selected.amenities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Amenities</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.amenities.map((a) => (
                        <Badge key={a} variant="secondary" className="text-xs">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(selected)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setSelectedId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Listing" : "Add Listing"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the listing details in the database." : "Create a new listing in the database."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className={label}>Title *</label>
              <input className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Status</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ListingType })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">For Sale</SelectItem>
                    <SelectItem value="rent">For Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={label}>Price (KES)</label>
                <input className={field} type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>City</label>
                <input className={field} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className={label}>Neighborhood</label>
                <input className={field} value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={label}>Beds</label>
                <input className={field} type="number" value={form.beds} onChange={(e) => setForm({ ...form, beds: e.target.value })} />
              </div>
              <div>
                <label className={label}>Baths</label>
                <input className={field} type="number" step="0.5" value={form.baths} onChange={(e) => setForm({ ...form, baths: e.target.value })} />
              </div>
              <div>
                <label className={label}>Sqft</label>
                <input className={field} type="number" value={form.sqft} onChange={(e) => setForm({ ...form, sqft: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={label}>Image URL</label>
              <input className={field} value={form.image} placeholder="https://..." onChange={(e) => setForm({ ...form, image: e.target.value })} />
            </div>
            <div>
              <label className={label}>Description</label>
              <textarea className={`${field} min-h-[70px] resize-y`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className={label}>Amenities</label>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map((a) => {
                  const active = form.amenities.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          amenities: active ? form.amenities.filter((x) => x !== a) : [...form.amenities, a],
                        })
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        active
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {active && <Check className="w-3 h-3" />}
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Listing"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
