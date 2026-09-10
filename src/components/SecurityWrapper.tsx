"use client";

import { useState, useEffect, useRef } from "react";
import { AlignRightIcon, ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { verifyUserMpin } from "@/app/actions";

export default function SecurityWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if previously authenticated in this session
    const authStatus = sessionStorage.getItem("tneb_auth");
    if (authStatus === "true") setIsAuthenticated(true);
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    // Call the server-side function to verify the entered MPIN
    const data = await fetch("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pin: pinInput }),
    });

    const jsonData = await data.json();

    if (jsonData.success) {
      setIsAuthenticated(true);
      sessionStorage.setItem("tneb_auth", "true");
    } else {
      setError(true);
      setPinInput("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Sensitive Area
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Enter your master PIN to access the analytics dashboard.
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              maxLength={4}
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              value={pinInput}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/\D/g, "");
                setPinInput(numericValue);
                setError(false);

                if (numericValue.length === 5) {
                  e.target.form?.requestSubmit();
                }
              }}
              className={`w-full text-black text-center tracking-[1em] font-mono text-2xl py-3 border rounded-xl outline-none focus:ring-2 ${
                error
                  ? "border-rose-300 focus:ring-rose-500"
                  : "border-slate-200 focus:ring-indigo-500"
              }`}
              placeholder="••••"
            />
            {error && (
              <p className="text-rose-500 text-xs font-medium">
                Incorrect PIN. Please try again.
              </p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span>Continue</span>
              <ArrowRight className="w-5 h-5 float-right" />
            </button>
          </form>
        </div>

        <span className="mt-5 text-slate-400 text-xs font-medium">
          {new Date().getFullYear()} Anbu Experiments. All rights reserved.
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="flex-1">{children}</div>

      {/* Global Watermark Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 px-6 mt-auto shrink-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 font-medium tracking-wide">
          <p>© {new Date().getFullYear()} Anbu Experiments.</p>
          <p className="mt-2 md:mt-0 flex items-center gap-1">
            Created by{" "}
            <span className="text-slate-600 font-bold">
              <a
                href="https://github.com/anburocky3"
                target="_blank"
                rel="noopener noreferrer"
              >
                Anbuselvan Annamalai
              </a>
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
