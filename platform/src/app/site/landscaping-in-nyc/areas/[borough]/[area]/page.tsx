// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  areas,
  services,
  findAreaBySlug,
  getAreaUrl,
  getAreaServiceUrl,
  getAreasByBorough,
  getBoroughUrl,
  getServiceUrl,
  SITE_DOMAIN,
  SITE_NAME,
  PHONE,
  SMS_HREF,
} from "@/app/site/landscaping-in-nyc/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";

interface Props {
  params: Promise<{ borough: string; area: string }>;
}

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough, area: areaSlug } = await params;
  const area = findAreaBySlug(borough, areaSlug);
  if (!area) return {};

  return {
    title: `Landscaping in ${area.name}, ${area.borough} — Services & Free Estimates`,
    description: `Professional landscaping in ${area.name}, ${area.borough}. 18 services including design, installation, maintenance, hardscaping, and more. Free estimates available.`,
    alternates: { canonical: `${SITE_DOMAIN}${getAreaUrl(area)}` },
  };
}

export default async function AreaPage({ params }: Props) {
  const { borough, area: areaSlug } = await params;
  const area = findAreaBySlug(borough, areaSlug);
  if (!area) notFound();

  const nearbyAreas = getAreasByBorough(area.boroughSlug)
    .filter((a) => a.slug !== area.slug)
    .slice(0, 12);

  const canonicalUrl = `${SITE_DOMAIN}${getAreaUrl(area)}`;

  const areaFaqs = [
    {
      question: `How do I get landscaping services in ${area.name}, ${area.borough}?`,
      answer: `Getting landscaping services in ${area.name} is easy. Contact us at ${PHONE} or request a free estimate online. We will schedule an on-site consultation within 48 hours to assess your property, discuss your vision, and provide a detailed proposal. Our ${area.borough} crews handle everything from design through installation and ongoing maintenance. No project is too small or too large for our team.`,
    },
    {
      question: `What landscaping services do you offer in ${area.name}?`,
      answer: `We offer all 18 of our professional landscaping services in ${area.name}, including landscape design, rooftop gardens and terraces, irrigation systems, landscape lighting, lawn and garden maintenance, snow removal, seasonal flower rotations, tree and shrub care, patio and hardscape design, retaining walls, sod and turf installation, drainage solutions, commercial landscaping, residential landscaping, planting and garden beds, fence and gate installation, outdoor living spaces, and power washing and cleanup.`,
    },
    {
      question: `How much does landscaping cost in ${area.name}, ${area.borough}?`,
      answer: `Landscaping costs in ${area.name} depend on the scope of work, property size, materials, and services needed. Basic maintenance plans start around $200-$500/month. Garden design and planting projects range from $3,000-$15,000. Full landscape design and installation projects typically range from $8,000-$75,000+. We provide free, no-obligation estimates for all ${area.name} projects so you know exactly what to expect before we begin.`,
    },
    {
      question: `Do you offer maintenance plans in ${area.name}?`,
      answer: `Yes — we offer comprehensive year-round maintenance plans for ${area.name} properties. Our plans cover spring cleanup and planting, summer lawn care and garden maintenance, fall leaf removal and bed winterization, and winter snow and ice management. We offer weekly, biweekly, and monthly service frequencies with plans customized to your property's specific needs and budget.`,
    },
    {
      question: `Is ${area.name} a good area for outdoor landscaping projects?`,
      answer: `${area.name} in ${area.borough} offers excellent opportunities for outdoor landscaping. The neighborhood's property types and outdoor spaces lend themselves well to a variety of landscaping projects. Whether you have a small backyard, a rooftop terrace, a front garden, or a larger residential property, our team designs solutions specifically suited to ${area.name}'s unique characteristics including local soil conditions, sun exposure patterns, and architectural style.`,
    },
    {
      question: `Can you work with my building management or co-op board in ${area.name}?`,
      answer: `Absolutely. We regularly coordinate with building management companies, co-op boards, and condo associations throughout ${area.borough}. Our team prepares professional presentation packages including detailed plans, material specifications, timelines, and insurance documentation. We handle all permit applications with NYC DOB when required and maintain full liability insurance for your building's protection.`,
    },
    {
      question: `What types of properties do you landscape in ${area.name}?`,
      answer: `We landscape all property types in ${area.name}: brownstones and townhouses, single-family homes, apartment building common areas, rooftops and terraces, commercial storefronts and offices, restaurants and hospitality venues, community gardens, and large residential estates. Each property type gets a customized approach based on its unique characteristics, challenges, and opportunities.`,
    },
    {
      question: `How long does a typical landscaping project take in ${area.name}?`,
      answer: `Project timelines in ${area.name} vary by scope: basic garden plantings take 1-3 days, patio and hardscape installations take 1-3 weeks, full landscape design and installation takes 2-6 weeks, and rooftop garden builds take 3-8 weeks depending on structural requirements. We provide detailed timelines during your free consultation and keep you updated throughout the project.`,
    },
  ];

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${SITE_NAME} — ${area.name} Landscaping`,
    description: `Professional landscaping services in ${area.name}, ${area.borough}. Design, installation, and year-round maintenance.`,
    url: canonicalUrl,
    telephone: "+1-212-470-9637",
    areaServed: {
      "@type": "Place",
      name: `${area.name}, ${area.borough}`,
    },
    parentOrganization: {
      "@id": `${SITE_DOMAIN}/#organization`,
    },
    serviceType: "Landscaping",
    priceRange: "$$-$$$$",
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to Get Landscaping in ${area.name}, ${area.borough}`,
    description: `Step-by-step guide to starting a landscaping project in ${area.name}, ${area.borough}. From consultation to completion.`,
    totalTime: "P21D",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: "Varies by project",
    },
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: `Contact us about your ${area.name} property`,
        text: `Call ${PHONE} or request a free estimate online. Tell us about your property, your vision, and your budget. We will schedule a site visit within 48 hours.`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "On-site consultation and assessment",
        text: `Our landscape designer will visit your ${area.name} property to assess soil conditions, sun exposure, drainage, existing plantings, and architectural context. We will discuss your goals and preferences in detail.`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Receive your custom landscape proposal",
        text: "Within one week, you will receive a detailed proposal including design concepts, material selections, planting plans, timeline, and transparent pricing. We offer phased installation options to fit any budget.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Permit and approval coordination",
        text: `If your ${area.name} project requires NYC DOB permits or co-op/condo board approval, our team handles the entire process. We prepare all documentation and attend board meetings on your behalf when needed.`,
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Professional installation by expert crews",
        text: `Our experienced ${area.borough} crews execute your project with precision and care. We protect your property throughout construction and maintain clean, organized work sites.`,
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Enjoy your new landscape with optional maintenance",
        text: `After installation, we walk you through your new landscape and provide care instructions. Sign up for a maintenance plan to keep everything looking its best year-round.`,
      },
    ],
  };

  return (
    <>
      {/* Structured Data */}
      <JsonLd
        data={webPageSchema(
          `Landscaping in ${area.name}, ${area.borough}`,
          `Professional landscaping services in ${area.name}, ${area.borough}. 18 services, free estimates, and expert crews.`,
          canonicalUrl
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_DOMAIN },
          { name: "Areas", url: `${SITE_DOMAIN}/areas` },
          { name: area.borough, url: `${SITE_DOMAIN}${getBoroughUrl(area.boroughSlug)}` },
          { name: area.name, url: canonicalUrl },
        ])}
      />
      <JsonLd data={faqSchema(areaFaqs)} />
      <JsonLd data={localBusinessSchema} />
      <JsonLd data={howToSchema} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-20 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 inline-block rounded-full border border-green-300/40 bg-green-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-green-200 font-cta">
            <Link href={getBoroughUrl(area.boroughSlug)} className="hover:text-white">
              {area.borough}
            </Link>{" "}
            &bull; 18 Landscaping Services &bull; Free Estimates
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Landscaping in <span className="text-green-200">{area.name}, {area.borough}</span> &mdash; Professional Outdoor Services &amp; Free Estimates
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/80">
            Transform your {area.name} property with professional landscaping from NYC&apos;s trusted outdoor experts. We offer all 18 landscaping services — from <Link href="/services/landscape-design" className="text-green-200 underline underline-offset-2 hover:text-white">custom landscape design</Link> to <Link href="/services/lawn-garden-maintenance" className="text-green-200 underline underline-offset-2 hover:text-white">year-round maintenance</Link> — tailored to {area.name}&apos;s unique properties and outdoor spaces. Our {area.borough} crews bring years of local experience to every project, ensuring your landscape thrives in the local microclimate and complements the neighborhood&apos;s character. Contact us today at <a href={SMS_HREF} className="text-green-200 underline underline-offset-2 hover:text-white">{PHONE}</a> for a free on-site consultation.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href={SMS_HREF} className="rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-green-700 shadow-lg hover:bg-green-50 font-cta">
              {PHONE} | Text Us
            </a>
            <Link href="/contact" className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Free Estimate
            </Link>
            <Link href="/services" className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              All 18 Services
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            About Landscaping in {area.name}, {area.borough}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {area.name} is one of {area.borough}&apos;s most distinctive neighborhoods, and our landscaping team knows it inside and out. Whether you have a compact urban garden, a spacious residential yard, a rooftop terrace, or a commercial property that needs professional grounds care, we bring the right expertise and equipment to deliver outstanding results. Every project starts with a thorough site analysis — we evaluate soil conditions, sunlight patterns, drainage, existing plantings, and your property&apos;s architectural context before designing anything.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Our {area.borough} crews have deep experience working in {area.name} and understand the local conditions that affect landscape success: microclimates created by surrounding buildings, soil composition unique to this part of the city, seasonal wind patterns, and the aesthetic expectations of the neighborhood. We design landscapes that not only look stunning on day one but continue to mature beautifully for years to come. From selecting the right plants for your specific exposure to choosing hardscape materials that complement your architecture, every detail is considered.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Ready to start? Browse our <Link href="/services" className="font-semibold text-green-600 hover:text-green-700 underline">18 landscaping services</Link> below or <a href={SMS_HREF} className="font-semibold text-green-600 hover:text-green-700 underline">contact us at {PHONE}</a> for a free consultation. We serve residential homeowners, commercial property managers, co-op and condo buildings, and community organizations throughout {area.name} and the surrounding {area.borough} neighborhoods.
          </p>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="bg-section-green py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            {area.name} Landscaping at a Glance
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-green-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Services</p>
              <p className="mt-1 text-2xl font-bold text-green-700">18</p>
              <p className="mt-1 text-xs text-slate-400">Full-Service</p>
            </div>
            <div className="rounded-xl border border-green-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Borough</p>
              <p className="mt-1 text-2xl font-bold text-green-700">{area.borough}</p>
              <p className="mt-1 text-xs text-slate-400">Service Area</p>
            </div>
            <div className="rounded-xl border border-green-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Estimates</p>
              <p className="mt-1 text-2xl font-bold text-green-700">Free</p>
              <p className="mt-1 text-xs text-slate-400">No Obligation</p>
            </div>
            <div className="rounded-xl border border-green-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Response</p>
              <p className="mt-1 text-2xl font-bold text-green-700">48h</p>
              <p className="mt-1 text-xs text-slate-400">Consultation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pro Tip */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border-l-4 border-green-500 bg-green-50 p-6">
            <h3 className="text-lg font-bold text-green-800 font-heading">
              Local Tip for {area.name} Property Owners
            </h3>
            <p className="mt-2 text-base leading-relaxed text-green-900/80">
              The best time to start a landscaping project in {area.name} is early spring (March-April) or early fall (September-October) when weather conditions are ideal for planting and hardscape work. However, design consultations and planning can happen year-round — booking your consultation in winter means your project can start as soon as the ground thaws in spring, giving you the earliest possible installation date.
            </p>
            <p className="mt-3">
              <a href={SMS_HREF} className="text-sm font-semibold text-green-700 hover:text-green-800 underline font-cta">
                Text us at {PHONE} to schedule your consultation
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* All 18 Services in This Area */}
      <section className="bg-section-green py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            All 18 Landscaping Services in {area.name}, {area.borough}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every service below is available for {area.name} properties. Click any service for a detailed guide specific to {area.name}, including local tips, process details, and pricing information.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {services.map((service) => (
              <Link key={service.slug} href={getAreaServiceUrl(area, service)}>
                <div className="group flex items-center gap-3 rounded-xl border border-green-200/60 bg-white p-4 transition-all hover:border-green-400 hover:shadow-md">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 group-hover:bg-green-100 transition-colors">
                    <span className="text-green-600 text-sm font-bold">&rarr;</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 group-hover:text-green-600 font-heading">{service.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{service.tagline}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us for This Area */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Why {area.name} Property Owners Choose {SITE_NAME}
          </h2>
          <ul className="mt-6 space-y-4">
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">1</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Deep local knowledge of {area.name}.</strong>{" "}
                Our crews work in {area.name} regularly and understand the neighborhood&apos;s unique characteristics — from soil conditions and sun patterns to architectural styles and community expectations. This local expertise means better plant selections, more appropriate designs, and landscapes that truly fit the neighborhood.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">2</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Full-service from design to maintenance.</strong>{" "}
                We handle everything — landscape architecture and design, hardscape construction, planting, irrigation, lighting, and year-round maintenance. One team, one point of contact, and consistent quality from start to finish. No need to coordinate multiple contractors for your {area.name} project.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">3</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Transparent pricing with free estimates.</strong>{" "}
                Every {area.name} project begins with a free on-site consultation and a detailed, itemized proposal. No hidden fees, no surprises. We offer phased installation options so you can build your dream landscape over time if that fits your budget better.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">4</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Permit and approval experts.</strong>{" "}
                We handle NYC DOB permits, co-op and condo board presentations, and any other approvals your {area.name} project requires. Our team has navigated hundreds of approval processes across {area.borough} and knows exactly what boards and agencies want to see.
              </p>
            </li>
          </ul>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-green-700 font-cta">
                Text Us: {PHONE}
              </span>
            </a>
            <Link href="/contact" className="text-sm font-semibold text-green-600 hover:text-green-700 font-cta">
              Get a Free Estimate
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-section-green py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Frequently Asked Questions About Landscaping in {area.name}, {area.borough}
          </h2>
          <div className="mt-8 space-y-4">
            {areaFaqs.map((faq, i) => (
              <details key={i} className="group rounded-xl border border-green-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-green-700 font-heading">
                  {faq.question}
                </summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Nearby Neighborhoods */}
      {nearbyAreas.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">
              Nearby {area.borough} Neighborhoods We Serve
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-base text-slate-500">
              We also provide full landscaping services in these nearby {area.borough} neighborhoods.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {nearbyAreas.map((nearby) => (
                <Link key={nearby.slug} href={getAreaUrl(nearby)}>
                  <div className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-green-400 hover:shadow-md">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-green-600 font-heading">
                      {nearby.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href={getBoroughUrl(area.boroughSlug)} className="text-sm font-semibold text-green-600 hover:text-green-700 font-cta">
                All {area.borough} Neighborhoods &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Inner Links */}
      <section className="bg-section-green py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-lg font-bold text-slate-900 font-heading">
            Related Landscaping Resources
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/contact" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50 hover:text-green-700 border border-green-200/60">
              Get a Free Estimate
            </Link>
            <Link href="/services" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50 hover:text-green-700 border border-green-200/60">
              All 18 Services
            </Link>
            <Link href="/about" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50 hover:text-green-700 border border-green-200/60">
              About Our Team
            </Link>
            <Link href={getBoroughUrl(area.boroughSlug)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50 hover:text-green-700 border border-green-200/60">
              Landscaping in {area.borough}
            </Link>
            <Link href="/areas" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50 hover:text-green-700 border border-green-200/60">
              All Service Areas
            </Link>
            <Link href="/blog" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50 hover:text-green-700 border border-green-200/60">
              Landscaping Blog
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-green-700 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready to Transform Your {area.name} Property?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Get a free estimate, browse our services, or connect with a landscaping specialist who knows {area.name} inside and out.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-green-700 shadow-lg transition-colors hover:bg-green-50 font-cta">
                {PHONE} | Text Us
              </span>
            </a>
            <Link href="/contact">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Free Estimate
              </span>
            </Link>
            <Link href="/services">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                All 18 Services
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
