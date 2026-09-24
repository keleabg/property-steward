import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Database, LayoutDashboard, Inbox, Terminal, RefreshCw } from "lucide-react";
import { Toaster } from "sonner";
import { HeroSection, type ViewTarget } from "@/components/HeroSection";
import { InventoryManager } from "@/components/InventoryManager";
import { InquiriesManager } from "@/components/InquiriesManager";
import { CrawlerConsole } from "@/components/CrawlerConsole";
import { SyncAndLogs } from "@/components/SyncAndLogs";
import { fetchListings, type Listing } from "@/services/propertyService";

const TABS: { key: ViewTarget; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "inventory", label: "Inventory", icon: LayoutDashboard },
  { key: "inquiries", label: "Inquiries", icon: Inbox },
  { key: "crawler", label: "Crawler", icon: Terminal },
  { key: "sync", label: "Sync & Logs", icon: Database },
];

export default function App() {
  const [view, setView] = useState<ViewTarget>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadListings = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setListings(await fetchListings());
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const refresh = () => {
    if (view === "inventory" || view === "inquiries" || view === "sync" || view === null) loadListings();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Toaster position="top-right" richColors closeButton />

      <HeroSection
        listings={listings}
        loading={loading}
        onNavigate={(t) => setView(t)}
        onSearch={() => setView("inventory")}
      />

      {view !== null && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tab bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-border/60 shadow-sm">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setView(t.key)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    view === t.key ? "text-emerald-700" : "text-muted-foreground hover:text-slate-700"
                  }`}
                >
                  {view === t.key && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-0 bg-emerald-50 border border-emerald-200 rounded-lg"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <t.icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{t.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={refresh}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Syncing..." : "Refresh data"}
            </button>
          </div>

          {loadError && view !== "crawler" && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
              <span>Could not load data: {loadError}</span>
              <button onClick={loadListings} className="font-medium underline">
                Retry
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {view === "inventory" && <InventoryManager listings={listings} onListingsChange={setListings} />}
              {view === "inquiries" && <InquiriesManager listings={listings} />}
              {view === "crawler" && <CrawlerConsole />}
              {view === "sync" && <SyncAndLogs listings={listings} />}
            </motion.div>
          </AnimatePresence>
        </main>
      )}
    </div>
  );
}
