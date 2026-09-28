"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Moon,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AdminUser {
  id: string;
  email: string;
  pin: string;
  isActive: boolean;
  createdAt: string | null;
  meterCount: number;
  deviceCount: number;
  readingCount: number;
  devices: Array<{
    endpoint: string;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
  readings: Array<{
    id: string;
    consumerNo: string;
    date: string;
    currentKwh: number;
    cycleStartKwh: number;
    cycleStartDate: string;
  }>;
  meters: Array<{
    id: string;
    nickname: string;
    consumerNo: string;
    location: string;
    tokenId: string;
  }>;
}

interface Overview {
  adminEmail: string;
  metrics: {
    users: number;
    activeUsers: number;
    meters: number;
    devices: number;
    readings: number;
  };
  users: AdminUser[];
}

const avatarColors = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-violet-500",
];

function avatarFor(email: string) {
  const clean = email.replace(/[•*]/g, "");
  const initials = clean.split("@")[0].slice(0, 2).toUpperCase() || "U";
  const hash = [...email].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return { initials, color: avatarColors[hash % avatarColors.length] };
}

function displayDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [dark, setDark] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 6;

  const load = async (shouldReveal = reveal) => {
    setLoading(true);
    const response = await fetch(`/api/super/overview?reveal=${shouldReveal}`);
    if (response.status === 401) {
      router.replace("/super/login");
      return;
    }
    const result = await response.json();
    if (result.success) {
      setOverview(result);
      setSelectedUserId((current) => current || result.users[0]?.id || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase().trim();
    return (
      overview?.users.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.meters.some((meter) =>
            `${meter.nickname} ${meter.consumerNo} ${meter.location}`
              .toLowerCase()
              .includes(query),
          ),
      ) || []
    );
  }, [overview, search]);
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const visibleUsers = filteredUsers.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const selectedUser =
    overview?.users.find((user) => user.id === selectedUserId) ||
    visibleUsers[0];

  const toggleReveal = () => {
    const next = !reveal;
    setReveal(next);
    load(next);
  };
  const logout = async () => {
    await fetch("/api/super/logout", { method: "POST" });
    router.replace("/super/login");
  };
  const deleteUser = async () => {
    if (!selectedUser) return;
    const confirmed = window.confirm(
      `Delete ${selectedUser.email} and all linked meters, readings, devices, and notification history? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/super/overview", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      setSelectedUserId(null);
      await load();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to delete user",
      );
    } finally {
      setDeleting(false);
    }
  };
  const theme = dark
    ? {
        page: "bg-[#0b1020] text-slate-100",
        panel: "border-white/10 bg-white/6",
        muted: "text-slate-400",
        card: "border-white/10 bg-white/8",
        input: "border-white/10 bg-black/20 text-white",
        soft: "border-white/10 bg-white/5",
        grid: "#24304a",
      }
    : {
        page: "bg-slate-50 text-slate-900",
        panel: "border-slate-200 bg-white",
        muted: "text-slate-500",
        card: "border-slate-200 bg-white",
        input: "border-slate-200 bg-white text-slate-900",
        soft: "border-slate-100 bg-slate-50",
        grid: "#e2e8f0",
      };

  if (loading && !overview)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1020] text-indigo-300">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  if (!overview) return null;

  const metricCards = [
    ["Users", overview.metrics.users, Users, "text-indigo-400"],
    ["Active", overview.metrics.activeUsers, Activity, "text-emerald-400"],
    ["Meters", overview.metrics.meters, Zap, "text-amber-400"],
    ["Devices", overview.metrics.devices, Smartphone, "text-violet-400"],
    ["Readings", overview.metrics.readings, ShieldCheck, "text-cyan-400"],
  ] as const;
  const activityData = overview.users.slice(0, 8).map((user) => ({
    name: user.email.split("@")[0].slice(0, 8),
    meters: user.meterCount,
    readings: user.readingCount,
  }));
  const statusData = [
    { name: "Active", value: overview.metrics.activeUsers },
    {
      name: "Inactive",
      value: overview.metrics.users - overview.metrics.activeUsers,
    },
  ];
  const selectedAvatar = selectedUser
    ? avatarFor(selectedUser.email)
    : { initials: "U", color: "bg-indigo-500" };

  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${theme.page}`}
    >
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <header
          className={`mb-5 flex flex-col gap-4 rounded-3xl border p-5 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between ${theme.panel}`}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-500/20 p-3 text-indigo-400">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-400">
                Minnal control room
              </p>
              <h1 className="mt-1 text-2xl font-bold">Super admin dashboard</h1>
              <p className={`mt-1 text-xs ${theme.muted}`}>
                Signed in as {overview.adminEmail}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDark(!dark)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${theme.soft}`}
            >
              {dark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}{" "}
              {dark ? "Light" : "Dark"}
            </button>
            <button
              onClick={() => load()}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${theme.soft}`}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-400"
            >
              <LogOut className="h-4 w-4" /> Exit
            </button>
          </div>
        </header>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {metricCards.map(([label, value, Icon, color]) => (
            <div
              key={label}
              className={`rounded-2xl border p-4 shadow-sm ${theme.card}`}
            >
              <div
                className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-500/10 ${color}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className={`text-xs ${theme.muted}`}>{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </section>
        <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
          <div className={`rounded-3xl border p-5 ${theme.panel}`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Workspace activity</h2>
                <p className={`mt-1 text-xs ${theme.muted}`}>
                  Meters and manual readings by user
                </p>
              </div>
              <Activity className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: dark ? "#94a3b8" : "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: dark ? "#94a3b8" : "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: dark ? "#111827" : "#fff",
                      border: "none",
                      borderRadius: 12,
                      color: dark ? "#fff" : "#111827",
                    }}
                  />
                  <Bar dataKey="meters" fill="#818cf8" radius={[5, 5, 0, 0]} />
                  <Bar
                    dataKey="readings"
                    fill="#34d399"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={`rounded-3xl border p-5 ${theme.panel}`}>
            <h2 className="font-bold">Account health</h2>
            <p className={`mt-1 text-xs ${theme.muted}`}>
              Active versus inactive accounts
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={78}
                    paddingAngle={4}
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={index === 0 ? "#34d399" : "#fb7185"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: dark ? "#111827" : "#fff",
                      border: "none",
                      borderRadius: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={`flex justify-center gap-4 text-xs ${theme.muted}`}>
              <span>
                <i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
                Active {overview.metrics.activeUsers}
              </span>
              <span>
                <i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />
                Inactive {overview.metrics.users - overview.metrics.activeUsers}
              </span>
            </div>
          </div>
        </section>
        <section className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">
          <div className={`rounded-3xl border p-4 ${theme.panel}`}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Users</h2>
                <p className={`text-xs ${theme.muted}`}>
                  {filteredUsers.length} matching accounts
                </p>
              </div>
              <Users className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="relative mb-3">
              <Search
                className={`absolute left-3 top-3 h-4 w-4 ${theme.muted}`}
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search email or meter"
                className={`w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${theme.input}`}
              />
            </div>
            <div className="space-y-2">
              {visibleUsers.map((user) => {
                const avatar = avatarFor(user.email);
                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selectedUserId === user.id ? "border-indigo-400 bg-indigo-500/10" : theme.soft}`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${avatar.color}`}
                    >
                      {avatar.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {user.email}
                      </p>
                      <p className={`mt-1 text-[11px] ${theme.muted}`}>
                        {user.meterCount} meters · {user.readingCount} readings
                      </p>
                    </div>
                    <span
                      className={`h-2 w-2 rounded-full ${user.isActive ? "bg-emerald-400" : "bg-rose-400"}`}
                    />
                  </button>
                );
              })}
            </div>
            <div
              className={`mt-4 flex items-center justify-between border-t pt-3 text-xs ${theme.muted}`}
            >
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg p-1 hover:bg-slate-500/10 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>
                Page {page} of {pageCount}
              </span>
              <button
                disabled={page === pageCount}
                onClick={() => setPage(page + 1)}
                className="rounded-lg p-1 hover:bg-slate-500/10 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className={`min-w-0 rounded-3xl border p-5 ${theme.panel}`}>
            {selectedUser ? (
              <>
                <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white ${selectedAvatar.color}`}
                    >
                      {selectedAvatar.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold">
                          {selectedUser.email}
                        </h2>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedUser.isActive ? "bg-emerald-400/15 text-emerald-400" : "bg-rose-400/15 text-rose-400"}`}
                        >
                          {selectedUser.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className={`mt-1 text-xs ${theme.muted}`}>
                        Joined {displayDate(selectedUser.createdAt)} · PIN{" "}
                        {selectedUser.pin}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={toggleReveal}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${theme.soft}`}
                    >
                      {reveal ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}{" "}
                      {reveal ? "Mask values" : "Reveal values"}
                    </button>
                    <button
                      onClick={deleteUser}
                      disabled={deleting}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleting ? "Deleting..." : "Delete user"}
                    </button>
                  </div>
                </div>
                <div className="grid gap-4 py-5 md:grid-cols-3">
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                      <Zap className="h-4 w-4 text-amber-400" /> Linked meters
                    </h3>
                    {selectedUser.meters.length ? (
                      selectedUser.meters.map((meter) => (
                        <div
                          key={meter.id}
                          className={`mb-2 rounded-2xl border p-3 ${theme.soft}`}
                        >
                          <p className="font-semibold">{meter.nickname}</p>
                          <p
                            className={`mt-1 font-mono text-xs ${theme.muted}`}
                          >
                            {meter.consumerNo}
                          </p>
                          <p className={`mt-1 text-xs ${theme.muted}`}>
                            {meter.location} · Token {meter.tokenId}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className={`text-xs ${theme.muted}`}>
                        No linked meters.
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                      <Bell className="h-4 w-4 text-violet-400" /> Push devices
                    </h3>
                    {selectedUser.devices.length ? (
                      selectedUser.devices.map((device) => (
                        <div
                          key={device.endpoint}
                          className={`mb-2 rounded-2xl border p-3 ${theme.soft}`}
                        >
                          <p
                            className={`break-all font-mono text-[10px] ${theme.muted}`}
                          >
                            {device.endpoint}
                          </p>
                          <p className={`mt-1 text-[10px] ${theme.muted}`}>
                            Updated {displayDate(device.updatedAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className={`text-xs ${theme.muted}`}>
                        No registered devices.
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                      <ShieldCheck className="h-4 w-4 text-cyan-400" /> Manual
                      readings
                    </h3>
                    {selectedUser.readings.length ? (
                      selectedUser.readings
                        .slice()
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((reading) => (
                          <div
                            key={reading.id}
                            className={`mb-2 rounded-2xl border p-3 ${theme.soft}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold">
                                {reading.currentKwh.toLocaleString()} kWh
                              </p>
                              <p className={`text-[10px] ${theme.muted}`}>
                                {displayDate(reading.date)}
                              </p>
                            </div>
                            <p className={`mt-1 text-[10px] ${theme.muted}`}>
                              Cycle start{" "}
                              {reading.cycleStartKwh.toLocaleString()} kWh
                            </p>
                          </div>
                        ))
                    ) : (
                      <p className={`text-xs ${theme.muted}`}>
                        No manual readings.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div
                className={`flex min-h-80 items-center justify-center ${theme.muted}`}
              >
                Select a user to inspect their activity.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
