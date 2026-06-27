// @ts-nocheck
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact NYC Tow Truck Service — 24/7 Dispatch in All 5 Boroughs",
  description: "Questions or need dispatch? Call (212) 470-4068 24/7, email hi@nycroadsideemergencyassistance.com, or send a message. One rate: $149/hour, $25 off when you book online ($124 first hour) — the fastest way to get a truck.",
  alternates: { canonical: "/contact-nyc-towing-today" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}