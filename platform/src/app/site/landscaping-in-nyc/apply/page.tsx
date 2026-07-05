import type { Metadata } from "next";
import { SITE_NAME, SITE_DOMAIN } from "@/app/site/landscaping-in-nyc/_lib/siteData";
import ApplyClient from "./ApplyClient";

export const metadata: Metadata = {
  title: `Apply Now — Landscaping Jobs in NYC | ${SITE_NAME}`,
  description:
    "Apply for a landscaping job in NYC. Upload your resume and a short selfie video. We're hiring landscapers, designers, irrigation techs, tree care specialists, and crew leaders across all five boroughs.",
  alternates: { canonical: `${SITE_DOMAIN}/apply` },
  openGraph: {
    title: `Apply Now | ${SITE_NAME}`,
    description: "Submit your application for landscaping jobs across NYC.",
    url: `${SITE_DOMAIN}/apply`,
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function ApplyPage() {
  return <ApplyClient />;
}
