import { notFound } from "next/navigation";
import { services, areas, industries, serviceCategories, h1Label } from "@/app/site/the-nyc-marketing-company/_lib/siteData";
import {
  JsonLd,
  serviceSchema,
  localBusinessSchema,
  webPageSchema,
  breadcrumbSchema,
  faqSchema,
} from "@/app/site/the-nyc-marketing-company/_lib/schema";
import ServiceIndustryAreaClient from "./ServiceIndustryAreaClient";

const PHONE = "212.202.9220";

// All 127K+ combinations render on-demand (ISR) to stay under Vercel deploy limits.
// generateStaticParams returns empty — pages are built on first request and cached.
// revalidate = false → once cached, never regenerate (saves ISR writes).
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; service: string; area: string }>;
}) {
  const { slug, service: svcSlug, area: areaSlug } = await params;
  const ind = industries.find((i) => i.slug === slug);
  const svc = services.find((s) => s.slug === svcSlug);
  const area = areas.find((a) => a.slug === areaSlug);
  if (!ind || !svc || !area) return {};

  const regionLabel = area.region === area.name ? area.name : area.region;
  const label = h1Label(ind.badge);
  const h1 = `${svc.name} for ${label} Businesses in ${area.name}`;
  const canonical = `https://www.thenycmarketingcompany.com/industries-we-offer-marketing-services-for/${ind.slug}/${svc.slug}/${area.slug}`;

  return {
    title: `${h1} | ${regionLabel} Marketing Company`,
    description: `${svc.name} for ${label.toLowerCase()} businesses in ${area.name}${area.region !== area.name ? `, ${area.region}` : ""}. Local SEO from $950/mo, custom websites from $4,600. Data-driven ${svc.name.toLowerCase()} strategies for ${label.toLowerCase()} companies. No contracts. Call ${PHONE}.`,
    alternates: { canonical },
    keywords: [
      `${svc.name.toLowerCase()} ${label.toLowerCase()} ${area.name}`,
      `${label.toLowerCase()} ${svc.name.toLowerCase()} ${area.name}`,
      `${svc.name.toLowerCase()} for ${label.toLowerCase()} in ${area.name}`,
      `${label.toLowerCase()} marketing ${area.name}`,
      `${label.toLowerCase()} marketing company ${area.name}`,
      `${area.name} ${label.toLowerCase()} ${svc.name.toLowerCase()}`,
      `best ${svc.name.toLowerCase()} ${label.toLowerCase()} ${regionLabel}`,
      `${label.toLowerCase()} digital marketing ${area.name}`,
    ],
    openGraph: {
      title: h1,
      description: `${svc.name} for ${label.toLowerCase()} businesses in ${area.name}. $950/mo SEO. $4,600 websites. No contracts. ${PHONE}.`,
      url: canonical,
      siteName: "Consortium NYC (Now The NYC Marketing Company)",
      type: "website",
    },
    twitter: {
      card: "summary_large_image" as const,
      title: h1,
      description: `${svc.name} for ${label.toLowerCase()} businesses in ${area.name}. Call ${PHONE}.`,
    },
  };
}

