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

  // Bookmarklet guide state
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);
  const [showTokenGuide, setShowTokenGuide] = useState(false);

  const [dashboardSummaries, setDashboardSummaries] = useState<
    Record<string, any>
  >({});

  const [toastMsg, setToastMsg] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    // 1. Set the message so the element renders in the DOM
    setToastMsg(msg);

    // 2. A tiny delay ensures the element is in the DOM before we trigger the CSS transition
    setTimeout(() => setIsToastVisible(true), 10);

    // Clear any existing timers if the user triggers the toast rapidly
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    // 3. Trigger the exit animation after 4.5 seconds
    toastTimeoutRef.current = setTimeout(() => {
      setIsToastVisible(false);
    }, 4500);

    // 4. Completely remove it from the DOM after the 500ms exit animation finishes
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

  const openAddForm = () => {
    setIsEditing(false);
    setNewNickname("");
    setNewConsumerNo("");
    setNewTokenId("");
    setNewLocation("");
    setIsFormOpen(true);
  };

  const openEditForm = (conn: SavedConnection) => {
    setIsEditing(true);
    setEditingOldConsumerNo(conn.consumerNo);
    setNewNickname(conn.nickname);
    setNewConsumerNo(conn.consumerNo);
    setNewTokenId(conn.tokenId);
    setNewLocation(conn.location);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

        // Clean up old cache if consumer number changed
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
      fetchSingleSummary(payload, true); // Force refresh to get fresh data on save
    } catch (error) {
      console.error("Failed to save connection:", error);
    }
  };

  const handleLogout = async () => {
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
      localStorage.removeItem(`tneb_data_${consumerNo}`); // Clean up cache
    } catch (error) {
      console.error("Failed to delete connection", error);
    }
  };

  // Upgraded to handle caching and forced refreshes
  const fetchSingleSummary = async (
    conn: SavedConnection,
    forceRefresh = false,
  ) => {
    try {
      const cacheKey = `tneb_data_${conn.consumerNo}`;

      // 1. Check Cache (Skip if forceRefresh is true)
      if (!forceRefresh) {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          const { data, timestamp } = JSON.parse(cachedStr);
          // If cache is valid (less than 12 hours old), use it and skip API call
          if (Date.now() - timestamp < CACHE_TTL) {
            setDashboardSummaries((prev) => ({
              ...prev,
              [conn.consumerNo]: data,
            }));

            // ⚠️ TRIGGER TOAST HERE
            showToast(
              "Loading from cache, if you want real data, do force update",
            );

            return;
          }
        }
      }

      // 2. Fetch Live Data
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
        // 3. Save to State and update Cache
        setDashboardSummaries((prev) => ({
          ...prev,
          [conn.consumerNo]: result,
        }));

        showToast(
          "Fetched live data for " + conn.consumerNo + ". Cache updated.",
        );

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
    await fetchAllSummaries(connections, true); // Pass true to bypass cache
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
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-500 font-medium">
          Loading your data from database...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 shrink-0 flex flex-col h-screen sticky top-0 md:flex">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <Zap className="text-yellow-500 fill-yellow-500 w-6 h-6" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Smart EB Tracker
          </h1>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          <button className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-sm font-semibold bg-indigo-600 text-white shadow-md shadow-indigo-200">
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
                Locations & Meters
              </div>
              {availableLocations.map((loc) => {
                const metersInLoc = connections.filter(
                  (c) => c.location === loc,
                );
                return (
                  <div key={loc} className="space-y-1">
                    <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="truncate">{loc}</span>
                      <span className="ml-auto text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md font-mono">
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
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
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
      <main className="flex-1 p-6 md:p-10 overflow-y-auto relative">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Smart EB Tracker
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Multi-location consumption tracking and arrears prevention.
              </p>
            </div>

            {/* MOBILE ONLY LOGOUT BUTTON */}
            <button
              onClick={handleLogout}
              className="md:hidden flex items-center justify-center p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors shrink-0 ml-4"
              title="Lock Workspace"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <div className="flex flex-wrap items-center gap-3">
              {connections.length > 0 && (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search meter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none w-48"
                    />
                  </div>

                  <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm text-sm">
                    <ArrowUpDown className="w-4 h-4 text-slate-400 mr-2" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-transparent outline-none text-slate-700 font-medium cursor-pointer"
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
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-500" : ""}`}
                    />
                  </button>
                </>
              )}

              <button
                onClick={openAddForm}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-sm hover:bg-indigo-700 transition"
              >
                <Plus className="w-4 h-4" /> Add Connection
              </button>
            </div>
          </div>

          {connections.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <Filter className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
              <button
                onClick={() => setSelectedLocation("All")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${selectedLocation === "All" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
              >
                All Locations
              </button>
              {availableLocations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${selectedLocation === loc ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
                >
                  {loc}
                </button>
              ))}
            </div>
          )}

          {/* Form Area */}
          {isFormOpen && (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-indigo-100 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-xl text-slate-800">
                  {isEditing
                    ? "Edit Connection Profile"
                    : "Link Meter to Location"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTokenGuide(!showTokenGuide)}
                  className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-xl transition-colors"
                >
                  <Info className="w-4 h-4" /> How to find Token ID?
                </button>
              </div>

              {/* Bookmarklet Helper Section */}
              {showTokenGuide && (
                <div className="mb-8 p-5 bg-slate-50 border border-slate-200 rounded-2xl select-none">
                  <h4 className="font-bold text-slate-800 mb-2">
                    Extract TNEB Tokens Instantly
                  </h4>
                  <p className="text-sm text-slate-600 mb-4">
                    Use our custom bookmarklet to extract all your Consumer
                    Numbers and Token IDs directly from the TNEB Quick Pay
                    portal.
                  </p>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex items-center">
                      <a
                        ref={bookmarkletRef}
                        draggable="true"
                        target="_blank"
                        rel="noreferrer"
                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md cursor-grab active:cursor-grabbing inline-flex items-center gap-2 hover:bg-indigo-700 transition w-full md:w-auto justify-center"
                        title="TNEB Extractor"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="#facc15"
                          stroke="#facc15"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        TNEB Extractor
                      </a>
                      <span className="ml-4 text-sm font-semibold text-indigo-600 animate-pulse hidden md:inline-block">
                        ← Drag to Bookmarks Bar
                      </span>
                    </div>

                    {/* Fallback Copy Button */}
                    <button
                      type="button"
                      onClick={() => {
                        fetch("/api/bookmarklet")
                          .then((response) => response.text())
                          .then((source) =>
                            navigator.clipboard.writeText(source),
                          )
                          .then(() => {
                            alert(
                              "Raw Bookmarklet code copied! You can now paste this into a new bookmark's URL field.",
                            );
                          })
                          .catch(() => {
                            alert("Unable to load the bookmarklet code.");
                          });
                      }}
                      className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-300 transition text-xs flex items-center justify-center gap-2 w-full md:w-fit"
                    >
                      Copy Raw Code Instead
                    </button>

                    <ol className="text-sm text-slate-600 space-y-1 ml-2">
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" /> <strong>1.</strong>{" "}
                        Drag the button above to your browser's bookmarks bar.
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" /> <strong>2.</strong>{" "}
                        Log in to your account at{" "}
                        <a
                          href="https://www.tnebnet.org/awp/login"
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline cursor-pointer"
                        >
                          www.tnebnet.org
                        </a>
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" /> <strong>3.</strong>{" "}
                        Click the bookmark. An overlay will appear to copy your
                        details!
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              <form
                onSubmit={handleFormSubmit}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Location / Sub-division
                  </label>
                  <input
                    type="text"
                    list="location-options"
                    placeholder="e.g. Avadi - Kamaraj Nagar"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
                    required
                  />
                  <datalist id="location-options">
                    {availableLocations.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Nickname
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shop #1, Floor 2"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Consumer Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 09049114354"
                    value={newConsumerNo}
                    onChange={(e) => setNewConsumerNo(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 font-mono transition-shadow"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Token ID
                  </label>
                  <input
                    type="text"
                    placeholder="Paste extracted token here"
                    value={newTokenId}
                    onChange={(e) => setNewTokenId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 font-mono transition-shadow"
                    required
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-3 mt-4 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-6 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-slate-900 text-white font-medium text-sm rounded-xl hover:bg-slate-800 transition"
                  >
                    {isEditing ? "Save Changes" : "Save Connection"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* EMPTY STATE FALLBACK */}
          {connections.length === 0 && !isFormOpen && (
            <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm animate-in fade-in">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                <Zap className="w-10 h-10 text-indigo-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                No Services Linked
              </h3>
              <p className="text-slate-500 mb-8 max-w-md">
                You haven't linked any TNEB meters yet. Add a connection to
                start tracking your power consumption, arrears, and subsidies.
              </p>
              <button
                onClick={() => setIsFormOpen(true)}
                className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-sm hover:bg-indigo-700 transition flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Link New Meter
              </button>
            </div>
          )}

          {/* Render Groups */}
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
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-lg text-slate-800">
                      {locName}
                    </h3>
                  </div>
                  <div className="text-xs text-slate-500 flex gap-4">
                    <span>
                      Total Consumption:{" "}
                      <strong className="text-slate-800">
                        {totalUnits} units
                      </strong>
                    </span>
                    <span>
                      Cycle Total:{" "}
                      <strong className="text-slate-800">
                        ₹{totalBilled.toLocaleString()}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {meterList.map((conn) => {
                    const data = dashboardSummaries[conn.consumerNo];
                    const latestBill = data?.bills?.[0];

                    return (
                      <div
                        key={conn.consumerNo}
                        onClick={() => router.push(`/meter/${conn.consumerNo}`)}
                        className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer relative group flex flex-col"
                      >
                        {/* Action Buttons Overlay */}
                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditForm(conn);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Edit Property"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeConnection(conn.consumerNo);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Property"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-start gap-3.5 mb-5">
                          <div className="p-3 bg-indigo-50/70 text-indigo-600 rounded-2xl">
                            <Home className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5 pr-6">
                            <h4 className="font-bold text-slate-900 leading-snug truncate">
                              {conn.nickname}
                            </h4>
                            <p className="text-xs text-slate-400 font-mono">
                              {conn.consumerNo}
                            </p>
                          </div>
                        </div>

                        <div className="mt-auto">
                          {!data ? (
                            <div className="animate-pulse flex items-center gap-2 text-slate-400 text-xs py-4">
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />{" "}
                              Fetching...
                            </div>
                          ) : latestBill ? (
                            <div className="space-y-4 border-t border-slate-50 pt-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-xs text-slate-400 mb-1">
                                    Latest Bill ({latestBill.date})
                                  </p>
                                  <p className="text-2xl font-bold text-slate-900 mb-2">
                                    ₹{latestBill.amount.toLocaleString()}
                                  </p>

                                  {/* CURRENT UTILIZATION HIGHLIGHT */}
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md">
                                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                      Utilization:{" "}
                                      <span className="text-slate-800 ml-0.5">
                                        {latestBill.units} kWh
                                      </span>
                                    </span>
                                  </div>
                                </div>

                                {latestBill.amount === 0 ? (
                                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Free
                                  </span>
                                ) : latestBill.isPaid ? (
                                  <span className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg uppercase">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{" "}
                                    Paid
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg uppercase animate-pulse">
                                    <AlertCircle className="w-3.5 h-3.5" /> Due{" "}
                                    {latestBill.dueDate}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 py-2 border-t border-slate-50 pt-4">
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
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-9999 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-500 ease-out transform ${
            isToastVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-10 opacity-0 pointer-events-none"
          }`}
        >
          <Info className="w-5 h-5 text-indigo-400 shrink-0" />
          <p className="text-sm font-medium">{toastMsg}</p>
          <button
            onClick={() => setIsToastVisible(false)} // Triggers exit animation early
            className="text-slate-400 hover:text-white ml-2 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
