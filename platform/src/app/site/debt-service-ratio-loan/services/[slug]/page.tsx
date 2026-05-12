// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { services, findServiceBySlug, getServiceUrl } from "@/app/site/debt-service-ratio-loan/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema, articleSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";
import { getServiceContent } from "@/app/site/debt-service-ratio-loan/_lib/serviceContent";
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

  const title = `${service.name} — Rates, Requirements & How to Qualify`;
  const description = `${service.shortDesc} Rates, requirements, expert tips, and how to apply for ${service.name}. Free DSCR calculator included.`;

  return {
    title,
    description,
    alternates: { canonical: `https://www.debtserviceratioloan.com${getServiceUrl(service)}` },
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) notFound();

  const otherServices = services.filter((s) => s.slug !== slug).slice(0, 6);
  const content = getServiceContent(slug);
  const pageUrl = `https://www.debtserviceratioloan.com${getServiceUrl(service)}`;

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
          `${service.name} — Complete Guide: Rates, Requirements & How to Qualify`,
          service.description,
          pageUrl,
          "2026-03-23",
          "2026-03-24"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.debtserviceratioloan.com" },
          { name: "Services", url: "https://www.debtserviceratioloan.com/services" },
          { name: service.name, url: pageUrl },
        ])}
      />
      {content && content.faqs.length > 0 && (
        <JsonLd data={faqSchema(content.faqs)} />
      )}
      <ServicePageClient service={service} otherServices={otherServices} content={content} />
    </>
  );
}
