// @ts-nocheck
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { industries, services, serviceCategories, areas, h1Label } from "@/app/site/the-nyc-marketing-company/_lib/siteData";
import {
  JsonLd,
  serviceSchema,
  localBusinessSchema,
  webPageSchema,
  breadcrumbSchema,
  faqSchema,
} from "@/app/site/the-nyc-marketing-company/_lib/schema";
import IndustryPageClient from "./IndustryPageClient";

const PHONE = "212.202.9220";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = false;

export const dynamicParams = true

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ind = industries.find((i) => i.slug === slug);
  if (!ind) return {};
  const canonical = `https://www.thenycmarketingcompany.com/industries-we-offer-marketing-services-for/${ind.slug}`;
  return {
    title: `${ind.name} | SEO, Web Design & Digital Marketing`,
    description: `${ind.desc} The best organic marketing company in NYC. Custom SEO, web design, branding, and AI automation for ${ind.badge.toLowerCase()} businesses. Pricing starting at $100/hr. No contracts. Call/text ${PHONE}.`,
    alternates: { canonical },
    keywords: [
      `${ind.badge.toLowerCase()} marketing`,
      `${ind.badge.toLowerCase()} seo`,
      `${ind.badge.toLowerCase()} marketing company`,
      `${ind.badge.toLowerCase()} web design`,
      `${ind.badge.toLowerCase()} marketing nyc`,
      `seo for ${ind.badge.toLowerCase()}`,
      `marketing for ${ind.badge.toLowerCase()} businesses`,
      `${ind.badge.toLowerCase()} digital marketing`,
    ],
    openGraph: {
      title: `${ind.name} | SEO, Web Design & Digital Marketing`,
      description: `${ind.desc} The best organic marketing company in NYC. Pricing starting at $100/hr. Call/text ${PHONE}.`,
      url: canonical,
      siteName: "The NYC Marketing Company",
      type: "website",
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${ind.name} | SEO, Web Design & Digital Marketing`,
      description: `${ind.desc} Call/text ${PHONE}.`,
    },
  };
}

function getIndustryFaqs(badge: string) {
  const lb = badge.toLowerCase();
  return [
    { question: `How much does SEO cost for a ${lb} business?`, answer: `Monthly SEO for ${lb} businesses starts at $950/month with The NYC Marketing Company. This includes technical SEO, on-page optimization, Google Business Profile management, local citations, content strategy, and monthly reporting. The NYC average is $2,000-$5,000/month — we deliver more for less because every dollar goes to work, not overhead. Call ${PHONE} for a free quote.` },
    { question: `How long does SEO take to work for ${lb} businesses?`, answer: `Most ${lb} businesses see meaningful organic traffic improvements within 3-6 months. The timeline depends on your competitive landscape, current website authority, and the aggressiveness of the strategy. Less competitive markets can see results faster. We provide monthly reports from day one so you can track every improvement.` },
    { question: `What marketing services do you offer for ${lb} businesses?`, answer: `We offer SEO, custom web design, brand identity, Google Business Profile optimization, AI automation, content marketing, programmatic SEO, and full marketing strategy for ${lb} businesses. Every service is tailored to the ${lb} industry and designed to amplify the others for compounding growth.` },
    { question: `How much does a website cost for a ${lb} business?`, answer: `Custom websites for ${lb} businesses start at $4,600. The NYC average is $12,000-$25,000. Our sites are built on Next.js and React, load in under 2 seconds, score 90+ on Core Web Vitals, and are engineered for SEO and conversion from day one. You own 100% of the code.` },
    { question: `Why should a ${lb} business choose The NYC Marketing Company?`, answer: `We specialize exclusively in local business marketing. You work directly with senior strategists with 25+ years of experience — no junior account managers, no outsourcing. We've generated over $15.2M in attributable revenue for local businesses. No contracts, transparent pricing, and real results you can verify. Call ${PHONE}.` },
    { question: `Can you help a new ${lb} business get found on Google?`, answer: `Absolutely. We've launched startups from zero to page-one rankings. Starting SEO from day one means building the right foundation so you don't have to rebuild later. New ${lb} businesses often see faster results because there's less cleanup needed.` },
    { question: `Do you offer AI automation for ${lb} businesses?`, answer: `Yes. Our AI text bots handle lead qualification, appointment booking, review requests, and after-hours customer service — all via SMS. For ${lb} businesses, this means never missing a lead, even at 2am. AI automation starts at $1,000/month after a $25,000 setup. Call ${PHONE} or visit our AI page for details.` },
    { question: `What areas do you serve for ${lb} marketing?`, answer: `We serve ${lb} businesses across NYC (Manhattan, Brooklyn, Queens, Bronx, Staten Island), Long Island (Nassau County, Suffolk County), Westchester County, and Northern New Jersey. Every strategy is tailored to the local competitive landscape of your specific market.` },
  ];
}

export default async function IndustryPage({ params }: Props) {
  const { slug } = await params;
  const ind = industries.find((i) => i.slug === slug);
  if (!ind) notFound();

  const pageFaqs = getIndustryFaqs(ind.badge);
  const canonical = `https://www.thenycmarketingcompany.com/industries-we-offer-marketing-services-for/${ind.slug}`;
  const breadcrumbs = [
    { name: "Home", url: "https://www.thenycmarketingcompany.com" },
    { name: "Industries", url: "https://www.thenycmarketingcompany.com/industries-we-offer-marketing-services-for" },
    { name: ind.name, url: canonical },
  ];

  // Related industries: nearby in the list, skip current
  const idx = industries.findIndex((i) => i.slug === slug);
  const related = industries.filter((_, i) => i !== idx).slice(0, 12);

  // Top areas for linking
  const topAreas = areas.filter((a) => a.type === "Borough" || a.type === "County" || a.type === "Region" || a.type === "City");

  return (
    <>
      <JsonLd data={webPageSchema(ind.name, ind.desc, canonical, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(pageFaqs)} />
      <JsonLd data={localBusinessSchema("New York City", "City")} />
      {services.slice(0, 6).map((s) => (
        <JsonLd key={s.slug} data={serviceSchema(s.name, s.slug, `${s.name} for ${ind.badge.toLowerCase()} businesses.`, "New York City")} />
      ))}
      <IndustryPageClient
        industry={ind}
        label={h1Label(ind.badge)}
        serviceCategories={serviceCategories}
        topAreas={topAreas}
        relatedIndustries={related}
        pageFaqs={pageFaqs}
      />
    </>
  );
}
