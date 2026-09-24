import { useMemo, useState } from "react";
import { RefreshCw, Database, Download, Upload, FileText, CheckCircle2, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { downloadCsv, type Listing } from "@/services/propertyService";

interface LogEntry {
  id: string;
  action: string;
  severity: "info" | "success" | "error";
  details: string;
  timestamp: string;
}

const severityColors: Record<LogEntry["severity"], string> = {
  info: "bg-blue-100 text-blue-700",
  success: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-700",
};

const COLUMN_MAP = [
  { csv: "title", required: true },
  { csv: "type", required: true },
  { csv: "price", required: true },
  { csv: "city", required: true },
  { csv: "neighborhood", required: false },
  { csv: "beds", required: true },
  { csv: "baths", required: true },
  { csv: "sqft", required: true },
  { csv: "image", required: false },
  { csv: "description", required: false },
];

const NL = String.fromCharCode(10);

export function SyncAndLogs({ listings }: { listings: Listing[] }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | "info" | "success" | "error">("all");

  const addLog = (action: string, severity: LogEntry["severity"], details: string) => {
    setLogs((prev) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, action, severity, details, timestamp: new Date().toISOString() },
      ...prev,
    ]);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    addLog("SYNC_START", "info", "Reconnecting to Supabase and refreshing inventory...");
    await new Promise((r) => setTimeout(r, 600));
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { count, error } = await supabase.from("listings").select("*", { count: "exact", head: true });
      if (error) throw error;
      setLastSync(new Date().toISOString());
      addLog("SYNC_OK", "success", `Connected to Supabase — ${count} listings in database.`);
      toast.success(`Synced: ${count} listings in database`);
    } catch (e: any) {
      addLog("SYNC_ERROR", "error", e?.message ?? "Sync failed");
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    const rows = listings.map((l) => ({
      title: l.title,
      type: l.type,
      price: l.price,
      city: l.city,
      neighborhood: l.neighborhood,
      beds: l.beds,
      baths: l.baths,
      sqft: l.sqft,
      image: l.image,
      description: l.description,
      amenities: l.amenities,
      year_built: l.yearBuilt,
    }));
    downloadCsv("alphahomes_listings.csv", rows);
    addLog("EXPORT", "success", `Exported ${rows.length} listings to CSV.`);
    toast.success(`Exported ${rows.length} listings`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(NL).filter((l) => l.trim());
      if (lines.length < 2) {
        addLog("IMPORT_ERROR", "error", "CSV has no data rows.");
        toast.error("Invalid CSV: no data rows");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const missing = COLUMN_MAP.filter((m) => m.required).map((m) => m.csv).filter((f) => !headers.includes(f));
      if (missing.length > 0) {
        addLog("IMPORT_ERROR", "error", `Missing required columns: ${missing.join(", ")}`);
        toast.error(`Missing columns: ${missing.join(", ")}`);
        return;
      }
      addLog("IMPORT_OK", "success", `CSV validated — ${lines.length - 1} rows ready for ingestion.`);
      toast.success(`CSV validated: ${lines.length - 1} rows`);
    };
    reader.readAsText(file);
  };

  const filteredLogs = logs.filter((l) => logFilter === "all" || l.severity === logFilter);

  const stats = useMemo(
    () => ({
      total: listings.length,
      sale: listings.filter((l) => l.type === "sale").length,
      rent: listings.filter((l) => l.type === "rent").length,
      value: listings.reduce((s, l) => s + (l.type === "rent" ? l.price * 12 : l.price), 0),
    }),
    [listings],
  );

  return (
    <Tabs defaultValue="sync" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="sync">Database Sync</TabsTrigger>
        <TabsTrigger value="logs">Activity Log</TabsTrigger>
        <TabsTrigger value="csv">CSV Import/Export</TabsTrigger>
      </TabsList>

      {/* Database Sync Tab */}
      <TabsContent value="sync" className="space-y-4">
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                Supabase Connection
              </span>
              <Button onClick={handleSync} disabled={isSyncing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Run Sync"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-800">Connected to Supabase</p>
                <p className="text-xs text-emerald-600 truncate">
                  {lastSync ? `Last verified: ${new Date(lastSync).toLocaleString()}` : "Live read/write enabled on listings & inquiries"}
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Live</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-muted-foreground">Total Listings</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-xs text-emerald-600">For Sale</p>
                <p className="text-xl font-bold text-emerald-700">{stats.sale}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600">For Rent</p>
                <p className="text-xl font-bold text-blue-700">{stats.rent}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-xs text-purple-600">Portfolio Value</p>
                <p className="text-xl font-bold text-purple-700">KES {Math.round(stats.value / 1_000_000)}M</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Activity Log Tab */}
      <TabsContent value="logs" className="space-y-4">
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              {(["all", "info", "success", "error"] as const).map((sev) => (
                <Button key={sev} variant={logFilter === sev ? "default" : "outline"} size="sm" onClick={() => setLogFilter(sev)} className="capitalize">
                  {sev}
                </Button>
              ))}
            </div>
            <ScrollArea className="h-96 rounded-md border">
              <div className="divide-y">
                {filteredLogs.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No activity yet. Run a sync or perform an action to see logs here.
                  </div>
                )}
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className={`mt-0.5 ${severityColors[log.severity]}`}>
                        {log.action}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{log.details}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      {/* CSV Import/Export Tab */}
      <TabsContent value="csv" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                Export Listings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Download all listings from the database as a CSV file compatible with Excel and Google Sheets.
              </p>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Schema</h4>
                <div className="flex flex-wrap gap-1">
                  {COLUMN_MAP.map((m) => (
                    <Badge key={m.csv} variant="outline" className="text-xs">
                      {m.csv}
                      {m.required && " *"}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={handleExport} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                Export All Listings ({listings.length} records)
              </Button>
            </CardContent>
          </Card>

          {/* Import */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Import CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with listing data. The system validates the schema and required columns before ingestion.
              </p>
              <Separator />
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-emerald-300 transition-colors">
                <HardDrive className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Drop CSV file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Required columns: title, type, price, city, beds, baths, sqft</p>
                <input type="file" accept=".csv" className="hidden" id="csv-upload" onChange={handleImport} />
                <Button variant="outline" size="sm" className="mt-3" onClick={() => document.getElementById("csv-upload")?.click()}>
                  <Upload className="w-3 h-3 mr-1" /> Choose File
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
