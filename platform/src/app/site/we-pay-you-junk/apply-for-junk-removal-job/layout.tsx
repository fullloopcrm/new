import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply for Junk Removal Job — $50/hr, No Experience Required",
  description: "Apply for a junk removal crew position. $50/hr starting pay, tips on top, paid training, health insurance, growth path. No experience required. We train you.",
  alternates: { canonical: "/apply-for-junk-removal-job" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
