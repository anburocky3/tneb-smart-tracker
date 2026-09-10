"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Plus,
  LayoutDashboard,
  Home,
  Trash2,
  Search,
  ArrowUpDown,
  ChevronRight,
  Filter,
  RefreshCw,
  Activity,
  Edit2,
  Info,
  ArrowRight,
  LogOut,
  X,
} from "lucide-react";

interface SavedConnection {
  nickname: string;
  consumerNo: string;
  tokenId: string;
  location: string;
}

// Set cache duration to 12 hours (in milliseconds)
const CACHE_TTL = 12 * 60 * 60 * 1000;

export default function MultiPropertyDashboard() {
  const router = useRouter();
  const [connections, setConnections] = useState<SavedConnection[]>([]);

  const [isFetchingDB, setIsFetchingDB] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("All");
  const [sortBy, setSortBy] = useState<
    "name" | "amount_desc" | "units_desc" | "status"
  >("amount_desc");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOldConsumerNo, setEditingOldConsumerNo] = useState("");

  const [newNickname, setNewNickname] = useState("");
  const [newConsumerNo, setNewConsumerNo] = useState("");
  const [newTokenId, setNewTokenId] = useState("");
  const [newLocation, setNewLocation] = useState("");

  // Refs
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null); // NEW: Dedicated ref for the scrolling container
  const [showTokenGuide, setShowTokenGuide] = useState(false);

  const [dashboardSummaries, setDashboardSummaries] = useState<
    Record<string, any>
  >({});

  const [toastMsg, setToastMsg] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setIsToastVisible(true), 10);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    toastTimeoutRef.current = setTimeout(() => {
      setIsToastVisible(false);
    }, 4500);

    hideTimeoutRef.current = setTimeout(() => {
      setToastMsg("");
    }, 5000);
  };

  useEffect(() => {
    if (bookmarkletRef.current) {
      fetch("/api/bookmarklet")
        .then((response) => response.text())
        .then((data) => {
          bookmarkletRef.current!.href = data;
        });
    }
  }, [showTokenGuide]);

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const res = await fetch("/api/connections");
        const data = await res.json();
        if (Array.isArray(data)) {
          setConnections(data);
          fetchAllSummaries(data);
        }
      } catch (error) {
        console.error("Failed to load connections:", error);
      } finally {
        setIsFetchingDB(false);
      }
    };
    loadConnections();
  }, []);

  const availableLocations = useMemo(() => {
    return Array.from(new Set(connections.map((c) => c.location?.trim())))
      .filter(Boolean)
      .sort();
  }, [connections]);

  const scrollToTop = () => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openAddForm = () => {
    setIsEditing(false);
    setNewNickname("");
    setNewConsumerNo("");
    setNewTokenId("");
    setNewLocation("");
    setIsFormOpen(true);
    scrollToTop(); // Use the new scroll function
  };

  const openEditForm = (conn: SavedConnection) => {
    setIsEditing(true);
    setEditingOldConsumerNo(conn.consumerNo);
    setNewNickname(conn.nickname);
    setNewConsumerNo(conn.consumerNo);
    setNewTokenId(conn.tokenId);
    setNewLocation(conn.location);
    setIsFormOpen(true);
    scrollToTop(); // Use the new scroll function
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNickname || !newConsumerNo || !newTokenId || !newLocation) return;

    const payload = {
      nickname: newNickname.trim(),
      consumerNo: newConsumerNo.trim(),
      tokenId: newTokenId.trim(),
      location: newLocation.trim(),
    };

    try {
      if (isEditing) {
        await fetch("/api/connections", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            oldConsumerNo: editingOldConsumerNo,
          }),
        });

        if (editingOldConsumerNo !== payload.consumerNo) {
          localStorage.removeItem(`tneb_data_${editingOldConsumerNo}`);
        }

        setConnections((prev) =>
          prev.map((c) =>
            c.consumerNo === editingOldConsumerNo ? payload : c,
          ),
        );
      } else {
        await fetch("/api/connections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setConnections((prev) => [...prev, payload]);
      }

      setIsFormOpen(false);
      fetchSingleSummary(payload, true);
    } catch (error) {
      console.error("Failed to save connection:", error);
    }
  };

  const handleLogout = async () => {
    // ⚠️ NEW: Add confirmation dialog
    if (
      !window.confirm(
        "Are you sure you want to securely lock the workspace and log out?",
      )
    ) {
      return;
    }

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      sessionStorage.removeItem("tneb_auth");
      window.location.reload();
    } catch (error) {
      console.error("Failed to log out");
    }
  };

  const removeConnection = async (consumerNo: string) => {
    if (!confirm("Are you sure you want to remove this meter?")) return;
    try {
      await fetch(`/api/connections?consumerNo=${consumerNo}`, {
        method: "DELETE",
      });
      setConnections((prev) => prev.filter((c) => c.consumerNo !== consumerNo));
      localStorage.removeItem(`tneb_data_${consumerNo}`);
    } catch (error) {
      console.error("Failed to delete connection", error);
    }
  };

  const fetchSingleSummary = async (
    conn: SavedConnection,
    forceRefresh = false,
  ) => {
    try {
      const cacheKey = `tneb_data_${conn.consumerNo}`;

      if (!forceRefresh) {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          const { data, timestamp } = JSON.parse(cachedStr);
          if (Date.now() - timestamp < CACHE_TTL) {
            setDashboardSummaries((prev) => ({
              ...prev,
              [conn.consumerNo]: data,
            }));

            showToast(
              "Loaded from cache. For real-time data, tap force refresh.",
            );
            return;
          }
        }
      }

      const res = await fetch("/api/tneb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumerNo: conn.consumerNo,
          tokenId: conn.tokenId,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setDashboardSummaries((prev) => ({
          ...prev,
          [conn.consumerNo]: result,
        }));

        if (forceRefresh) {
          showToast(`Fetched live data for ${conn.consumerNo}. Cache updated.`);
        }

        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data: result, timestamp: Date.now() }),
        );
      }
    } catch (error) {
      console.error("Failed summary for", conn.consumerNo);
    }
  };

  const fetchAllSummaries = async (
    conns: SavedConnection[],
    forceRefresh = false,
  ) => {
    await Promise.all(
      conns.map((conn) => fetchSingleSummary(conn, forceRefresh)),
    );
  };

  const handleForceUpdate = async () => {
    setIsRefreshing(true);
    await fetchAllSummaries(connections, true);
    setIsRefreshing(false);
  };

  const filteredAndSortedConnections = useMemo(() => {
    return connections
      .filter((conn) => {
        const matchesLocation =
          selectedLocation === "All" ||
          conn.location.toLowerCase() === selectedLocation.toLowerCase();
        const matchesSearch =
          conn.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conn.consumerNo.includes(searchQuery) ||
          conn.location.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesLocation && matchesSearch;
      })
      .sort((a, b) => {
        const dataA = dashboardSummaries[a.consumerNo]?.bills?.[0];
        const dataB = dashboardSummaries[b.consumerNo]?.bills?.[0];
        if (sortBy === "amount_desc")
          return (dataB?.amount ?? 0) - (dataA?.amount ?? 0);
        if (sortBy === "units_desc")
          return (dataB?.units ?? 0) - (dataA?.units ?? 0);
        if (sortBy === "status")
          return (
            (dataB && !dataB.isPaid ? 1 : 0) - (dataA && !dataA.isPaid ? 1 : 0)
          );
        return a.nickname.localeCompare(b.nickname);
      });
  }, [connections, selectedLocation, searchQuery, sortBy, dashboardSummaries]);

  const groupedByLocation = useMemo(() => {
    const groups: Record<string, SavedConnection[]> = {};
    filteredAndSortedConnections.forEach((conn) => {
      const loc = conn.location || "Unassigned Location";
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(conn);
    });
    return groups;
  }, [filteredAndSortedConnections]);

  if (isFetchingDB) {
    return (
      <div className="min-h-[100dvh] bg-[#f8fafc] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-500 font-medium">
          Loading your data from database...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="w-72 bg-white border-r border-slate-100 shrink-0 hidden md:flex flex-col h-full z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <Zap className="text-yellow-500 fill-yellow-500 w-6 h-6 shrink-0" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate">
            EB Smart Tracker
          </h1>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-6 scrollbar-hide">
          <button
            onClick={() => {
              setIsFormOpen(false);
              setSelectedLocation("All");
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-sm font-semibold bg-indigo-600 text-white shadow-md shadow-indigo-200"
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500 text-white">
              {connections.length}
            </span>
          </button>

          {connections.length > 0 && (
            <div className="space-y-4">
              <div className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Locations
              </div>
              {availableLocations.map((loc) => {
                const metersInLoc = connections.filter(
                  (c) => c.location === loc,
                );
                return (
                  <div key={loc} className="space-y-1">
                    <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{loc}</span>
                      <span className="ml-auto text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md font-mono shrink-0">
                        {metersInLoc.length}
                      </span>
                    </div>
                    <div className="pl-4 space-y-0.5 border-l-2 border-slate-100 ml-4">
                      {metersInLoc.map((conn) => (
                        <button
                          key={conn.consumerNo}
                          onClick={() =>
                            router.push(`/meter/${conn.consumerNo}`)
                          }
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-xs text-left truncate text-slate-600 hover:bg-slate-50 group"
                        >
                          <span className="truncate">{conn.nickname}</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main
        ref={mainScrollRef}
        className="flex-1 overflow-y-auto pb-28 md:pb-10 relative scroll-smooth h-full"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-[#f8fafc]/90 backdrop-blur-md px-4 py-4 md:px-10 md:py-6 border-b border-slate-100 md:border-none">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Zap className="text-yellow-500 fill-yellow-500 w-6 h-6 md:hidden shrink-0" />
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                  EB Smart Dashboard
                </h2>
                <p className="text-slate-500 text-xs md:text-sm mt-0.5 md:mt-1 truncate max-w-[280px] sm:max-w-md">
                  Multi-location consumption tracking
                </p>
              </div>
            </div>

            {/* Top Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
              {connections.length > 0 && (
                <>
                  <div className="relative w-full sm:w-64 md:w-48">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      id="search-input" // ⚠️ Used for focusing from bottom nav
                      type="text"
                      placeholder="Search meter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm text-sm">
                      <ArrowUpDown className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent outline-none text-slate-700 font-medium cursor-pointer w-full"
                      >
                        <option value="amount_desc">Highest Bill</option>
                        <option value="units_desc">Highest Units</option>
                        <option value="status">Pending Dues</option>
                        <option value="name">Name (A-Z)</option>
                      </select>
                    </div>

                    <button
                      onClick={handleForceUpdate}
                      disabled={isRefreshing}
                      className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition disabled:opacity-50 shrink-0"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-500" : ""}`}
                      />
                    </button>
                  </div>
                </>
              )}

              {/* Desktop Only Add Button */}
              <button
                onClick={openAddForm}
                className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-sm hover:bg-indigo-700 transition shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Connection
              </button>
            </div>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="max-w-7xl mx-auto px-4 md:px-10 mt-6 space-y-8">
          {/* Horizontal Scrolling Location Pills */}
          {connections.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none overscroll-x-contain snap-x">
              <Filter className="w-4 h-4 text-slate-400 mr-1 shrink-0 snap-start" />
              <button
                onClick={() => setSelectedLocation("All")}
                className={`px-4 py-2 md:py-1.5 rounded-full text-xs font-semibold whitespace-nowrap snap-start shrink-0 ${selectedLocation === "All" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-sm"}`}
              >
                All Locations
              </button>
              {availableLocations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={`px-4 py-2 md:py-1.5 rounded-full text-xs font-semibold whitespace-nowrap snap-start shrink-0 ${selectedLocation === loc ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-sm"}`}
                >
                  {loc}
                </button>
              ))}
            </div>
          )}

          {/* Form Area */}
          {isFormOpen && (
            <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-indigo-100 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg md:text-xl text-slate-800">
                  {isEditing ? "Edit Profile" : "Link New Meter"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTokenGuide(!showTokenGuide)}
                  className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-2 rounded-xl transition-colors"
                >
                  <Info className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">
                    How to find Token ID?
                  </span>
                  <span className="sm:hidden">Token Guide</span>
                </button>
              </div>

              {showTokenGuide && (
                <div className="mb-8 p-4 md:p-5 bg-slate-50 border border-slate-200 rounded-2xl select-none">
                  <h4 className="font-bold text-slate-800 mb-2 text-sm md:text-base">
                    Extract Tokens Instantly
                  </h4>
                  <p className="text-xs md:text-sm text-slate-600 mb-4">
                    Use our bookmarklet to extract Consumer Numbers and Token
                    IDs from the TNEB Quick Pay portal.
                  </p>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex items-center w-full md:w-auto">
                      <a
                        ref={bookmarkletRef}
                        draggable="true"
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-3 md:px-6 bg-indigo-600 text-white font-bold rounded-xl shadow-md cursor-grab active:cursor-grabbing inline-flex items-center justify-center gap-2 hover:bg-indigo-700 transition w-full md:w-auto text-sm md:text-base"
                        title="TNEB Extractor"
                      >
                        <Zap className="w-4 h-4 md:w-5 md:h-5 fill-yellow-400 text-yellow-400 shrink-0" />
                        TNEB Extractor
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        fetch("/api/bookmarklet")
                          .then((res) => res.text())
                          .then((src) => navigator.clipboard.writeText(src))
                          .then(() =>
                            alert("Copied! Paste into a new bookmark URL."),
                          )
                          .catch(() => alert("Failed to load code."));
                      }}
                      className="px-4 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-300 transition text-xs flex items-center justify-center gap-2 w-full md:w-fit"
                    >
                      Copy Raw Code Instead
                    </button>
                  </div>

                  <ol className="text-xs md:text-sm text-slate-600 space-y-2 mt-4 ml-1">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 mt-1 shrink-0" />
                      <span>
                        <strong>1.</strong> Drag button to bookmarks bar.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 mt-1 shrink-0" />
                      <span>
                        <strong>2.</strong> Log in to{" "}
                        <a
                          href="https://www.tnebnet.org/awp/login"
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 underline"
                        >
                          tnebnet.org
                        </a>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 mt-1 shrink-0" />
                      <span>
                        <strong>3.</strong> Click the bookmark on that page.
                      </span>
                    </li>
                  </ol>
                </div>
              )}

              <form
                onSubmit={handleFormSubmit}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">
                    Location / Sub-division
                  </label>
                  <input
                    type="text"
                    list="location-options"
                    placeholder="e.g. Avadi"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                    required
                  />
                  <datalist id="location-options">
                    {availableLocations.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">
                    Nickname
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shop #1"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">
                    Consumer Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 09049..."
                    value={newConsumerNo}
                    onChange={(e) => setNewConsumerNo(e.target.value)}
                    className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">
                    Token ID
                  </label>
                  <input
                    type="text"
                    placeholder="Paste token"
                    value={newTokenId}
                    onChange={(e) => setNewTokenId(e.target.value)}
                    className="w-full px-4 py-3 md:py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm font-mono"
                    required
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-4 flex flex-col-reverse sm:flex-row justify-end gap-3 mt-2 md:mt-4 md:border-t border-slate-100 md:pt-4">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-6 py-3 md:py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 sm:bg-transparent sm:hover:bg-transparent sm:hover:text-slate-800 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 md:py-2.5 bg-slate-900 text-white font-medium text-sm rounded-xl hover:bg-slate-800 transition shadow-md"
                  >
                    {isEditing ? "Save Changes" : "Save Connection"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* EMPTY STATE */}
          {connections.length === 0 && !isFormOpen && (
            <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl p-8 md:p-16 text-center shadow-sm mx-2">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <Zap className="w-8 h-8 md:w-10 md:h-10 text-indigo-300" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">
                No Services Linked
              </h3>
              <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-8 max-w-sm">
                Add a TNEB connection to start tracking consumption, arrears,
                and subsidies.
              </p>
              <button
                onClick={openAddForm}
                className="w-full md:w-auto px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Link New Meter
              </button>
            </div>
          )}

          {/* Render Location Groups */}
          {Object.entries(groupedByLocation).map(([locName, meterList]) => {
            const totalUnits = meterList.reduce(
              (acc, c) =>
                acc +
                (dashboardSummaries[c.consumerNo]?.bills?.[0]?.units || 0),
              0,
            );
            const totalBilled = meterList.reduce(
              (acc, c) =>
                acc +
                (dashboardSummaries[c.consumerNo]?.bills?.[0]?.amount || 0),
              0,
            );

            return (
              <section key={locName} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 shrink-0" />
                    <h3 className="font-bold text-base md:text-lg text-slate-800 truncate">
                      {locName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] md:text-xs text-slate-500 bg-slate-100 sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-lg w-fit">
                    <span>
                      Units:{" "}
                      <strong className="text-slate-800">{totalUnits}</strong>
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>
                      Total:{" "}
                      <strong className="text-slate-800">
                        ₹{totalBilled.toLocaleString()}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                  {meterList.map((conn) => {
                    const data = dashboardSummaries[conn.consumerNo];
                    const latestBill = data?.bills?.[0];

                    return (
                      <div
                        key={conn.consumerNo}
                        onClick={() => router.push(`/meter/${conn.consumerNo}`)}
                        className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer relative group flex flex-col active:scale-[0.98]"
                      >
                        {/* Action Buttons */}
                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all bg-white/80 backdrop-blur-sm rounded-xl pl-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditForm(conn);
                            }}
                            className="p-2.5 md:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeConnection(conn.consumerNo);
                            }}
                            className="p-2.5 md:p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-start gap-3.5 mb-5 pr-16 md:pr-0">
                          <div className="p-2.5 md:p-3 bg-indigo-50/70 text-indigo-600 rounded-xl md:rounded-2xl shrink-0">
                            <Home className="w-4 h-4 md:w-5 md:h-5" />
                          </div>
                          <div className="space-y-0.5 overflow-hidden">
                            <h4 className="font-bold text-sm md:text-base text-slate-900 leading-snug truncate">
                              {conn.nickname}
                            </h4>
                            <p className="text-[11px] md:text-xs text-slate-400 font-mono truncate">
                              {conn.consumerNo}
                            </p>
                          </div>
                        </div>

                        <div className="mt-auto">
                          {!data ? (
                            <div className="animate-pulse flex items-center gap-2 text-slate-400 text-xs py-3 border-t border-slate-50">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500 shrink-0" />
                              Fetching from cache...
                            </div>
                          ) : latestBill ? (
                            <div className="space-y-3 md:space-y-4 border-t border-slate-50 pt-3 md:pt-4">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <p className="text-[10px] md:text-xs text-slate-400 mb-0.5">
                                    Bill ({latestBill.date})
                                  </p>
                                  <p className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                                    ₹{latestBill.amount.toLocaleString()}
                                  </p>
                                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-md">
                                    <Activity className="w-3 h-3 text-indigo-500" />
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                      Use:{" "}
                                      <span className="text-slate-800 ml-0.5">
                                        {latestBill.units} kWh
                                      </span>
                                    </span>
                                  </div>
                                </div>

                                {latestBill.amount === 0 ? (
                                  <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-emerald-600 bg-emerald-50 px-2 md:px-2.5 py-1 rounded-lg uppercase whitespace-nowrap">
                                    <ShieldCheck className="w-3 h-3 md:w-3.5 md:h-3.5" />{" "}
                                    Free
                                  </span>
                                ) : latestBill.isPaid ? (
                                  <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-slate-600 bg-slate-100 px-2 md:px-2.5 py-1 rounded-lg uppercase whitespace-nowrap">
                                    <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-500" />{" "}
                                    Paid
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-rose-600 bg-rose-50 px-2 md:px-2.5 py-1 rounded-lg uppercase animate-pulse whitespace-nowrap">
                                    <AlertCircle className="w-3 h-3 md:w-3.5 md:h-3.5" />{" "}
                                    Due
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] md:text-xs text-slate-400 py-2 border-t border-slate-50 pt-3">
                              No bills recorded yet.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 flex items-end justify-around pb-6 pt-2 px-2 z-50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <button
          onClick={() => {
            setIsFormOpen(false);
            scrollToTop();
          }}
          className="flex flex-col items-center justify-center p-2 w-16 text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <Home className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        <button
          onClick={handleForceUpdate}
          disabled={isRefreshing}
          className="flex flex-col items-center justify-center p-2 w-16 text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <RefreshCw
            className={`w-5 h-5 mb-1 ${isRefreshing ? "animate-spin text-indigo-500" : ""}`}
          />
          <span className="text-[10px] font-semibold">Refresh</span>
        </button>

        {/* Floating Action Button (FAB) */}
        <button
          onClick={openAddForm}
          className="relative flex flex-col items-center justify-center -translate-y-4 group"
        >
          <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 ring-4 ring-white group-active:scale-95 transition-all">
            <Plus className="w-7 h-7" />
          </div>
          <span className="text-[10px] font-semibold text-slate-700 absolute -bottom-5 whitespace-nowrap">
            Add Meter
          </span>
        </button>

        <button
          onClick={() => {
            scrollToTop();
            setTimeout(
              () => document.getElementById("search-input")?.focus(),
              300,
            );
          }}
          className="flex flex-col items-center justify-center p-2 w-16 text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <Filter className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-semibold">Filters</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center p-2 w-16 text-slate-500 hover:text-rose-500 transition-colors"
        >
          <LogOut className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-semibold">Logout</span>
        </button>
      </nav>

      {/* Animated Toast */}
      {/* Positioned higher on mobile to avoid the bottom navigation bar */}
      {toastMsg && (
        <div
          className={`fixed bottom-28 md:bottom-6 right-4 md:right-6 z-50 bg-slate-900/95 backdrop-blur text-white px-4 md:px-5 py-3 md:py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-500 ease-out transform max-w-[90vw] md:max-w-sm ${
            isToastVisible
              ? "translate-y-0 opacity-100 scale-100"
              : "translate-y-8 opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <Info className="w-5 h-5 text-indigo-400 shrink-0" />
          <p className="text-xs md:text-sm font-medium leading-snug flex-1">
            {toastMsg}
          </p>
          <button
            onClick={() => setIsToastVisible(false)}
            className="p-1 text-slate-400 hover:text-white transition-colors shrink-0 bg-white/10 rounded-full"
          >
            <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
