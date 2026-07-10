import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Home Services Co",
  description: "Questions about home services? Contact us. Call or text (888) 700-4001, email hello@thehomeservicescompany.com, or send us a message.",
  alternates: { canonical: "/contact" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
