// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { services, findServiceBySlug, getServiceUrl, SITE_DOMAIN } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema, articleSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";
import { getServiceContent } from "@/app/site/the-nyc-interior-designer/_lib/serviceContent";
import ServicePageClient from "./ServicePageClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true
export const revalidate = 86400

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) return {};

  const title = `${service.h1} | Free Consultation`;
  const description = `${service.tagline} Features, process, expert tips, and how to get started with ${service.name} in New York City. Free consultations available.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_DOMAIN}${getServiceUrl(service)}` },
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) notFound();

  const content = getServiceContent(slug);
  const pageUrl = `${SITE_DOMAIN}${getServiceUrl(service)}`;

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `${service.name} — Complete Guide`,
          service.description,
          pageUrl
        )}
      />
      <JsonLd
        data={articleSchema(
          `${service.name} in NYC — Complete Guide: Features, Process & What to Expect`,
          service.description,
          pageUrl,
          "2026-04-02",
          "2026-04-02"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_DOMAIN },
          { name: "Services", url: `${SITE_DOMAIN}/services` },
          { name: service.name, url: pageUrl },
        ])}
      />
      {content && content.faqs.length > 0 && (
        <JsonLd data={faqSchema(content.faqs)} />
      )}
      <ServicePageClient service={service} content={content} />
    </>
  );
}
