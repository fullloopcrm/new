import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact We Pay You Junk Removal",
  description: "Questions about junk removal? Contact us. Text (888) 831-3001, email hello@wepayyoujunkremoval.com, or send us a message.",
  alternates: { canonical: "/contact-we-pay-you-junk-removal-today" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
