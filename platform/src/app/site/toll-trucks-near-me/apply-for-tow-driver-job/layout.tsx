import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply for Tow Truck Dispatch Job — $50/hr, No Experience Required",
  description: "Apply for a tow truck service crew position. $50/hr starting pay, tips on top, paid training, health insurance, growth path. No experience required. We train you.",
  alternates: { canonical: "/apply-for-tow-driver-job" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