function getFaqs(serviceName: string, label: string, areaName: string, regionName: string) {
  const lb = label.toLowerCase();
  return [
    { question: `How much does ${serviceName.toLowerCase()} cost for a ${lb} business in ${areaName}?`, answer: `${serviceName} for ${lb} businesses in ${areaName} starts at $950/month for SEO and $4,600 for custom websites. Pricing depends on the competitiveness of the ${lb} market in ${areaName} and the scope of work. We provide a free, customized proposal after your consultation. Call ${PHONE} to get started.` },
    { question: `How long does ${serviceName.toLowerCase()} take to show results for ${lb} companies in ${areaName}?`, answer: `Most ${lb} businesses in ${areaName} see measurable improvements within 3-6 months for SEO campaigns. Web design projects typically launch in 3-5 weeks. The timeline depends on how competitive the ${lb} space is in ${regionName}. We provide monthly reporting from day one so you can track every improvement.` },
    { question: `Why should a ${lb} business in ${areaName} choose Consortium NYC (Now The NYC Marketing Company)?`, answer: `We specialize in marketing for ${lb} businesses and know the ${areaName} market inside and out. You work directly with senior strategists who have 25+ years of experience - no junior account managers, no outsourcing. We've generated over $15.2M in attributable revenue for local businesses. No contracts, transparent pricing, real results. Call us at ${PHONE}.` },
    { question: `What ${serviceName.toLowerCase()} strategies work best for ${lb} businesses in ${areaName}?`, answer: `For ${lb} businesses in ${areaName}, we focus on hyper-local keyword targeting, Google Business Profile optimization, industry-specific content, technical SEO, and competitive link building. We study what your ${lb} competitors are doing in ${areaName} and build a strategy that outperforms them.` },
    { question: `Do you offer other services for ${lb} businesses in ${areaName}?`, answer: `Yes. Beyond ${serviceName.toLowerCase()}, we offer SEO, custom web design, brand identity, Google Business Profile optimization, AI automation, content marketing, and full marketing strategy for ${lb} businesses in ${areaName}. Every service is designed to amplify the others for compounding growth. Call ${PHONE} for a free consultation.` },
  ];
}

export default async function ServiceIndustryAreaPage({
  params,
}: {
  params: Promise<{ slug: string; service: string; area: string }>;
}) {
  const { slug, service: svcSlug, area: areaSlug } = await params;
  const ind = industries.find((i) => i.slug === slug);
  const svc = services.find((s) => s.slug === svcSlug);
  const area = areas.find((a) => a.slug === areaSlug);
  if (!ind || !svc || !area) notFound();

  const category = serviceCategories.find((c) => c.slug === svcSlug);
  const regionLabel = area.region === area.name ? area.name : area.region;
  const label = h1Label(ind.badge);
  const h1 = `${svc.name} for ${label} Businesses in ${area.name}`;
  const pageFaqs = getFaqs(svc.name, label, area.name, area.region);
  const pageUrl = `https://www.thenycmarketingcompany.com/industries-we-offer-marketing-services-for/${ind.slug}/${svc.slug}/${area.slug}`;

  const breadcrumbs = [
    { name: "Home", url: "https://www.thenycmarketingcompany.com" },
    { name: "Industries", url: "https://www.thenycmarketingcompany.com/industries-we-offer-marketing-services-for" },
    { name: ind.badge, url: `https://www.thenycmarketingcompany.com/industries-we-offer-marketing-services-for/${ind.slug}` },
    { name: svc.name, url: `https://www.thenycmarketingcompany.com/services/${svc.slug}` },
    { name: area.name, url: pageUrl },
  ];

  const siblingAreas = areas.filter((a) => a.region === area.region && a.slug !== area.slug);
  const otherServices = services.filter((s) => s.slug !== svc.slug);
  const relatedIndustries = industries.filter((i) => i.slug !== ind.slug).slice(0, 8);

  return (
    <>
      <JsonLd data={serviceSchema(svc.name, svc.slug, `${svc.name} for ${label.toLowerCase()} businesses in ${area.name}. ${ind.desc}`, area.name)} />
      <JsonLd data={localBusinessSchema(area.name, area.type)} />
      <JsonLd data={webPageSchema(h1, `${svc.name} for ${label.toLowerCase()} businesses in ${area.name}. Call ${PHONE}.`, pageUrl, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(pageFaqs)} />
      <ServiceIndustryAreaClient
        service={svc}
        industry={ind}
        area={area}
        regionLabel={regionLabel}
        h1={h1}
        h1Label={label}
        pageFaqs={pageFaqs}
        siblingAreas={siblingAreas}
        otherServices={otherServices}
        relatedIndustries={relatedIndustries}
        subServices={category?.subServices || []}
      />
    </>
  );
}