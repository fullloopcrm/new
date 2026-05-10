// @ts-nocheck
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book NYC Tow Truck Service Online — 24/7 Same-Day Dispatch",
  description: "Request 24/7 towing or roadside service in any NYC borough. Flat-rate pricing, 20–40 minute typical arrival, licensed and insured.",
  alternates: { canonical: "/book-towing-service-today" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
