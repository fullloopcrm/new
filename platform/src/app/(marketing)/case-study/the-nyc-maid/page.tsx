import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema, articleSchema } from "@/lib/schema";
import { getCaseStudyStats } from "@/lib/caseStudyStats";
import Reviews from "@/components/home/Reviews";
import ReadingNav from "@/components/case-study/ReadingNav";
import Hero from "@/components/case-study/Hero";
import VerifyYourself from "@/components/case-study/VerifyYourself";
import Premise from "@/components/case-study/Premise";
import DayZero from "@/components/case-study/DayZero";
import BuildLog from "@/components/case-study/BuildLog";
import Problem from "@/components/case-study/Problem";
import Anatomy1 from "@/components/case-study/Anatomy1";
import AnatomyYinez from "@/components/case-study/AnatomyYinez";
import Anatomy2 from "@/components/case-study/Anatomy2";
import Anatomy3 from "@/components/case-study/Anatomy3";
import TheStack from "@/components/case-study/TheStack";
import LeadJourney from "@/components/case-study/LeadJourney";
import Results from "@/components/case-study/Results";
import OwnersDay from "@/components/case-study/OwnersDay";
import Comparison from "@/components/case-study/Comparison";
import Platform from "@/components/case-study/Platform";
import WhatsNext from "@/components/case-study/WhatsNext";
import Industry from "@/components/case-study/Industry";
import Lessons from "@/components/case-study/Lessons";
import Objections from "@/components/case-study/Objections";
import Proves from "@/components/case-study/Proves";
import Cta from "@/components/case-study/Cta";

const PAGE_URL = "https://homeservicesbusinesscrm.com/case-study/the-nyc-maid";
const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  { name: "Case Study — The NYC Maid", url: PAGE_URL },
];

const TITLE = "The NYC Maid Case Study: A Business Built to Be the Proof — Run Almost Autonomously on Full Loop CRM";
const DESC =
  "We didn't write a case study — we built a real NYC cleaning company to be one. The NYC Maid: 700+ clients in under six months on $0 of ads, run by one person about an hour a day, rendered from the real build record. Verify every claim yourself.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "Full Loop CRM case study",
    "autonomous home service business",
    "AI-run cleaning business",
    "organic lead generation case study",
    "home service CRM results",
    "The NYC Maid",
    "AI front office",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "The NYC Maid Case Study | A Business Built to Be the Proof",
    description:
      "A real NYC cleaning company, built to run on Full Loop CRM until it ran itself. 700+ clients, $0 ads, one person ~an hour a day. Rendered from the real build record.",
    url: PAGE_URL,
    type: "article",
    publishedTime: "2026-02-01T00:00:00Z",
    modifiedTime: "2026-06-26T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title: "The NYC Maid Case Study | A Business Built to Be the Proof",
    description: "700+ clients in under six months on $0 of ads. Run by one person, ~an hour a day. Verify it yourself.",
  },
};

export default async function TheNYCMaidCaseStudy() {
  const live = await getCaseStudyStats();

  return (
    <>
      <JsonLd data={webPageSchema(TITLE, DESC, PAGE_URL, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={articleSchema(TITLE, DESC, PAGE_URL, "2026-02-01T00:00:00Z", "2026-06-26T00:00:00Z")} />

      <ReadingNav />

      <Hero generatedAt={live?.generatedAt ?? null} clients={live?.clients ?? null} />
      <VerifyYourself />

      <Premise />
      <DayZero />
      <BuildLog />
      <Problem />

      <Anatomy1 />
      <AnatomyYinez />
      <Anatomy2 />
      <Anatomy3 />
      <TheStack />
      <LeadJourney />

      <Results live={live} />
      <OwnersDay />
      <Comparison />
      <Platform />
      <WhatsNext />
      <Industry />
      <Lessons />
      <Objections />

      <Reviews />

      <Proves />
      <Cta />
    </>
  );
}
