"use client";

import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/super/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      router.replace("/super");
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Unable to sign in",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.34),transparent_42%)]" />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-500/20 p-3 text-indigo-200">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
              Minnal control room
            </p>
            <h1 className="mt-1 text-2xl font-bold">Super admin sign in</h1>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">
          Review users, linked meters, device registrations, and reading
          activity from one protected workspace.
        </p>
        <div className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Admin email"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-400"
          />
          <div className="relative">
            <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="password"
              required
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Admin PIN"
              className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 font-mono text-sm text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>
        {error && (
          <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-200">
            {error}
          </p>
        )}
        <button
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-bold transition hover:bg-indigo-400 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Enter
          control room
        </button>
      </form>
    </main>
  );
}
