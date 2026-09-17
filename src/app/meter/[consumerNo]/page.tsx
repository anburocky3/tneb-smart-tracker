"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  IndianRupee,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Activity,
  CalendarClock,
  ShieldCheck,
  ArrowLeft,
  Sliders,
  Sparkles,
  Zap,
  Clock,
  TrendingDown,
  Gauge,
  HelpCircle,
} from "lucide-react";

const FREE_LIMIT = 200;
const TIER_LIMIT = 500;

export default function ConsumerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const consumerNo = params.consumerNo as string;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connDetails, setConnDetails] = useState<any>(null);

  // Interactive Simulator State
  const [simAcHours, setSimAcHours] = useState(4);
  const [simGeyserHours, setSimGeyserHours] = useState(1);
  const [showSim, setShowSim] = useState(false);

  useEffect(() => {
    const fetchMeterData = async () => {
      try {
        const dbRes = await fetch("/api/connections");
        if (!dbRes.ok) {
          throw new Error("Failed to fetch data from database.");
        }

        const connections = await dbRes.json();
        const connection = connections.find(
          (c: any) => c.consumerNo === consumerNo,
        );

        if (!connection) {
          setError("Meter not found in your saved data.");
          setLoading(false);
          return;
        }

        setConnDetails(connection);

        const tnebRes = await fetch("/api/tneb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consumerNo: connection.consumerNo,
            tokenId: connection.tokenId,
          }),
        });

        const tnebResult = await tnebRes.json();

        if (tnebResult.success) {
          setData(tnebResult);
        } else {
          setError(tnebResult.error || "Failed to fetch meter details.");
        }
      } catch (err) {
        setError("Network error occurred while fetching details.");
      } finally {
        setLoading(false);
      }
    };

    fetchMeterData();
  }, [consumerNo]);

  // Tariff calculation engine (Tamil Nadu bi-monthly domestic slabs)
  const calculateEstimatedBill = (units: number) => {
    if (units <= FREE_LIMIT) return 0;

    let total = 0;
    if (units <= 400) {
      total = (units - 200) * 4.7;
    } else if (units <= 500) {
      total = 200 * 4.7 + (units - 400) * 6.3;
    } else if (units <= 600) {
      total = 300 * 4.7 + 100 * 6.3 + (units - 500) * 8.4;
    } else if (units <= 800) {
      total = 300 * 4.7 + 100 * 6.3 + 100 * 8.4 + (units - 600) * 9.45;
    } else if (units <= 1000) {
      total =
        300 * 4.7 + 100 * 6.3 + 100 * 8.4 + 200 * 9.45 + (units - 800) * 10.5;
    } else {
      total =
        300 * 4.7 +
        100 * 6.3 +
        100 * 8.4 +
        200 * 9.45 +
        200 * 10.5 +
        (units - 1000) * 11.55;
    }
    return Math.round(total);
  };

  // 60-day bi-monthly calculations
  const biMonthlyStats = useMemo(() => {
    if (!data?.bills?.length) return null;

    const latest = data.bills[0];
    const units = latest?.units || 0;
    const currentBill = latest?.amount || 0;

    const today = new Date();
    const isOddMonth = today.getMonth() % 2 === 0;
    const currentMonthDays = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
    ).getDate();
    const nextMonthDays = new Date(
      today.getFullYear(),
      today.getMonth() + 2,
      0,
    ).getDate();

    const daysLeft = isOddMonth
      ? currentMonthDays - today.getDate() + nextMonthDays
      : currentMonthDays - today.getDate();

    const daysPassed = 60 - daysLeft;
    const unitsPerDay = Number((units / (daysPassed || 1)).toFixed(1));
    const projectedUnits = Math.round(unitsPerDay * 60);

    const unitsToFree = units > FREE_LIMIT ? units - FREE_LIMIT : 0;
    const unitsToNextTier = units > TIER_LIMIT ? 0 : TIER_LIMIT - units;

    return {
      units,
      currentBill,
      daysLeft,
      unitsPerDay,
      projectedUnits,
      unitsToFree,
      unitsToNextTier,
      isUnderFreeLimit: units <= FREE_LIMIT,
    };
  }, [data]);

  // Simulation values (60-day cycle basis: 1.5-ton AC ~1.5kW, Geyser ~2kW)
  const simulation = useMemo(() => {
    const acUnits = Math.round(simAcHours * 1.5 * 60);
    const geyserUnits = Math.round(simGeyserHours * 2.0 * 60);
    const baselineUnits = data?.bills?.[0]?.units || 0;
    const simulatedUnits = baselineUnits + acUnits + geyserUnits;
    const simulatedBill = calculateEstimatedBill(simulatedUnits);
    const baselineBill = calculateEstimatedBill(baselineUnits);

    return {
      addedUnits: acUnits + geyserUnits,
      simulatedUnits,
      simulatedBill,
      difference: simulatedBill - baselineBill,
    };
  }, [simAcHours, simGeyserHours, data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-slate-400 p-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="font-medium text-slate-600 text-sm text-center">
          Analyzing bi-monthly consumption for {consumerNo}...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-6 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Access Error
          </h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium w-full hover:bg-slate-800 transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const latestBill = data.bills[0];
  const isFreeMonth = latestBill?.amount === 0;
  const pendingPayment = latestBill && !latestBill.isPaid;
  const avgUnits = data.bills.length
    ? Math.round(
        data.bills.reduce((acc: any, curr: any) => acc + curr.units, 0) /
          data.bills.length,
      )
    : 0;

  const chartData = [...data.bills].reverse().map((b: any) => {
    let formattedDate = b.date;
    if (b.date && b.date.includes("/")) {
      const [day, month, year] = b.date.split("/");
      formattedDate = `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(month) - 1]} '${year.slice(-2)}`;
    }
    return {
      ...b,
      formattedDate,
    };
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-3 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to EB Dashboard
        </button>

        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {connDetails?.nickname || data.consumer.name}
              </h1>
              {connDetails?.isUsageVacant && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase border border-amber-200">
                  Vacant Meter
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 font-mono break-all">
              {consumerNo} • {data.consumer.address}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-indigo-600" />
              Sanctioned: {data.consumer.sanctionedLoad || "4 KW"}
            </span>
          </div>
        </header>

        {/* Dynamic Bi-Monthly Smart Slab Optimizer Banner */}
        {biMonthlyStats && (
          <div className="bg-linear-to-br from-indigo-50 via-white to-blue-50/40 border border-indigo-100/80 p-4 sm:p-6 rounded-3xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                  60-Day Bi-Monthly Tariff Intelligence
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-full w-fit">
                Approx. {biMonthlyStats.daysLeft} days remaining in cycle
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Current Slab Status
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-bold text-slate-900">
                    {biMonthlyStats.units}
                  </span>
                  <span className="text-xs text-slate-500">units used</span>
                </div>
                <p className="text-xs mt-1">
                  {biMonthlyStats.isUnderFreeLimit ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ₹0 Free Zone
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" /> Billed at ₹4.7+
                    </span>
                  )}
                </p>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Slab Threshold Buffer
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg sm:text-xl font-bold text-slate-900">
                    {biMonthlyStats.isUnderFreeLimit
                      ? FREE_LIMIT - biMonthlyStats.units
                      : biMonthlyStats.unitsToNextTier}
                  </span>
                  <span className="text-xs text-slate-500">units to jump</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {biMonthlyStats.isUnderFreeLimit
                    ? "Safe until 200 units"
                    : `Next major jump at ${TIER_LIMIT} units`}
                </p>
              </div>

              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Optimization Suggestion
                </p>
                <p className="text-xs text-slate-700 mt-1.5 leading-snug">
                  {biMonthlyStats.isUnderFreeLimit ? (
                    <>
                      You have{" "}
                      <strong className="text-indigo-600">
                        {FREE_LIMIT - biMonthlyStats.units} free units
                      </strong>{" "}
                      remaining. Run washing machines or iron boxes here safely!
                    </>
                  ) : (
                    <>
                      Cutting{" "}
                      <strong className="text-rose-600 font-bold">
                        {biMonthlyStats.unitsToFree} units
                      </strong>{" "}
                      next cycle brings your bill straight to ₹0.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isFreeMonth && (
            <div className="bg-linear-to-r from-emerald-500 to-teal-500 text-white p-5 sm:p-6 rounded-3xl shadow-sm flex items-start gap-3.5">
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 opacity-90" />
              <div>
                <h3 className="font-bold text-base sm:text-lg">
                  Free Units Subsidy Applied!
                </h3>
                <p className="text-emerald-50 text-xs sm:text-sm mt-1">
                  Latest bi-monthly bill for {latestBill?.units} units fell
                  completely under the government 200-unit free slab.
                </p>
              </div>
            </div>
          )}
          {pendingPayment && !isFreeMonth && (
            <div className="bg-linear-to-r from-rose-500 to-red-500 text-white p-5 sm:p-6 rounded-3xl shadow-sm flex items-start gap-3.5">
              <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 opacity-90" />
              <div>
                <h3 className="font-bold text-base sm:text-lg">
                  Payment Pending
                </h3>
                <p className="text-rose-50 text-xs sm:text-sm mt-1">
                  Bill of ₹{latestBill?.amount.toLocaleString()} is due by{" "}
                  {latestBill?.dueDate}.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm sm:text-base">
                <MapPin className="w-4 h-4 text-indigo-500" /> Connection
                Profile
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">
                    Registered Name
                  </p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {data.consumer.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                  <div>
                    <p className="text-slate-400 text-xs">Region</p>
                    <p className="font-medium text-slate-800">
                      {data.consumer.region}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Section</p>
                    <p className="font-medium text-slate-800">
                      {data.consumer.section}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Sanctioned Load</p>
                    <p className="font-medium text-slate-800">
                      {data.consumer.sanctionedLoad || "4 KW"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Meter Number</p>
                    <p className="font-medium text-slate-800 font-mono text-xs sm:text-sm">
                      {data.consumer.meterNumber}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Appliance Bill Shock Simulator */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-indigo-100/80">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Bill Shock Simulator
                </h3>
                <button
                  onClick={() => setShowSim(!showSim)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  {showSim ? "Hide" : "Simulate"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Forecast how running high-wattage appliances impacts your
                bi-monthly bill.
              </p>

              {showSim && (
                <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>1.5T Split AC Usage</span>
                      <span className="font-bold text-indigo-600">
                        {simAcHours} hrs/day
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="16"
                      step="1"
                      value={simAcHours}
                      onChange={(e) => setSimAcHours(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>Water Geyser (2kW)</span>
                      <span className="font-bold text-indigo-600">
                        {simGeyserHours} hrs/day
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="4"
                      step="0.5"
                      value={simGeyserHours}
                      onChange={(e) =>
                        setSimGeyserHours(Number(e.target.value))
                      }
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">
                        Added bi-monthly units:
                      </span>
                      <span className="font-bold text-slate-800">
                        +{simulation.addedUnits} units
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Projected Total:</span>
                      <span className="font-bold text-slate-800">
                        {simulation.simulatedUnits} units
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                      <span className="font-semibold text-slate-800">
                        Projected Bill:
                      </span>
                      <span className="font-bold text-indigo-600 font-mono">
                        ₹{simulation.simulatedBill.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 text-right pt-0.5">
                      (+₹{simulation.difference.toLocaleString()} due to slab
                      jumps)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Applicable Slab Rates */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm sm:text-base">
                <IndianRupee className="w-4 h-4 text-indigo-600" />
                Bi-Monthly Slab Rates
              </h3>

              <div className="mb-4">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  ≤ 500 units tier
                </h4>
                <div className="space-y-2">
                  {data.slabRates
                    ?.filter((s: any) => s.maxLimit === "500")
                    .map((slab: any, i: number) => {
                      const isFree = slab.rate === "0" || slab.rate === "0.00";
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border text-xs sm:text-sm ${
                            isFree
                              ? "bg-emerald-50/40 border-emerald-100"
                              : "bg-slate-50/60 border-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-1.5 h-6 rounded-full ${
                                isFree ? "bg-emerald-400" : "bg-indigo-300"
                              }`}
                            />
                            <span className="font-medium text-slate-700">
                              {slab.from} - {slab.to} units
                            </span>
                          </div>
                          {isFree ? (
                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg uppercase">
                              Free
                            </span>
                          ) : (
                            <span className="font-mono font-semibold text-slate-900">
                              ₹{slab.rate}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  &gt; 500 units tier
                </h4>
                <div className="space-y-2">
                  {data.slabRates
                    ?.filter((s: any) => s.maxLimit !== "500")
                    .map((slab: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-slate-100 bg-slate-50/60 text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-6 rounded-full bg-rose-300" />
                          <span className="font-medium text-slate-700">
                            {slab.from} - {slab.to} units
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-slate-900">
                          ₹{slab.rate}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-2 space-y-6">
            {/* Chart with Free and High Tier Reference Lines */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
                <div>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                    <Activity className="w-5 h-5 text-indigo-500" /> Consumption
                    Trend
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dashed lines indicate 200 free units cutoff & 500 slab
                    escalations
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs text-slate-400">
                    Average Bi-Monthly Usage
                  </p>
                  <p className="font-bold text-indigo-600 text-sm sm:text-base">
                    {avgUnits} units
                  </p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorUnits"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#6366f1"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6366f1"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="formattedDate"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "#64748b", fontWeight: "bold" }}
                      formatter={(value: any, name: any) => [
                        name === "units" ? `${value} Units` : `₹${value}`,
                        name === "units" ? "Bi-Monthly Usage" : "Amount",
                      ]}
                    />

                    {/* 200 Free units threshold */}
                    <ReferenceLine
                      y={200}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{
                        value: "Free Cutoff (200 U)",
                        fill: "#10b981",
                        fontSize: 10,
                        position: "insideTopRight",
                      }}
                    />

                    {/* 500 High tariff threshold */}
                    <ReferenceLine
                      y={500}
                      stroke="#f43f5e"
                      strokeDasharray="4 4"
                      label={{
                        value: "High Tariff (500 U)",
                        fill: "#f43f5e",
                        fontSize: 10,
                        position: "insideTopRight",
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="units"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fill="url(#colorUnits)"
                      activeDot={{ r: 6 }}
                      name="units"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Ledger Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                  <CalendarClock className="w-5 h-5 text-indigo-500" /> Detailed
                  Ledger
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="py-3.5 px-4 sm:px-6 font-medium">
                        Cycle Date
                      </th>
                      <th className="py-3.5 px-4 sm:px-6 font-medium">
                        Meter (KWH)
                      </th>
                      <th className="py-3.5 px-4 sm:px-6 font-medium text-center">
                        Units Used
                      </th>
                      <th className="py-3.5 px-4 sm:px-6 font-medium text-right">
                        Amount
                      </th>
                      <th className="py-3.5 px-4 sm:px-6 font-medium text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.bills.map((bill: any, idx: number) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm text-slate-900 font-medium">
                          {bill.date}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm text-slate-500 font-mono">
                          {bill.kwhReading.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-center">
                          <span
                            className={`py-1 px-2.5 rounded-full text-xs font-semibold ${
                              bill.units <= 200
                                ? "bg-emerald-100 text-emerald-700"
                                : bill.units <= 500
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {bill.units} {bill.units <= 200 && "(Free Slab)"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm font-mono text-slate-900 text-right">
                          ₹{bill.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            {bill.amount === 0 ? (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <ShieldCheck className="w-3 h-3" /> Subsidized
                              </span>
                            ) : bill.isPaid ? (
                              <>
                                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                  <CheckCircle2 className="w-3 h-3" /> Paid
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  on {bill.paidDate}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="flex items-center gap-1 text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                  <XCircle className="w-3 h-3" /> Pending
                                </span>
                                <span className="text-[10px] text-rose-400 font-medium">
                                  Due: {bill.dueDate}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
