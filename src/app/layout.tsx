import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SecurityWrapper from "@/components/SecurityWrapper";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || "default_secret_key",
);

export const metadata: Metadata = {
  title: "Minnal - Tamil Nadu Electricity Board (TNEB) Bill Tracker",
  description:
    "Minnal is a web application that allows users to track their electricity bills from the Tamil Nadu Electricity Board (TNEB). It provides features such as bill history, payment status, and notifications for due dates.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let initialAuth = false;
  const cookieStore = await cookies();
  const token = cookieStore.get("tneb_auth_token")?.value;

  if (token) {
    try {
      await jwtVerify(token, SECRET_KEY);
      initialAuth = true;
    } catch (e) {
      initialAuth = false;
    }
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SecurityWrapper initialAuth={initialAuth}>{children}</SecurityWrapper>
      </body>
    </html>
  );
}
