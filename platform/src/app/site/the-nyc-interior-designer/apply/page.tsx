import type { Metadata } from "next";
import { SITE_NAME, SITE_DOMAIN } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import ApplyClient from "./ApplyClient";

export const metadata: Metadata = {
  title: `Apply Now — Interior Design Jobs in NYC | ${SITE_NAME}`,
  description:
    "Apply for an interior design job in NYC. Upload your resume and share your portfolio. We are hiring designers, project managers, design assistants, home stagers, and more across all five boroughs.",
  alternates: { canonical: `${SITE_DOMAIN}/apply` },
  openGraph: {
    title: `Apply Now | ${SITE_NAME}`,
    description: "Submit your application for interior design jobs across NYC.",
    url: `${SITE_DOMAIN}/apply`,
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function ApplyPage() {
  return <ApplyClient />;
}
