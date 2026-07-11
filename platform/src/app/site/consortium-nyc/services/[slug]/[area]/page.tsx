import { notFound } from "next/navigation";
import { services, areas, serviceCategories, getAllServiceSlugs, findServiceBySlug } from "@/app/site/consortium-nyc/_lib/siteData";
import {
  JsonLd,
  serviceSchema,
  localBusinessSchema,
  webPageSchema,
  breadcrumbSchema,
  faqSchema,
} from "@/app/site/consortium-nyc/_lib/schema";
import ServiceAreaPageClient from "./ServiceAreaPageClient";

export const revalidate = false;

export const dynamicParams = true;

// Return empty — pages build on first visit and cache forever (revalidate = false).
// Saves ~6,200 ISR writes per deploy.
export async function generateStaticParams() { return [] }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; area: string }>;
}) {
  const { slug, area: areaSlug } = await params;
  const found = findServiceBySlug(slug);
  const area = areas.find((a) => a.slug === areaSlug);
  if (!found || !area) return {};

  const serviceName = found.subService ? found.subService.name : found.category.name;
  const regionLabel = area.region === area.name ? area.name : area.region;

  return {
    title: `${serviceName} in ${area.name} | ${regionLabel} Web Design | Consortium NYC`,
    description: `${serviceName} for ${area.name} businesses. Local SEO from $950/month, custom websites from $4,600. Data-driven ${serviceName.toLowerCase()} strategies tailored to the ${area.name} market. No contracts. Call/text (212) 202-9220.`,
    alternates: {
      canonical: `https://www.consortiumnyc.com/services/${slug}/${area.slug}`,
    },
  };
}

function getServiceAreaFaqs(serviceName: string, areaName: string, regionName: string) {
  return [
    { question: `How much does ${serviceName.toLowerCase()} cost for a ${areaName} business?`, answer: `${serviceName} for ${areaName} businesses starts at $950/month for SEO and $4,600 for custom websites. The exact investment depends on your industry competitiveness in ${areaName} and the scope of work needed. We provide a customized proposal after a free consultation.` },
    { question: `How long does ${serviceName.toLowerCase()} take to show results in ${areaName}?`, answer: `Most ${areaName} businesses see meaningful improvements within 3–6 months for SEO. Web design projects launch in 3–5 weeks. The timeline depends on your industry competitiveness in the ${regionName} market. We provide monthly reporting from day one.` },
    { question: `Why do ${areaName} businesses choose Consortium NYC for ${serviceName.toLowerCase()}?`, answer: `We specialize in local business marketing and know the ${areaName} market inside and out. You work directly with senior strategists — no junior account managers, no outsourcing. No contracts, transparent pricing, and over $15.2M in attributable revenue generated for local businesses.` },
    { question: `Do you offer other marketing services in ${areaName} besides ${serviceName.toLowerCase()}?`, answer: `Yes. We offer SEO, custom web design, brand identity, Google Business Profile optimization, AI automation, content marketing, and marketing strategy for ${areaName} businesses. Every service is designed to amplify the others for compounding growth.` },
    { question: `Can you help a new ${areaName} business with ${serviceName.toLowerCase()}?`, answer: `Absolutely. We've launched startups from zero to page-one rankings. Starting ${serviceName.toLowerCase()} from day one means building the right foundation so you don't have to rebuild later. New businesses in ${areaName} often see faster results because there's less cleanup needed.` },
  ];
}

export default async function ServiceAreaPage({
  params,
}: {
  params: Promise<{ slug: string; area: string }>;
}) {
  const { slug, area: areaSlug } = await params;
  const area = areas.find((a) => a.slug === areaSlug);
  const found = findServiceBySlug(slug);
  if (!found || !area) notFound();

  const { category, subService } = found;
  const serviceName = subService ? subService.name : category.name;
  const serviceSlug = subService ? subService.slug : category.slug;
  const serviceDesc = subService ? subService.shortDesc : category.description;
  const service = { name: serviceName, slug: serviceSlug, description: serviceDesc, tagline: category.tagline, shortDesc: subService ? subService.shortDesc : category.shortDesc, icon: category.icon, features: category.features };

  const pageFaqs = getServiceAreaFaqs(serviceName, area.name, area.region);
  const pageUrl = `https://www.consortiumnyc.com/services/${serviceSlug}/${area.slug}`;
  const regionLabel = area.region === area.name ? area.name : area.region;

  const breadcrumbs = [
    { name: "Home", url: "https://www.consortiumnyc.com" },
    { name: "Services", url: "https://www.consortiumnyc.com/nyc-marketing-company-services-list" },
    { name: category.name, url: `https://www.consortiumnyc.com/services/${category.slug}` },
    ...(subService ? [{ name: subService.name, url: `https://www.consortiumnyc.com/services/${subService.slug}` }] : []),
    { name: area.name, url: pageUrl },
  ];

  const siblingAreas = areas.filter((a) => a.region === area.region && a.slug !== area.slug);
  const otherServices = services.filter((s) => s.slug !== serviceSlug);

  return (
    <>
      <JsonLd data={serviceSchema(serviceName, serviceSlug, serviceDesc, area.name)} />
      <JsonLd data={localBusinessSchema(area.name, area.type)} />
      <JsonLd data={webPageSchema(`${serviceName} in ${area.name} | Consortium NYC`, `${serviceName} for ${area.name} businesses.`, pageUrl, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(pageFaqs)} />
      <ServiceAreaPageClient
        service={service}
        area={area}
        regionLabel={regionLabel}
        pageFaqs={pageFaqs}
        siblingAreas={siblingAreas}
        otherServices={otherServices}
        subServices={category.subServices}
      />
    </>
  );
}
