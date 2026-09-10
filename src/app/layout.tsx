import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SecurityWrapper from "@/components/SecurityWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Minnal - Tamil Nadu Electricity Board (TNEB) Bill Tracker",
  description:
    "Minnal is a web application that allows users to track their electricity bills from the Tamil Nadu Electricity Board (TNEB). It provides features such as bill history, payment status, and notifications for due dates.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SecurityWrapper>{children}</SecurityWrapper>
      </body>
    </html>
  );
}
