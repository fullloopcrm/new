// @ts-nocheck
import { notFound } from "next/navigation";
import { areas, services, serviceCategories } from "@/app/site/consortium-nyc/_lib/siteData";
import {
  JsonLd,
  localBusinessSchema,
  webPageSchema,
  breadcrumbSchema,
  faqSchema,
  serviceSchema,
} from "@/app/site/consortium-nyc/_lib/schema";
import AreaPageClient from "./AreaPageClient";

export const revalidate = false;

export function generateStaticParams() {
  return areas.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const area = areas.find((a) => a.slug === slug);
  if (!area) return {};

  const regionLabel = area.region === area.name ? area.name : area.region;

  return {
    title: `${area.name} Marketing Company | SEO, Web Design & Branding | The NYC Marketing Company`,
    description: `Marketing company serving ${area.name}${area.region !== area.name ? `, ${area.region}` : ""}. Local SEO starting at $950/month, custom websites from $4,600, branding, AI automation, and Google Business Profile optimization for ${area.name} businesses. Call/text (212) 202-9220.`,
    alternates: { canonical: `https://www.consortiumnyc.com/services-areas-we-offer-marketing-services-in/${area.slug}` },
    openGraph: {
      title: `${area.name} Marketing Company | The NYC Marketing Company`,
      description: `Local SEO, web design, and branding for ${area.name} businesses. $950/month SEO. $4,600 websites. Call/text (212) 202-9220.`,
      url: `https://www.consortiumnyc.com/services-areas-we-offer-marketing-services-in/${area.slug}`,
    },
  };
}

function getAreaFaqs(areaName: string, regionName: string) {
  return [
    { question: `How much does SEO cost for a business in ${areaName}?`, answer: `Monthly SEO for ${areaName} businesses starts at $950/month with The NYC Marketing Company. This includes technical SEO, on-page optimization, Google Business Profile management, local citations, content strategy, and monthly reporting. The NYC average is $2,000–$5,000/month — we deliver more for less because every dollar goes to work, not overhead.` },
    { question: `How long does SEO take to work in ${areaName}?`, answer: `Most ${areaName} businesses see meaningful organic traffic improvements within 3–6 months. The timeline depends on your industry competitiveness and current website authority. Less competitive niches in ${areaName} can see results faster. We provide monthly reports from day one so you can track every improvement.` },
    { question: `What marketing services do you offer in ${areaName}?`, answer: `We offer SEO, custom web design, brand identity, Google Business Profile optimization, AI automation, content marketing, and marketing strategy for ${areaName} businesses. Every service is tailored to the ${regionName} market and your specific industry competition.` },
    { question: `How much does a website cost for a ${areaName} business?`, answer: `Custom websites built for ${areaName} businesses start at $4,600. The NYC average is $12,000–$25,000. Our sites are built on Next.js and React, load in under 2 seconds, score 90+ on Core Web Vitals, and are engineered for SEO and conversion from day one.` },
    { question: `Can you help my ${areaName} business rank on Google Maps?`, answer: `Yes — Google Maps rankings are one of our specialties. We optimize your Google Business Profile, build local citations across 80+ directories, manage your reviews, and create hyper-local content specifically for ${areaName}. The map pack is where most local leads come from.` },
    { question: `Why should a ${areaName} business choose The NYC Marketing Company?`, answer: `We specialize exclusively in local business marketing across NYC, Long Island, and Westchester. You work directly with senior strategists with 25+ years of experience — no junior account managers, no outsourcing. We've generated over $15.2M in attributable revenue for local businesses. No contracts, transparent pricing, real results.` },
  ];
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const area = areas.find((a) => a.slug === slug);
  if (!area) notFound();

  const areaFaqs = getAreaFaqs(area.name, area.region);
  const pageUrl = `https://www.consortiumnyc.com/services-areas-we-offer-marketing-services-in/${area.slug}`;
  const breadcrumbs = [
    { name: "Home", url: "https://www.consortiumnyc.com" },
    { name: "Service Areas", url: "https://www.consortiumnyc.com/services-areas-we-offer-marketing-services-in" },
    { name: area.name, url: pageUrl },
  ];

  // Sibling areas in same region
  const siblings = areas.filter((a) => a.region === area.region && a.slug !== area.slug);

  return (
    <>
      <JsonLd data={localBusinessSchema(area.name, area.type)} />
      <JsonLd data={webPageSchema(`${area.name} Marketing Company | The NYC Marketing Company`, `Marketing company serving ${area.name}. Local SEO, web design, branding, and AI automation.`, pageUrl, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(areaFaqs)} />
      {services.slice(0, 6).map((s) => (
        <JsonLd key={s.slug} data={serviceSchema(s.name, s.slug, s.description, area.name)} />
      ))}
      <AreaPageClient area={area} siblings={siblings} areaFaqs={areaFaqs} serviceCategories={serviceCategories} />
    </>
  );
}
