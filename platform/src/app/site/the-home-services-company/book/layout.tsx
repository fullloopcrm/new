// @ts-nocheck
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Home Service Today",
  description: "Book a home service from Home Services Co. Starting at $99/hour, licensed and insured technicians, upfront pricing, same-day availability.",
  alternates: { canonical: "/book" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
