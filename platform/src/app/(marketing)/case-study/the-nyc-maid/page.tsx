import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema, articleSchema, faqSchema, itemListSchema } from "@/lib/schema";
import { getCaseStudyStats } from "@/lib/caseStudyStats";
import { CHAPTERS } from "@/components/case-study/cs";
import { objectionFaqs } from "@/components/case-study/Objections";
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

const TITLE = "The First Business Built to Be Its Own Case Study — The NYC Maid, Run Almost Autonomously on Full Loop CRM";
const DESC =
  "The NYC Maid is the first real business started for the sole purpose of being its own case study: a New York City cleaning company built on Full Loop CRM and run almost autonomously — 700+ clients in under six months on $0 of ads, by one person about an hour a day. Rendered live from the build record. Verify every claim yourself.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "business built to be its own case study",
    "business started as a case study",
    "first live case study business",
    "a business built to be the proof",
    "verifiable case study",
    "Full Loop CRM case study",
    "autonomous home service business",
    "The NYC Maid",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "The First Business Built to Be Its Own Case Study | The NYC Maid",
    description:
      "The first real business started just to be its own case study — a NYC cleaning company built on Full Loop CRM and run almost autonomously. 700+ clients, $0 ads, one person ~an hour a day. Rendered live from the build record.",
    url: PAGE_URL,
    type: "article",
    publishedTime: "2026-02-01T00:00:00Z",
    modifiedTime: "2026-06-26T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title: "The First Business Built to Be Its Own Case Study | The NYC Maid",
    description: "A real company started solely to be its own case study: 700+ clients in under six months on $0 of ads, run almost autonomously. Verify it yourself.",
  },
};

export default async function TheNYCMaidCaseStudy() {
  const live = await getCaseStudyStats();

  return (
    <>
      <JsonLd data={webPageSchema(TITLE, DESC, PAGE_URL, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={articleSchema(TITLE, DESC, PAGE_URL, "2026-02-01T00:00:00Z", "2026-06-26T00:00:00Z")} />
      <JsonLd data={faqSchema(objectionFaqs)} />
      <JsonLd
        data={itemListSchema(
          "The NYC Maid Case Study — Contents",
          CHAPTERS.map((c) => ({ name: c.title, url: `${PAGE_URL}#${c.id}` }))
        )}
      />

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
