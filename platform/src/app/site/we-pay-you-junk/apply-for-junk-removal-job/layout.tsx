import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a We Pay You Junk Partner — $100/hr + 60% Resale, Own Your Territory",
  description: "1099 partner opportunity in junk removal under the We Pay You Junk Removal brand. $100/hr as the lead with your truck + $50/hr per additional laborer + 60% resale. Bring your own truck (or a vehicle with a trailer), valid license, and insurance. Grow into the sole provider for your territory.",
  alternates: { canonical: "/apply-for-junk-removal-job" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
