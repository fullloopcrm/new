// @ts-nocheck
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  serviceCategories,
  getAllServiceSlugs,
  findServiceBySlug,
  faqs,
} from "@/app/site/the-nyc-marketing-company/_lib/siteData";
import {
  JsonLd,
  serviceSchema,
  webPageSchema,
  breadcrumbSchema,
  faqSchema,
} from "@/app/site/the-nyc-marketing-company/_lib/schema";
import ServicePageClient from "./ServicePageClient";

export const revalidate = false;

export function generateStaticParams() {
  return getAllServiceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = findServiceBySlug(slug);
  if (!result) return {};

  const { category, subService } = result;
  const name = subService ? subService.name : category.name;
  const desc = subService ? subService.shortDesc : category.description;
  const fallbackDesc = `${desc} Consortium NYC (Now The NYC Marketing Company). Call/text (212) 202-9220.`;
  const fallbackTitle = `NYC ${name} | Consortium NYC (Now The NYC Marketing Company)`;

  const title = subService ? fallbackTitle : (category.metaTitle ?? fallbackTitle);
  const description = subService ? fallbackDesc : (category.metaDescription ?? fallbackDesc);

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.consortiumnyc.com/services/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.consortiumnyc.com/services/${slug}`,
    },
  };
}

function getServiceFaqs(slug: string) {
  const siteDataFaqs = (faqs as Record<string, { question: string; answer: string }[]>)[slug];
  if (siteDataFaqs && siteDataFaqs.length > 0) return siteDataFaqs;

  const faqMap: Record<string, { question: string; answer: string }[]> = {
    "search-engine-optimization-seo-nyc": [
      { question: "How long does SEO take to show results?", answer: "Most businesses see meaningful traffic growth in 3-6 months. We've gotten page 1 rankings in under 15 days for certain strategies like EMD micro sites, but sustainable organic growth typically compounds over 6-12 months." },
      { question: "Do you guarantee page 1 rankings?", answer: "No one can guarantee specific rankings — Google's algorithm has hundreds of factors. What we guarantee is the work: technical optimization, strategic content, link building, and monthly reporting. Our portfolio shows consistent results across every client." },
      { question: "What's included in your monthly SEO service?", answer: "Technical audits and fixes, on-page optimization, content strategy and creation, local SEO and Google Business Profile management, link building, competitor monitoring, and detailed monthly reporting with real metrics." },
      { question: "Do you work with businesses outside NYC?", answer: "Yes. While our expertise is rooted in NYC's competitive market, our SEO strategies work for businesses anywhere. We've ranked businesses in Boston, Destin, and other cities." },
    ],
    "web-design-nyc": [
      { question: "How long does it take to build a custom website?", answer: "Most custom website projects take 4-8 weeks from kickoff to launch, depending on complexity. Simple brochure sites can be completed in 3-4 weeks, while complex e-commerce or web application projects may take 8-12 weeks." },
      { question: "Do you build websites on WordPress or custom code?", answer: "We build on Next.js and React for maximum performance and SEO. No WordPress, no Wix, no Squarespace. Custom code means faster load times, better Core Web Vitals, and complete control over your site." },
      { question: "Will my website be optimized for mobile devices?", answer: "Every website we build is mobile-first responsive. With over 60% of web traffic coming from mobile devices, this approach ensures your site delivers an excellent experience on every screen size." },
      { question: "Do I own my website?", answer: "Yes. You own 100% of the code, design, content, and domain. No proprietary platforms, no lock-in. If you ever leave, you take everything with you." },
    ],
    "branding-identity-services-nyc": [
      { question: "What is included in a branding package?", answer: "Brand strategy and positioning, logo design with multiple concepts and revisions, complete visual identity system, brand guidelines document, and brand voice and messaging framework." },
      { question: "How long does the branding process take?", answer: "A complete brand identity project typically takes 4-6 weeks including strategy, concept development, revisions, and final deliverables." },
      { question: "Do you offer rebranding services?", answer: "Yes. We help businesses that have outgrown their current brand. Our rebranding process starts with a comprehensive brand audit then builds a refreshed identity aligned with your goals." },
    ],
    "ai-automation-services-in-nyc": [
      { question: "What kind of AI bots do you build?", answer: "We build custom SMS-based AI text bots (like Selena), AI chatbots, automated lead follow-up systems, review request automation, and appointment scheduling bots. All built on real infrastructure — Telnyx, Supabase, and Claude AI — not third-party plugins." },
      { question: "How much does AI automation cost?", answer: "AI automation starts at $1,000/month after a $25,000 setup and development cost. The setup includes custom bot development, CRM integration, workflow design, and testing. Monthly covers hosting, AI usage, monitoring, and ongoing improvements." },
      { question: "Can the AI bot integrate with my existing systems?", answer: "Yes. We build custom integrations with your CRM, scheduling system, and communication tools. Everything is built on open APIs so there's no vendor lock-in." },
    ],
    "programmatic-seo-services-in-nyc": [
      { question: "What is programmatic SEO?", answer: "Programmatic SEO is the strategy of deploying hundreds or thousands of unique, keyword-targeted pages at scale. Each page targets a specific search query with unique content, internal linking, and schema markup. It's how we took Moodap™ from 0 to 2,000 page 1 rankings in 2 months." },
      { question: "Isn't this just duplicate content with swapped city names?", answer: "No. That's the cheap version competitors do. Our programmatic pages have unique content, unique data, unique internal linking structures, and unique schema markup. Google can tell the difference, and so can your customers." },
      { question: "How much does programmatic SEO cost?", answer: "Programmatic SEO starts at $5,000 for the initial build and strategy. This includes keyword research, template architecture, content generation, and deployment. Ongoing optimization is included in monthly SEO retainers." },
    ],
    "custom-crm-development-in-nyc": [
      { question: "Why build a custom CRM instead of using HubSpot or Salesforce?", answer: "Custom CRMs are built for your exact workflow — no features you don't need, no monthly SaaS fees. You own the code and data. A typical business pays $300-500/month for a CRM they use 10% of. Our custom builds pay for themselves within 2-3 years." },
      { question: "What technology do you build CRMs with?", answer: "Next.js for the frontend, Supabase for the database and auth, Resend for email, and Telnyx for SMS/voice. All open-source foundations with no vendor lock-in." },
      { question: "How long does a custom CRM take to build?", answer: "A basic CRM with lead tracking, pipeline management, and automated follow-up takes 8-12 weeks. More complex builds with AI integration, scheduling, and multi-location support take 12-20 weeks." },
      { question: "How much does a custom CRM cost?", answer: "Custom CRM development starts at $25,000. This includes discovery, design, development, testing, deployment, and training. After launch, hosting is minimal (typically under $50/month) because you own the infrastructure." },
    ],
    "google-business-profile-services-in-nyc": [
      { question: "Can you guarantee Google Business Profile verification?", answer: "No. Verification is controlled entirely by Google. We submit the verification through Google's official process and optimize everything to maximize approval chances, but Google makes the final decision." },
      { question: "What does GBP optimization include?", answer: "Complete optimization of every field — business description, categories, services, products, photos, Q&A, posts, and review management. We also ensure NAP consistency across all citations." },
      { question: "How much does GBP setup cost?", answer: "GBP creation and verification submission is $500. Ongoing management (weekly posts, review responses, Q&A monitoring) is included in our monthly SEO retainers." },
    ],
  };
  return faqMap[slug] || [];
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = findServiceBySlug(slug);
  if (!result) notFound();

  const { category, subService } = result;
  const name = subService ? subService.name : category.name;
  const desc = subService ? subService.shortDesc : category.description;
  const serviceFaqs = getServiceFaqs(slug);
  const pageUrl = `https://www.consortiumnyc.com/services/${slug}`;
  const breadcrumbs = [
    { name: "Home", url: "https://www.consortiumnyc.com" },
    { name: "Services", url: "https://www.consortiumnyc.com/nyc-marketing-company-services-list" },
    ...(subService
      ? [
          {
            name: category.name,
            url: `https://www.consortiumnyc.com/services/${category.slug}`,
          },
          { name: subService.name, url: pageUrl },
        ]
      : [{ name: category.name, url: pageUrl }]),
  ];

  return (
    <>
      <JsonLd data={serviceSchema(name, slug, desc)} />
      <JsonLd data={webPageSchema(`${name} Services in NYC | Consortium NYC (Now The NYC Marketing Company)`, desc, pageUrl, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      {serviceFaqs.length > 0 && <JsonLd data={faqSchema(serviceFaqs)} />}
      <ServicePageClient
        category={category}
        subService={subService}
        serviceFaqs={serviceFaqs}
      />
    </>
  );
}