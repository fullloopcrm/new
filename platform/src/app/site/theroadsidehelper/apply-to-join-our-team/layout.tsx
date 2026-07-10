import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

export const metadata = pageSeo({
  title:
    "Apply: Roadside Technician Jobs — Hourly + Tips, Paid Training | (888) 944-3001",
  description:
    "Apply for a roadside technician position with The Roadside Helper. Hourly base plus tips, paid training, health insurance, advancement path. We train you on every aspect of roadside service.",
  path: "/apply-to-join-our-team",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}