import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Toll Trucks Near Me",
  description: "Questions about tow truck service? Contact us. Call (888) 831-3001, email hello@tolltrucksnearme.com, or send us a message.",
  alternates: { canonical: "/contact-toll-trucks" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
