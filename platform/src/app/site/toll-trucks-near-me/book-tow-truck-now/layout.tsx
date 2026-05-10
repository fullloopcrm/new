// @ts-nocheck
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Tow Truck Service Today",
  description: "Book your tow truck service pickup. starting at $95 hookup, 1 hour minimum, flat upfront pricing. flat upfront pricing on valuable items. Same-day available.",
  alternates: { canonical: "/book-tow-truck-now" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
