import type { Metadata } from "next";
import {
  JsonLd,
  organizationSchema,
  websiteSchema,
  webPageSchema,
  faqSchema,
  breadcrumbSchema,
  localBusinessSchema,
  softwareApplicationSchema,
  serviceSchema,
  itemListSchema,
  howToSchema,
} from "@/lib/schema";
import { industries, generateIndustrySlug } from "@/lib/marketing/combos";

export const metadata: Metadata = {
  title: "Home Service Business CRM | Full Loop — AI Lead Gen, Sales & Scheduling",
  description:
    "Full Loop is the first full-cycle home service CRM: AI lead generation, AI sales, scheduling, GPS field operations, payments, reviews, and retargeting in one platform — proven by a real company it runs almost autonomously. One operator per trade per city.",
  keywords: [
    "home service business CRM",
    "home service CRM",
    "home service CRM software",
    "full-cycle home service CRM",
    "AI sales agent for home services",
    "field service management software",
    "home service business automation",
  ],
  alternates: { canonical: "https://homeservicesbusinesscrm.com" },
  openGraph: {
    title: "Home Service Business CRM That Runs Itself | Full Loop CRM",
    description:
      "The first full-cycle home service CRM — AI lead gen, sales, scheduling, payments, and reviews in one platform. Proven by a real cleaning company run by one person, ~1 hour a day. One operator per trade per city.",
    url: "https://homeservicesbusinesscrm.com",
    siteName: "Full Loop CRM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Home Service Business CRM That Runs Itself | Full Loop CRM",
    description:
      "The first full-cycle home service CRM — AI lead gen, sales, scheduling, payments, reviews. Proven by a real business run almost autonomously.",
  },
};

// Rebuilt homepage — editorial cream/ink SEO hub. Each section: long-tail
// heading → bold description → keyword-rich content with inner links → "learn
// more" to its full page. The NYC Maid case study lives on
// /case-study/the-nyc-maid (homepage only teases it). Order per spec:
// Hero → About → Case study teaser → Features → Testimonials → Industries → FAQ
// → Thank you (lead form) → inner-link matrix.
import Hero from "@/components/home/Hero";
import About from "@/components/home/About";
import QuoteBand from "@/components/home/QuoteBand";
import CaseStudyTeaser from "@/components/home/CaseStudyTeaser";
import Features from "@/components/home/Features";
import AIAgent from "@/components/home/AIAgent";
import WhyFullLoop from "@/components/home/WhyFullLoop";
import AutomationScope from "@/components/home/AutomationScope";
import Automations from "@/components/home/Automations";
import ProblemsSolved from "@/components/home/ProblemsSolved";
import PricingModel from "@/components/home/PricingModel";
import ProofStats from "@/components/home/ProofStats";
import Reviews from "@/components/home/Reviews";
import IndustriesWeServe from "@/components/home/IndustriesWeServe";
import WhoItsFor from "@/components/home/WhoItsFor";
import LocalLeadGen from "@/components/home/LocalLeadGen";
import HowToSwitch from "@/components/home/HowToSwitch";
import HomeFAQ, { homeFaqForSchema } from "@/components/home/HomeFAQ";
import ThankYou from "@/components/home/ThankYou";
import InnerLinks from "@/components/home/InnerLinks";

const SITE = "https://homeservicesbusinesscrm.com";
const breadcrumbs = [{ name: "Home", url: SITE }];

const industryListItems = industries.map((i) => ({
  name: `${i.name} CRM`,
  url: `${SITE}/industry/${generateIndustrySlug(i)}`,
  description: i.description,
}));

const loopSteps = [
  { name: "Lead generation", text: "Organic SEO sites and landing pages generate leads you own — no paid ads, no resold leads." },
  { name: "AI sales & follow-up", text: "An AI sales agent answers, qualifies, quotes, and books every inquiry instantly, 24/7." },
  { name: "Booking & scheduling", text: "Jobs land on the calendar automatically with the right crew, price, and recurring cadence." },
  { name: "Dispatch & GPS field ops", text: "Crews work from a bilingual mobile portal with GPS-verified check-in and check-out." },
  { name: "Payments & payouts", text: "Payment is collected automatically and crew payouts run via Stripe Connect on job completion." },
  { name: "Reviews & local SEO", text: "Completed jobs trigger review requests that feed local search rankings and the next lead." },
  { name: "Retention & retargeting", text: "Automated rebooking and win-back campaigns turn one-time jobs into recurring revenue." },
];

export default function Home() {
  return (
    <>
      {/* Full structured data */}
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <JsonLd
        data={webPageSchema(
          "Full Loop CRM | The All-in-One Home Service CRM Platform",
          "The first full-cycle CRM for home service businesses. AI-powered lead generation, sales automation, scheduling, GPS field operations, payments, reviews, and retargeting — one platform, zero integrations.",
          SITE,
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={softwareApplicationSchema("1000", "USD")} />
      <JsonLd
        data={serviceSchema(
          "Home Service CRM Software",
          "full-loop-crm-service-features",
          "Full-cycle home service CRM that generates leads, closes them with AI, books and dispatches jobs, collects payment, earns reviews, and retargets customers — one operator per trade per city.",
          "United States"
        )}
      />
      <JsonLd
        data={howToSchema(
          "How the Full Loop runs a home service business end to end",
          "The seven stages Full Loop CRM automates, from lead generation to repeat bookings.",
          loopSteps
        )}
      />
      <JsonLd data={itemListSchema("Home Service Industries Served by Full Loop CRM", industryListItems)} />
      <JsonLd data={faqSchema(homeFaqForSchema)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      {/* 1. Hero */}
      <Hero />

      {/* 2. About */}
      <About />

      {/* Quote band */}
      <QuoteBand
        dark
        quote={
          <>
            The first home service business to run itself &mdash; one person, about an hour a
            day. Now the platform that runs it is yours.
          </>
        }
        sub="The first full-cycle home service CRM"
      />

      {/* 3. NYC Maid case study (teaser → full page) */}
      <CaseStudyTeaser />

      {/* 4. Features — the seven stages */}
      <Features />

      {/* 4a. The AI agent */}
      <AIAgent />

      {/* Quote band */}
      <QuoteBand
        quote={<>Seven stages. One platform. Zero people doing the busywork.</>}
        sub="Automated lead generation, sales, scheduling & payments"
      />

      {/* 4b. Why operators switch — comparison */}
      <WhyFullLoop />

      {/* 4c. Automation scope — what's automated vs. what you control */}
      <AutomationScope />

      {/* 4c-ii. The always-on automation jobs */}
      <Automations />

      {/* 4d. Problems it solves */}
      <ProblemsSolved />

      {/* 4e. Pricing model */}
      <PricingModel />

      {/* 5. Real proof — live NYC Maid numbers */}
      <ProofStats />

      {/* 5b. Real customer reviews — live from The NYC Maid */}
      <Reviews />

      {/* 6. Industries we work with */}
      <IndustriesWeServe />

      {/* 6a. Who it's for — solo to multi-truck */}
      <WhoItsFor />

      {/* 6b. Local lead generation by city */}
      <LocalLeadGen />

      {/* 7. FAQ */}
      <HomeFAQ />

      {/* 7b. How to switch — onboarding */}
      <HowToSwitch />

      {/* Quote band */}
      <QuoteBand
        dark
        quote={<>You own the business. The platform runs it.</>}
        sub="Territory-exclusive home service business software"
      />

      {/* 8. Thank you + lead form (#lead-form) */}
      <ThankYou />

      {/* 100+ inner links */}
      <InnerLinks />
    </>
  );
}
