"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";

export default function ConsumerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const consumerNo = params.consumerNo as string;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connDetails, setConnDetails] = useState<any>(null);

  useEffect(() => {
    const fetchMeterData = async () => {
      try {
        // 1. Fetch credentials from Firestore Database instead of local storage
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

        // 2. Fetch Live TNEB API Data using DB credentials
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="font-medium text-slate-600">
          Analyzing meter {consumerNo}...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-10 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Access Error
          </h2>
          <p className="text-slate-500 mb-6">{error}</p>
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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to EB Dashboard
        </button>

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              {connDetails?.nickname || data.consumer.name}
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-mono">
              {consumerNo} • {data.consumer.address}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isFreeMonth && (
            <div className="bg-linear-to-r from-emerald-500 to-teal-400 text-white p-6 rounded-3xl shadow-sm flex items-start gap-4">
              <ShieldCheck className="w-8 h-8 opacity-80" />
              <div>
                <h3 className="font-bold text-lg">
                  Free Units Subsidy Applied!
                </h3>
                <p className="text-emerald-50 text-sm mt-1">
                  Latest bill for {latestBill?.units} units fell completely
                  under the government subsidy.
                </p>
              </div>
            </div>
          )}
          {pendingPayment && !isFreeMonth && (
            <div className="bg-linear-to-r from-rose-500 to-red-500 text-white p-6 rounded-3xl shadow-sm flex items-start gap-4">
              <AlertCircle className="w-8 h-8 opacity-80" />
              <div>
                <h3 className="font-bold text-lg">Payment Pending</h3>
                <p className="text-rose-50 text-sm mt-1">
                  Latest bill of ₹{latestBill?.amount.toLocaleString()} is due
                  by {latestBill?.dueDate}.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 border-b pb-3">
                <MapPin className="w-4 h-4 text-indigo-500" /> Connection
                Profile
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">
                    Registered Name
                  </p>
                  <p className="font-medium text-slate-900">
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
                    <p className="text-slate-400 text-xs">Load</p>
                    <p className="font-medium text-slate-800">
                      {data.consumer.sanctionedLoad}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Meter Number</p>
                    <p className="font-medium text-slate-800">
                      {data.consumer.meterNumber}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SLAB RATES COMPONENT */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-16 bg-indigo-50/40 rounded-bl-full -z-10 blur-3xl"></div>
              <h3 className="font-bold text-slate-800 flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <IndianRupee className="w-4 h-4" />
                </div>
                Applicable Slab Rates
              </h3>

              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  ≤ 500 units
                </h4>
                <div className="space-y-2.5">
                  {data.slabRates
                    .filter((s: any) => s.maxLimit === "500")
                    .map((slab: any, i: number) => {
                      const isFree = slab.rate === "0" || slab.rate === "0.00";
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border ${isFree ? "bg-emerald-50/30 border-emerald-100/50" : "bg-slate-50/50 border-slate-100/50"}`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-1.5 h-8 rounded-full ${isFree ? "bg-emerald-400" : "bg-indigo-200"}`}
                            ></div>
                            <span className="font-medium text-slate-700 text-sm">
                              {slab.from}{" "}
                              <span className="text-slate-400 font-normal mx-1">
                                to
                              </span>{" "}
                              {slab.to}{" "}
                              <span className="text-slate-400 font-normal text-xs ml-1">
                                units
                              </span>
                            </span>
                          </div>
                          {isFree ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg uppercase">
                              Free
                            </span>
                          ) : (
                            <div className="font-mono font-semibold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                              <span className="text-slate-400 font-sans text-xs font-normal mr-1">
                                ₹
                              </span>
                              {slab.rate}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  &gt; 500 units
                </h4>
                <div className="space-y-2.5">
                  {data.slabRates
                    .filter((s: any) => s.maxLimit !== "500")
                    .map((slab: any, i: number) => {
                      const isFree = slab.rate === "0" || slab.rate === "0.00";
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border ${isFree ? "bg-emerald-50/30 border-emerald-100/50" : "bg-slate-50/50 border-slate-100/50"}`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-1.5 h-8 rounded-full ${isFree ? "bg-emerald-400" : "bg-rose-200"}`}
                            ></div>
                            <span className="font-medium text-slate-700 text-sm">
                              {slab.from}{" "}
                              <span className="text-slate-400 font-normal mx-1">
                                to
                              </span>{" "}
                              {slab.to}{" "}
                              <span className="text-slate-400 font-normal text-xs ml-1">
                                units
                              </span>
                            </span>
                          </div>
                          {isFree ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg uppercase">
                              Free
                            </span>
                          ) : (
                            <div className="font-mono font-semibold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                              <span className="text-slate-400 font-sans text-xs font-normal mr-1">
                                ₹
                              </span>
                              {slab.rate}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" /> Consumption
                  Trend
                </h3>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Average Usage</p>
                  <p className="font-bold text-indigo-600">{avgUnits} units</p>
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
                      tickFormatter={(d) => {
                        if (!d || !d.includes("/")) return d;
                        const [day, month, year] = d.split("/");
                        return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(month) - 1]} '${year.slice(-2)}`;
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

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-indigo-500" /> Detailed
                  Ledger
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="py-4 px-6 font-medium">Billing Date</th>
                      <th className="py-4 px-6 font-medium">Meter (KWH)</th>
                      <th className="py-4 px-6 font-medium text-center">
                        Units Used
                      </th>
                      <th className="py-4 px-6 font-medium text-right">
                        Amount
                      </th>
                      <th className="py-4 px-6 font-medium text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.bills.map((bill: any, idx: number) => (
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
                                <ShieldCheck className="w-3 h-3" /> Subsidized
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
    </div>
  );
}
