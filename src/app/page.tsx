"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Zap,
  IndianRupee,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Activity,
  CalendarClock,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { SlabRate } from "./api/tneb/route";

// --- Expected Data Interfaces ---
interface BillRecord {
  date: string;
  kwhReading: number;
  units: number;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  receiptNo: string | null;
  isPaid: boolean;
}

interface ConsumerDetails {
  name: string;
  consumerNo: string;
  address: string;
  region: string;
  circle: string;
  section: string;
  distribution: string;
  phase: string;
  meterNumber: string;
  serviceStatus: string;
  sanctionedLoad: string;
  reducedLoad: string;
  aadhaarStatus: string; // e.g., "Updated" or "Not Updated"
  panStatus: string;
}

interface DashboardData {
  success: boolean;
  consumer: ConsumerDetails;
  slabRates: SlabRate[];
  bills: BillRecord[];
  error?: string;
}

export default function EnhancedTnebTracker() {
  const [consumerNo, setConsumerNo] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchBills = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch("/api/tneb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consumerNo }),
      });
      const result = await res.json();

      if (result.success) {
        setData(result);
      } else {
        setError(result.error || "Failed to fetch data.");
      }
    } catch (err) {
      setError("An unexpected error occurred while fetching.");
    } finally {
      setLoading(false);
    }
  };

  // --- Insight Calculations ---
  const latestBill = data?.bills[0]; // Assuming API sorts newest first
  const isFreeMonth = latestBill?.amount === 0;
  const pendingPayment = latestBill && !latestBill.isPaid;
  const avgUnits = data?.bills.length
    ? Math.round(
        data.bills.reduce((acc, curr) => acc + curr.units, 0) /
          data.bills.length,
      )
    : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Zap className="text-yellow-500 fill-yellow-500 w-6 h-6" />
              TNEB Smart Analytics
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Deep insights into your bi-monthly power consumption.
            </p>
          </div>

          <form onSubmit={fetchBills} className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Enter Consumer No..."
              value={consumerNo}
              onChange={(e) => setConsumerNo(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full md:w-64"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-xl shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Analyze"
              )}
            </button>
          </form>
        </header>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-100">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {data && data.success && data.bills.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* AI-Style Insights Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isFreeMonth && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 text-white p-6 rounded-2xl shadow-sm flex items-start gap-4">
                  <ShieldCheck className="w-8 h-8 opacity-80" />
                  <div>
                    <h3 className="font-bold text-lg">
                      Free Units Subsidy Applied!
                    </h3>
                    <p className="text-emerald-50 text-sm mt-1">
                      Your latest bill for {latestBill?.units} units fell
                      completely under the government subsidy. You skipped
                      payment this cycle.
                    </p>
                  </div>
                </div>
              )}
              {pendingPayment && !isFreeMonth && (
                <div className="bg-gradient-to-r from-rose-500 to-red-500 text-white p-6 rounded-2xl shadow-sm flex items-start gap-4">
                  <AlertCircle className="w-8 h-8 opacity-80" />
                  <div>
                    <h3 className="font-bold text-lg">
                      Action Required: Payment Pending
                    </h3>
                    <p className="text-rose-50 text-sm mt-1">
                      Your latest bill of ₹{latestBill?.amount} is due by{" "}
                      {latestBill?.dueDate}. Ensure timely payment to avoid
                      penalties.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Left Column: Consumer Details & Slab Rates */}
              <div className="xl:col-span-1 space-y-6">
                {/* Connection Profile */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 border-b pb-3">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    Connection Profile
                  </h3>

                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider">
                        Consumer Name
                      </p>
                      <p className="font-medium text-slate-900">
                        {data.consumer.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider">
                        Address
                      </p>
                      <p className="text-slate-700 leading-tight">
                        {data.consumer.address}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                      <div>
                        <p className="text-slate-400 text-xs">
                          Region / Circle
                        </p>
                        <p className="font-medium text-slate-800">
                          {data.consumer.region} / {data.consumer.circle}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Section</p>
                        <p className="font-medium text-slate-800">
                          {data.consumer.section}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Load / Phase</p>
                        <p className="font-medium text-slate-800">
                          {data.consumer.sanctionedLoad} / Phase{" "}
                          {data.consumer.phase}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Meter Number</p>
                        <p className="font-medium text-slate-800">
                          {data.consumer.meterNumber}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${data.consumer.aadhaarStatus.toLowerCase().includes("updated") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                      >
                        Aadhaar: {data.consumer.aadhaarStatus}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${data.consumer.panStatus.toLowerCase().includes("updated") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                      >
                        PAN: {data.consumer.panStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Slab Rates */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-16 bg-indigo-50/40 rounded-bl-full -z-10 blur-3xl"></div>

                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <IndianRupee className="w-4 h-4" />
                      </div>
                      Applicable Slab Rates
                    </h3>
                  </div>

                  {/* Group 1: Up to 500 Units */}
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      If total consumption is ≤ 500 units
                    </h4>
                    <div className="space-y-2.5">
                      {data.slabRates
                        .filter((slab) => slab.maxLimit === "500")
                        .map((slab, i) => {
                          const isFree =
                            slab.rate === "0" || slab.rate === "0.00";
                          return (
                            <div
                              key={i}
                              className={`group flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 border ${isFree ? "bg-emerald-50/30 border-emerald-100/50 hover:bg-emerald-50/80" : "bg-slate-50/50 border-slate-100/50 hover:bg-slate-50 hover:border-slate-200"}`}
                            >
                              <div className="flex items-center gap-3.5">
                                <div
                                  className={`w-1.5 h-8 rounded-full transition-colors ${isFree ? "bg-emerald-400" : "bg-indigo-200 group-hover:bg-indigo-400"}`}
                                ></div>
                                <span className="font-medium text-slate-700 text-sm">
                                  {slab.from}{" "}
                                  <span className="text-slate-400 font-normal mx-1.5">
                                    to
                                  </span>{" "}
                                  {slab.to}{" "}
                                  <span className="text-slate-400 font-normal text-xs ml-1">
                                    units
                                  </span>
                                </span>
                              </div>
                              <div>
                                {isFree ? (
                                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                                    Free
                                  </span>
                                ) : (
                                  <div className="font-mono font-semibold text-slate-900 flex items-center gap-1 bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                                    <span className="text-slate-400 font-sans text-xs font-normal">
                                      ₹
                                    </span>
                                    {slab.rate}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Group 2: Above 500 Units */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      If total consumption is &gt; 500 units
                    </h4>
                    <div className="space-y-2.5">
                      {data.slabRates
                        .filter((slab) => slab.maxLimit !== "500")
                        .map((slab, i) => {
                          const isFree =
                            slab.rate === "0" || slab.rate === "0.00";
                          return (
                            <div
                              key={i}
                              className={`group flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 border ${isFree ? "bg-emerald-50/30 border-emerald-100/50 hover:bg-emerald-50/80" : "bg-slate-50/50 border-slate-100/50 hover:bg-slate-50 hover:border-slate-200"}`}
                            >
                              <div className="flex items-center gap-3.5">
                                <div
                                  className={`w-1.5 h-8 rounded-full transition-colors ${isFree ? "bg-emerald-400" : "bg-rose-200 group-hover:bg-rose-400"}`}
                                ></div>
                                <span className="font-medium text-slate-700 text-sm">
                                  {slab.from}{" "}
                                  <span className="text-slate-400 font-normal mx-1.5">
                                    to
                                  </span>{" "}
                                  {slab.to}{" "}
                                  <span className="text-slate-400 font-normal text-xs ml-1">
                                    units
                                  </span>
                                </span>
                              </div>
                              <div>
                                {isFree ? (
                                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg uppercase tracking-wider">
                                    Free
                                  </span>
                                ) : (
                                  <div className="font-mono font-semibold text-slate-900 flex items-center gap-1 bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                                    <span className="text-slate-400 font-sans text-xs font-normal">
                                      ₹
                                    </span>
                                    {slab.rate}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Charts and History */}
              <div className="xl:col-span-2 space-y-6">
                {/* Visual Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-500" />
                      Consumption Trend (Bi-Monthly)
                    </h3>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Average Usage</p>
                      <p className="font-bold text-indigo-600">
                        {avgUnits} units
                      </p>
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[...data.bills].reverse()}
                        margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
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
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#94a3b8", fontSize: 12 }}
                          dy={10}
                          tickFormatter={(dateStr) => {
                            if (!dateStr || !dateStr.includes("/"))
                              return dateStr;
                            const [day, month, year] = dateStr.split("/");
                            const monthNames = [
                              "Jan",
                              "Feb",
                              "Mar",
                              "Apr",
                              "May",
                              "Jun",
                              "Jul",
                              "Aug",
                              "Sep",
                              "Oct",
                              "Nov",
                              "Dec",
                            ];
                            const monthName =
                              monthNames[parseInt(month, 10) - 1];
                            const shortYear = year.slice(-2);
                            return `${monthName} '${shortYear}`;
                          }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#94a3b8", fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          }}
                          labelStyle={{ color: "#64748b", fontWeight: "bold" }}
                          formatter={
                            ((value: any, name: any) => [
                              name === "units"
                                ? `${value ?? ""} Units`
                                : `₹${value ?? ""}`,
                              name === "units" ? "Consumed" : "Amount",
                            ]) as any
                          }
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

                {/* Detailed Data Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <CalendarClock className="w-5 h-5 text-indigo-500" />
                      Detailed Billing Ledger
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                          <th className="py-4 px-6 font-medium">
                            Billing Date
                          </th>
                          <th className="py-4 px-6 font-medium">Meter (KWH)</th>
                          <th className="py-4 px-6 font-medium text-center">
                            Units Used
                          </th>
                          <th className="py-4 px-6 font-medium text-right">
                            Amount
                          </th>
                          <th className="py-4 px-6 font-medium text-right">
                            Status & Payment Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.bills.map((bill, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/50 transition-colors group"
                          >
                            <td className="py-4 px-6 text-sm text-slate-900 font-medium">
                              {bill.date}
                            </td>
                            <td className="py-4 px-6 text-sm text-slate-500 font-mono">
                              {bill.kwhReading.toLocaleString()}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span
                                className={`py-1 px-3 rounded-full text-xs font-semibold ${bill.units <= 100 ? "bg-emerald-100 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}
                              >
                                {bill.units} {bill.units <= 100 && " (Free)"}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-sm font-mono text-slate-900 text-right">
                              ₹{bill.amount.toLocaleString()}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex flex-col items-end gap-1">
                                {bill.amount === 0 ? (
                                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                    <ShieldCheck className="w-3 h-3" />{" "}
                                    Subsidized
                                  </span>
                                ) : bill.isPaid ? (
                                  <>
                                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                      <CheckCircle2 className="w-3 h-3" /> Paid
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      on {bill.paidDate}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-md">
                                      <XCircle className="w-3 h-3" /> Pending
                                    </span>
                                    <span className="text-[11px] text-rose-400 font-medium">
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
        )}
      </div>
    </div>
  );
}
