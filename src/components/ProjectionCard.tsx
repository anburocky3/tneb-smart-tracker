"use client";

import { Activity, TrendingUp } from "lucide-react";
import type { MeterProjection } from "@/lib/projection";

export function ProjectionCard({
  projection,
}: {
  projection: MeterProjection;
}) {
  const isOnTrack = projection.projectedUnits <= 200;
  const progress = Math.min(100, (projection.projectedUnits / 200) * 100);
  const overage = Math.max(0, projection.projectedUnits - 200);

  return (
    <section className="space-y-4 rounded-3xl border border-indigo-100 bg-linear-to-br from-indigo-50 via-white to-blue-50/50 p-4 shadow-xs sm:p-6">
      <div className="flex flex-col gap-2 border-b border-indigo-100/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-indigo-600 p-2 text-white">
            <TrendingUp className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 sm:text-base">
            Mid-Cycle Bi-Monthly Forecast
          </h2>
        </div>
        <span className="w-fit rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
          {projection.daysElapsed}/60 days observed
        </span>
      </div>

      <div
        className={`rounded-2xl border p-4 ${isOnTrack ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
      >
        <p
          className={`text-sm font-semibold ${isOnTrack ? "text-emerald-800" : "text-rose-800"}`}
        >
          {isOnTrack
            ? `On Track for Rs.0 (Free Slab). Safe allowance: ${projection.dailyAllowanceToStayFree.toFixed(1)} units/day for remaining ${projection.daysRemaining} days.`
            : `Projected Bill: Rs.${projection.projectedBill.toLocaleString()} (Pacing at ${projection.projectedUnits} units). Cutting ${overage} units across remaining ${projection.daysRemaining} days brings your bill back to Rs.0.`}
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Projected usage</span>
          <span className={isOnTrack ? "text-emerald-700" : "text-rose-700"}>
            {projection.projectedUnits} / 200 free units
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full transition-all ${isOnTrack ? "bg-emerald-500" : projection.projectedUnits > 400 ? "bg-rose-500" : "bg-amber-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-slate-400">
          <span>0 units</span>
          <span>Free slab cutoff: 200</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div className="rounded-xl bg-white/80 p-3">
          <span className="text-slate-400">Consumed</span>
          <strong className="mt-1 block text-slate-900">
            {projection.unitsConsumed} units
          </strong>
        </div>
        <div className="rounded-xl bg-white/80 p-3">
          <span className="text-slate-400">Pacing</span>
          <strong className="mt-1 block text-slate-900">
            {projection.unitsPerDay.toFixed(1)}/day
          </strong>
        </div>
        <div className="rounded-xl bg-white/80 p-3">
          <span className="text-slate-400">Free budget</span>
          <strong className="mt-1 block text-slate-900">
            {projection.freeUnitsBudgetLeft} units
          </strong>
        </div>
        <div className="rounded-xl bg-white/80 p-3">
          <span className="text-slate-400">Forecast bill</span>
          <strong className="mt-1 block text-indigo-700">
            ₹{projection.projectedBill.toLocaleString()}
          </strong>
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <Activity className="h-3 w-3" /> Based on the latest logged reading and
        official cycle start.
      </p>
    </section>
  );
}
