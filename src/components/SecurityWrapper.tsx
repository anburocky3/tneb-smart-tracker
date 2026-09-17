"use client";

import { useState, useEffect, useRef } from "react";
import {
  AlignRightIcon,
  ArrowRight,
  Lock,
  ShieldCheck,
  Mail,
  LucideGitBranchPlus,
  GitFork,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SecurityWrapper({
  children,
  initialAuth = false,
}: {
  children: React.ReactNode;
  initialAuth?: boolean;
}) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  const [email, setEmail] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if previously authenticated in this session
    const authStatus = sessionStorage.getItem("tneb_auth");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  }, [pathname]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    // Call the server-side function to verify the entered credentials
    const data = await fetch("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, pin: pinInput }),
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

  // Allow access to public routes (like /register)
  const isPublicRoute = pathname === "/register";

  if (!isAuthenticated && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Secure Access
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Enter your credentials to access the analytics dashboard.
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="text-left">
              <label className="text-xs font-semibold text-slate-500 ml-1 mb-1 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(false);
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 transition-all"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="text-left">
              <label className="text-xs font-semibold text-slate-500 ml-1 mb-1 block">
                MPIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={pinInput}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/\D/g, "");
                    setPinInput(numericValue);
                    // setError(false);

                    // if (numericValue.length === 6) {
                    //   e.target.form?.requestSubmit();
                    // }
                  }}
                  className={`w-full text-black pl-10 font-mono text-2xl py-3 border rounded-xl outline-none focus:ring-2 ${
                    error
                      ? "border-rose-300 focus:ring-rose-500"
                      : "border-slate-200 focus:ring-indigo-500"
                  }`}
                  placeholder="••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-rose-500 text-xs font-medium">
                Incorrect email or PIN. Please try again.
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

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-slate-500 text-sm">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-indigo-600 font-semibold hover:underline"
              >
                Register here
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

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="flex-1">{children}</div>

      {/* Global Watermark Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 px-6 mt-auto shrink-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 font-medium tracking-wide">
          <p>
            © {new Date().getFullYear()} Anbu Experiments.{" "}
            <a
              href="https://github.com/anburocky3/tneb-smart-tracker/fork"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                className="inline-block w-4 h-4 ml-1 text-slate-400"
              >
                <path
                  fill="currentColor"
                  d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
                />
              </svg>{" "}
              Open Source Project
            </a>
          </p>
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
