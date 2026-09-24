import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Trash2, Mail, Phone, MapPin, User, Clock, RefreshCw, X, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  fetchInquiries,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  formatDate,
  type Inquiry,
  type Listing,
} from "@/services/propertyService";

const STATUS_ORDER: Inquiry["status"][] = ["New", "Contacted", "In Review", "Closed"];

const statusColors: Record<Inquiry["status"], string> = {
  New: "bg-blue-100 text-blue-700 border-blue-200",
  Contacted: "bg-amber-100 text-amber-700 border-amber-200",
  "In Review": "bg-purple-100 text-purple-700 border-purple-200",
  Closed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const intentColors: Record<Inquiry["intent"], string> = {
  Buy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Rent: "bg-blue-100 text-blue-700 border-blue-200",
};

interface EmptyForm {
  reference: string;
  customerName: string;
  email: string;
  phone: string;
  propertyTitle: string;
  intent: Inquiry["intent"];
  timeline: string;
  contactMethod: string;
  message: string;
}

const emptyForm: EmptyForm = {
  reference: "",
  customerName: "",
  email: "",
  phone: "",
  propertyTitle: "",
  intent: "Buy",
  timeline: "",
  contactMethod: "Email",
  message: "",
};

export function InquiriesManager({ listings }: { listings: Listing[] }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Inquiry["status"] | "All">("All");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<EmptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchInquiries();
      setInquiries(rows);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load inquiries");
      toast.error("Could not load inquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = inquiries;
    if (statusFilter !== "All") list = list.filter((i) => i.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.customerName.toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q) ||
          i.reference.toLowerCase().includes(q) ||
          i.propertyTitle.toLowerCase().includes(q),
      );
    }
    return list;
  }, [inquiries, search, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: inquiries.length };
    for (const s of STATUS_ORDER) c[s] = inquiries.filter((i) => i.status === s).length;
    return c;
  }, [inquiries]);

  const openAdd = () => {
    const nextNum = inquiries.length
      ? Math.max(...inquiries.map((i) => Number((i.reference.match(/(\d+)$/) || [])[1] || 0))) + 1
      : 1;
    setForm({ ...emptyForm, reference: `HB-2025-${String(nextNum).padStart(4, "0")}` });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.email.trim()) {
      toast.error("Customer name and email are required");
      return;
    }
    setSaving(true);
    try {
      const created = await createInquiry({
        reference: form.reference.trim() || `HB-2025-${Date.now().toString().slice(-4)}`,
        propertyId: null,
        propertyTitle: form.propertyTitle.trim(),
        propertyImage: "",
        customerName: form.customerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        physicalAddress: {},
        intent: form.intent,
        timeline: form.timeline.trim(),
        contactMethod: form.contactMethod,
        message: form.message.trim(),
        status: "New",
      });
      setInquiries((prev) => [created, ...prev]);
      toast.success(`Inquiry ${created.reference} created`);
      setDialogOpen(false);
      setForm(emptyForm);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create inquiry");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (inq: Inquiry, status: Inquiry["status"]) => {
    const prev = inquiries;
    setInquiries((list) => list.map((i) => (i.id === inq.id ? { ...i, status } : i)));
    setSelected((s) => (s && s.id === inq.id ? { ...s, status } : s));
    try {
      await updateInquiry(inq.id, { status });
      toast.success(`${inq.reference} → ${status}`);
    } catch (e: any) {
      setInquiries(prev);
      toast.error(e?.message ?? "Failed to update status");
    }
  };

  const handleDelete = async (inq: Inquiry) => {
    const prev = inquiries;
    setInquiries((list) => list.filter((i) => i.id !== inq.id));
    try {
      await deleteInquiry(inq.id);
      toast.success(`${inq.reference} deleted`);
    } catch (e: any) {
      setInquiries(prev);
      toast.error(e?.message ?? "Failed to delete inquiry");
    }
  };

  const field = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition";
  const label = "text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 block";

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border/40 bg-gradient-to-br from-emerald-50 to-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Inquiries</p>
            <p className="text-2xl font-bold">{counts.All}</p>
          </CardContent>
        </Card>
        {STATUS_ORDER.map((s) => (
          <Card key={s} className="border-border/40">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{s}</p>
              <p className="text-2xl font-bold">{counts[s]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-border/40">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, reference, or property..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Inquiry["status"] | "All")}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> New Inquiry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Loading inquiries...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No inquiries found
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence>
                {filtered.map((inq, i) => (
                  <motion.tr
                    key={inq.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setSelected(inq)}
                  >
                    <TableCell className="font-mono text-xs font-medium">{inq.reference}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate max-w-[180px]">{inq.customerName}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{inq.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">
                      {inq.propertyTitle || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={intentColors[inq.intent]}>
                        {inq.intent}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inq.timeline || "—"}</TableCell>
                    <TableCell>
                      <Select value={inq.status} onValueChange={(v) => handleStatusChange(inq, v as Inquiry["status"])}>
                        <SelectTrigger className="w-[120px] h-8" onClick={(e) => e.stopPropagation()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_ORDER.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(inq.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(inq);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-3">
                  <span className="font-mono text-base">{selected.reference}</span>
                  <Badge className={statusColors[selected.status]}>{selected.status}</Badge>
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Customer inquiry · received {formatDate(selected.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{selected.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className={intentColors[selected.intent]}>
                      {selected.intent}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${selected.email}`} className="text-blue-600 hover:underline truncate">
                      {selected.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selected.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{selected.propertyTitle || "No property linked"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{selected.timeline || "No timeline"}</span>
                  </div>
                </div>

                {selected.message && (
                  <div>
                    <h4 className="text-sm font-medium mb-1.5">Message</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 rounded-lg p-3">
                      {selected.message}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Preferred contact: {selected.contactMethod || "—"}</span>
                  <div className="flex items-center gap-2">
                    <Select value={selected.status} onValueChange={(v) => handleStatusChange(selected, v as Inquiry["status"])}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-red-500" onClick={() => handleDelete(selected)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setSelected(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Customer Inquiry</DialogTitle>
            <DialogDescription>Log a new lead from the database.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Reference</label>
                <input className={field} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
              <div>
                <label className={label}>Intent</label>
                <Select value={form.intent} onValueChange={(v) => setForm({ ...form, intent: v as Inquiry["intent"] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Buy">Buy</SelectItem>
                    <SelectItem value="Rent">Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className={label}>Customer Name *</label>
              <input className={field} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Email *</label>
                <input className={field} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className={label}>Phone</label>
                <input className={field} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={label}>Property</label>
              <Select value={form.propertyTitle || "__none"} onValueChange={(v) => setForm({ ...form, propertyTitle: v === "__none" ? "" : v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Link a listing (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No property</SelectItem>
                  {listings.map((l) => (
                    <SelectItem key={l.id} value={l.title}>
                      {l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Timeline</label>
                <input className={field} placeholder="e.g. Within 3 months" value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} />
              </div>
              <div>
                <label className={label}>Contact Method</label>
                <Select value={form.contactMethod} onValueChange={(v) => setForm({ ...form, contactMethod: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Email", "Phone", "WhatsApp"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className={label}>Message</label>
              <textarea
                className={`${field} min-h-[80px] resize-y`}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving ? "Saving..." : "Create Inquiry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}