import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Search, MapPin, ChevronDown, Menu, X, ShieldCheck,
  Database, Terminal, Sparkles, Building2, LayoutDashboard,
  SlidersHorizontal, Wallet, BedDouble,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDistinctCities, type Listing } from "@/services/propertyService";

export type ViewTarget = "inventory" | "inquiries" | "crawler" | "sync" | null;

interface HeroSectionProps {
  listings: Listing[];
  loading: boolean;
  onNavigate: (target: ViewTarget) => void;
  onSearch: () => void;
}

const NAV_LINKS = ["Home", "Properties", "For Sale", "For Rent", "About Us"] as const;

const HERO_SLIDES = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&q=80",
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1920&q=80",
];

const BED_OPTIONS = ["Any Beds", "1 Bed", "2 Beds", "3 Beds", "4 Beds", "5+ Beds"] as const;

const QUICK_TAGS = ["For Sale", "For Rent", "Luxury Homes", "Family Homes", "Condos"];

function SearchPanel({ listings, onSearch }: { listings: Listing[]; onSearch: () => void }) {
  const [status, setStatus] = useState<"All" | "sale" | "rent">("All");
  const [location, setLocation] = useState<string>("All");
  const [beds, setBeds] = useState<string>("Any Beds");
  const [query, setQuery] = useState("");

  const cities = useMemo(() => getDistinctCities(listings), [listings]);

  const matchCount = useMemo(() => {
    let list = listings;
    if (status !== "All") list = list.filter((l) => l.type === status);
    if (location !== "All") list = list.filter((l) => l.city === location);
    if (beds !== "Any Beds") {
      const min = Number(beds.split(" ")[0]);
      list = list.filter((l) => (beds === "5+ Beds" ? l.beds >= 5 : l.beds === min));
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((l) => l.title.toLowerCase().includes(q) || l.city.toLowerCase().includes(q));
    }
    return list.length;
  }, [listings, status, location, beds, query]);

  const selectClasses =
    "w-full appearance-none bg-transparent text-slate-800 text-sm font-medium outline-none cursor-pointer pr-6 truncate";
  const labelClasses = "text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1";

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md rounded-t-2xl px-2 pt-2 border border-slate-700/60 border-b-0 w-fit mx-auto">
        {(["All", "sale", "rent"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all relative ${
              status === s ? "text-emerald-400 bg-slate-950/60" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {s === "All" ? "All Listings" : s === "sale" ? "For Sale" : "For Rent"}
            {status === s && (
              <motion.div layoutId="status-underline" className="absolute bottom-0 left-3 right-3 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Main search form */}
      <div className="bg-white rounded-2xl rounded-tl-none shadow-2xl shadow-emerald-950/30 p-3 md:p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Keyword */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 lg:col-span-1 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className={labelClasses}>Keyword</p>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search listings..."
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Location */}
          <div className="relative bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            <p className={labelClasses}>
              <MapPin className="w-3 h-3" /> Location
            </p>
            <select value={location} onChange={(e) => setLocation(e.target.value)} className={selectClasses}>
              <option value="All">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 translate-y-1/3 pointer-events-none" />
          </div>

          {/* Bedrooms */}
          <div className="relative bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            <p className={labelClasses}>
              <BedDouble className="w-3 h-3" /> Bedrooms
            </p>
            <select value={beds} onChange={(e) => setBeds(e.target.value)} className={selectClasses}>
              {BED_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 translate-y-1/3 pointer-events-none" />
          </div>

          {/* Search button */}
          <div className="flex items-end">
            <Button
              onClick={onSearch}
              className="w-full h-full min-h-[52px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition"
            >
              <Search className="w-5 h-5 mr-2" />
              Search
            </Button>
          </div>
        </div>

        {/* Count */}
        <div className="mt-3 flex items-center gap-3">
          <motion.div
            key={matchCount}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 text-sm text-slate-600"
          >
            <span className="font-bold text-emerald-700">{matchCount.toLocaleString()}</span> properties match
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection({ listings, loading, onNavigate, onSearch }: HeroSectionProps) {
  const reduceMotion = useReducedMotion();
  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const stats = useMemo(() => {
    const total = listings.length;
    const sale = listings.filter((l) => l.type === "sale").length;
    const rent = listings.filter((l) => l.type === "rent").length;
    const portfolio = Math.round(listings.reduce((sum, l) => sum + (l.type === "rent" ? l.price * 12 : l.price), 0) / 1_000_000);
    return { total, sale, rent, portfolio };
  }, [listings]);

  return (
    <section className="relative min-h-[100dvh] flex flex-col overflow-hidden bg-slate-950 text-white">
      {/* Background carousel */}
      <div className="absolute inset-0">
        <AnimatePresence>
          <motion.img
            key={activeSlide}
            src={HERO_SLIDES[activeSlide]}
            alt="Luxury property"
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 1.2, ease: "easeInOut" }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/55 to-slate-950/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-slate-950/40" />
      </div>

      {/* Header */}
      <header className="relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top utility bar */}
          <div className="hidden lg:flex items-center justify-between py-2.5 border-b border-white/10 text-xs text-slate-300">
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {getDistinctCities(listings).length} Cities Indexed
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Live Database Connected
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-500">|</span>
              <a href="mailto:info@alphahomes.co" className="hover:text-emerald-300 transition">
                info@alphahomes.co
              </a>
            </div>
          </div>

          {/* Main nav */}
          <nav className="flex items-center justify-between gap-4 py-4">
            {/* Brand */}
            <a href="#" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-900/40 group-hover:scale-105 transition">
                <Building2 className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <div className="leading-tight">
                <p className="font-bold text-lg tracking-tight">
                  Alpha<span className="text-emerald-400">Homes</span>
                </p>
                <p className="text-[10px] text-slate-400 tracking-widest uppercase">Property Manager</p>
              </div>
            </a>

            {/* Desktop links */}
            <ul className="hidden lg:flex items-center gap-7 text-sm font-medium">
              {NAV_LINKS.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className={`hover:text-emerald-300 transition relative py-1 ${link === "Home" ? "text-white" : "text-slate-300"}`}
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>

            {/* Actions */}
            <div className="hidden lg:flex items-center gap-3">
              <Button
                onClick={() => onNavigate("inventory")}
                className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border border-white/15 rounded-xl h-10 px-4 text-sm font-medium"
              >
                <LayoutDashboard className="w-4 h-4 mr-2 text-emerald-400" />
                Inventory
              </Button>
              <Button
                onClick={() => onNavigate("crawler")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 px-4 text-sm font-semibold shadow-lg shadow-emerald-900/40"
              >
                <Terminal className="w-4 h-4 mr-2" />
                Crawler Console
              </Button>
            </div>

            {/* Mobile toggle */}
            <div className="flex lg:hidden items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => onNavigate("inventory")} className="text-white hover:bg-white/10">
                <LayoutDashboard className="w-5 h-5" />
              </Button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </nav>

          {/* Mobile menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="lg:hidden overflow-hidden"
              >
                <div className="pb-4 space-y-3">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setMobileMenuOpen(false);
                      }}
                      className="block px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-slate-200 transition"
                    >
                      {link}
                    </a>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => onNavigate("inventory")} className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl">
                      <LayoutDashboard className="w-4 h-4 mr-2 text-emerald-400" /> Inventory
                    </Button>
                    <Button onClick={() => onNavigate("crawler")} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
                      <Terminal className="w-4 h-4 mr-2" /> Console
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Hero body */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-10 pt-8 lg:pt-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-8"
        >
          <Badge className="mb-4 bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Live Property Inventory &amp; Inquiries
          </Badge>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-white">
            Manage Your Portfolio in <span className="text-emerald-400 italic">Real Time</span>
          </h1>
          <p className="mt-4 text-slate-300 text-base sm:text-lg max-w-2xl mx-auto">
            {loading
              ? "Connecting to your database..."
              : `${stats.total} listings across ${getDistinctCities(listings).length} cities, with ${stats.sale} for sale and ${stats.rent} for rent — all synced to your live database.`}
          </p>
        </motion.div>

        {/* Search widget */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="w-full"
        >
          <SearchPanel listings={listings} onSearch={onSearch} />
        </motion.div>

        {/* Quick tags */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-5 flex flex-wrap items-center justify-center gap-2"
        >
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Popular:
          </span>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={onSearch}
              className="px-3.5 py-1.5 rounded-full bg-white/8 hover:bg-emerald-500/20 border border-white/15 text-xs text-slate-200 hover:text-white transition backdrop-blur-sm active:scale-95"
            >
              {tag}
            </button>
          ))}
        </motion.div>

        {/* Trust metrics */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md w-full max-w-4xl"
        >
          <div className="bg-slate-950/60 px-5 py-4 flex items-center gap-3">
            <Database className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-lg leading-tight">{stats.total}</p>
              <p className="text-[11px] text-slate-400 leading-tight">Live Listings</p>
            </div>
          </div>
          <div className="bg-slate-950/60 px-5 py-4 flex items-center gap-3">
            <Wallet className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-lg leading-tight">KES {stats.portfolio}M</p>
              <p className="text-[11px] text-slate-400 leading-tight">Portfolio Value</p>
            </div>
          </div>
          <div className="bg-slate-950/60 px-5 py-4 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-lg leading-tight">100%</p>
              <p className="text-[11px] text-slate-400 leading-tight">DB Synced</p>
            </div>
          </div>
          <div className="bg-slate-950/60 px-5 py-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-lg leading-tight">{getDistinctCities(listings).length}</p>
              <p className="text-[11px] text-slate-400 leading-tight">Cities Covered</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Slide selector */}
      <div className="relative z-20 pb-5 flex justify-center gap-2">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveSlide(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${activeSlide === i ? "w-8 bg-emerald-400" : "w-3 bg-white/30 hover:bg-white/50"}`}
          />
        ))}
      </div>
    </section>
  );
}
