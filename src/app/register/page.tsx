"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    pin: "",
    confirmPin: "",
  });
  const [status, setStatus] = useState<{
    loading: boolean;
    error: string | null;
    success: boolean;
  }>({
    loading: false,
    error: null,
    success: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.pin !== formData.confirmPin) {
      setStatus({ loading: false, error: "PINs do not match", success: false });
      return;
    }

    setStatus({ loading: true, error: null, success: false });

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, pin: formData.pin }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus({ loading: false, error: null, success: true });
        setTimeout(() => router.push("/"), 2000);
      } else {
        setStatus({
          loading: false,
          error: data.error || "Registration failed",
          success: false,
        });
      }
    } catch (err) {
      setStatus({
        loading: false,
        error: "A network error occurred",
        success: false,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <UserPlus className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Create Account
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          Join Minnal to track your TNEB bills independently.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="text-xs font-semibold text-slate-500 ml-1 mb-1 block">
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-3 bg-slate-50 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all"
              placeholder="you@handsome.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-left">
              <label className="text-xs font-semibold text-slate-500 ml-1 mb-1 block">
                Set PIN
              </label>
              <input
                type="password"
                maxLength={6}
                inputMode="numeric"
                required
                value={formData.pin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pin: e.target.value.replace(/\D/g, ""),
                  })
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all"
                placeholder="••••"
              />
            </div>
            <div className="text-left">
              <label className="text-xs font-semibold text-slate-500 ml-1 mb-1 block">
                Confirm PIN
              </label>
              <input
                type="password"
                maxLength={6}
                inputMode="numeric"
                required
                value={formData.confirmPin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPin: e.target.value.replace(/\D/g, ""),
                  })
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all"
                placeholder="••••"
              />
            </div>
          </div>

          {status.error && (
            <p className="text-rose-500 text-xs font-medium text-left bg-rose-50 p-3 rounded-lg border border-rose-100">
              {status.error}
            </p>
          )}

          {status.success && (
            <p className="text-emerald-500 text-xs font-medium text-left bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              Account created successfully! Redirecting to login...
            </p>
          )}

          <button
            type="submit"
            disabled={status.loading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {status.loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-slate-500 text-sm">
            Already have an account?{" "}
            <Link
              href="/"
              className="text-indigo-600 font-semibold hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
      <span className="mt-5 text-slate-400 text-xs font-medium">
        {new Date().getFullYear()} Anbu Experiments. All rights reserved.
      </span>
    </div>
  );
}
