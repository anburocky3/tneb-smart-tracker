"use client";

import { useState } from "react";
import { CalendarDays, Loader2, Plus, X } from "lucide-react";

export interface ManualReading {
  consumerNo: string;
  date: string;
  currentKwh: number;
  cycleStartKwh: number;
  cycleStartDate: string;
}

interface MeterReadingModalProps {
  consumerNo: string;
  cycleStartKwh: number;
  cycleStartDate: string;
  onSaved: (reading: ManualReading) => Promise<void>;
  onClose: () => void;
}

const getLocalDateValue = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
};

const formatDisplayDate = (value: string) => {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const tnebMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const date = isoMatch
    ? new Date(
        Number(isoMatch[1]),
        Number(isoMatch[2]) - 1,
        Number(isoMatch[3]),
      )
    : tnebMatch
      ? new Date(
          Number(tnebMatch[3]),
          Number(tnebMatch[2]) - 1,
          Number(tnebMatch[1]),
        )
      : null;

  if (!date) return value;
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${String(date.getDate()).padStart(2, "0")} ${month}, ${date.getFullYear()}`;
};

export function MeterReadingButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
    >
      <Plus className="h-3.5 w-3.5" /> Log Meter Reading
    </button>
  );
}

export function MeterReadingModal({
  consumerNo,
  cycleStartKwh,
  cycleStartDate,
  onSaved,
  onClose,
}: MeterReadingModalProps) {
  const [currentKwh, setCurrentKwh] = useState("");
  const [readingDate, setReadingDate] = useState(getLocalDateValue);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedKwh = Number(currentKwh);
    const today = getLocalDateValue();
    if (!Number.isFinite(parsedKwh) || parsedKwh < cycleStartKwh) {
      setError(
        `Reading must be at least ${cycleStartKwh} kWh, the cycle-start value.`,
      );
      return;
    }
    if (!readingDate || readingDate > today) {
      setError("Reading date cannot be in the future.");
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumerNo,
          date: readingDate,
          currentKwh: parsedKwh,
          cycleStartKwh,
          cycleStartDate,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to save reading.");
      }

      await onSaved(result.reading);
      setCurrentKwh("");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save reading.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reading-modal-title"
    >
      <form
        onSubmit={submit}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md space-y-5 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Manual reading
            </p>
            <h2
              id="reading-modal-title"
              className="mt-1 text-xl font-bold text-slate-900"
            >
              Log Meter Reading
            </h2>
            <p className="mt-1 font-mono text-xs text-slate-400">
              {consumerNo}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
              Cycle start:{" "}
              <strong className="font-mono">
                {cycleStartKwh.toLocaleString()} kWh
              </strong>
              <span className="font-normal text-indigo-500">
                on {formatDisplayDate(cycleStartDate)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close reading form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Current meter reading
            <span className="mt-1.5 block rounded-2xl border-2 border-indigo-200 bg-indigo-50/60 p-2 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100">
              <span className="flex items-center gap-2 rounded-xl bg-white px-3">
                <input
                  type="number"
                  min={cycleStartKwh}
                  step="1"
                  required
                  value={currentKwh}
                  onChange={(event) => {
                    setCurrentKwh(event.target.value);
                    setError("");
                  }}
                  className="w-full bg-transparent py-3 font-mono text-lg font-bold text-indigo-900 outline-none placeholder:font-normal placeholder:text-slate-300"
                  placeholder={cycleStartKwh.toString()}
                  autoFocus
                  aria-describedby="reading-help"
                />
                <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-indigo-400">
                  kWh
                </span>
              </span>
            </span>
            <span
              id="reading-help"
              className="mt-1.5 block text-[11px] font-normal text-slate-400"
            >
              Must be at least the cycle-start reading of{" "}
              {cycleStartKwh.toLocaleString()} kWh.
            </span>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Reading date
            <span className="relative mt-1.5 block">
              <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="date"
                max={getLocalDateValue()}
                required
                value={readingDate}
                onChange={(event) => {
                  setReadingDate(event.target.value);
                  setError("");
                }}
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </span>
            <span className="mt-1.5 block text-[11px] font-normal text-slate-400">
              Selected: {formatDisplayDate(readingDate)}. Future dates are not
              allowed.
            </span>
          </label>
        </div>

        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={isSaving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? "Saving reading..." : "Save Reading"}
        </button>
      </form>
    </div>
  );
}
