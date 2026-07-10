import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

export const metadata = pageSeo({
  title: "Contact The Roadside Helper — 24/7 at $149/hr | (888) 944-3001",
  description:
    "Contact The Roadside Helper for fleet inquiries, partnerships, feedback. For immediate roadside dispatch at flat $149/hr, call (888) 944-3001 24/7.",
  path: "/contact-the-roadside-helper",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}