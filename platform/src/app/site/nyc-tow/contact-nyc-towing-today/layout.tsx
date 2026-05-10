// @ts-nocheck
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact NYC Tow Truck Service — 24/7 Dispatch in All 5 Boroughs",
  description: "Questions or need dispatch? Call (212) 470-4068 24/7, email hi@thenyctowingservice.com, or send a message.",
  alternates: { canonical: "/contact-nyc-towing-today" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
