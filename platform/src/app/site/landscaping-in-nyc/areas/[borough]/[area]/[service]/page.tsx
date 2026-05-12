// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  services,
  findAreaBySlug,
  findServiceBySlug,
  getAreaUrl,
  getAreaServiceUrl,
  getServiceUrl,
  getBoroughUrl,
  SITE_DOMAIN,
  SITE_NAME,
  PHONE,
  SMS_HREF,
  EMAIL,
} from "@/app/site/landscaping-in-nyc/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";

interface Props {
  params: Promise<{ borough: string; area: string; service: string }>;
}

// Build on-demand with ISR — too many combos (areas x services) for static build
export const dynamicParams = true;
export const revalidate = 86400; // re-generate every 24h

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough, area: areaSlug, service: serviceSlug } = await params;
  const area = findAreaBySlug(borough, areaSlug);
  const service = findServiceBySlug(serviceSlug);
  if (!area || !service) return {};

  const title = `${service.name} in ${area.name}, ${area.borough} | Free Estimates`;
  const description = `${service.name} in ${area.name}, ${area.borough}. ${service.shortDesc} Free estimates, expert crews, and year-round service.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_DOMAIN}${getAreaServiceUrl(area, service)}`,
    },
  };
}

export default async function AreaServicePage({ params }: Props) {
  const { borough, area: areaSlug, service: serviceSlug } = await params;
  const area = findAreaBySlug(borough, areaSlug);
  const service = findServiceBySlug(serviceSlug);
  if (!area || !service) notFound();

  const otherServices = services.filter((s) => s.slug !== service.slug).slice(0, 6);
  const pageUrl = `${SITE_DOMAIN}${getAreaServiceUrl(area, service)}`;

  const faqItems = [
    {
      question: `What is ${service.name} in ${area.name}, ${area.borough}?`,
      answer: `${service.description} In ${area.name}, ${area.borough}, our team tailors this service to the neighborhood's unique property types, soil conditions, sun exposure, and architectural character. Whether you have a brownstone backyard, a rooftop terrace, a residential yard, or a commercial property, we deliver expert ${service.name.toLowerCase()} designed specifically for ${area.name} conditions.`,
    },
    {
      question: `How much does ${service.name} cost in ${area.name}, ${area.borough}?`,
      answer: `The cost of ${service.name} in ${area.name} depends on your property size, scope of work, and materials selected. We provide free, no-obligation estimates for all ${area.name} projects. Contact us at ${PHONE} or email ${EMAIL} for a personalized quote. We also offer phased project plans and flexible payment options to fit any budget.`,
    },
    {
      question: `How do I get started with ${service.name} in ${area.name}?`,
      answer: `Getting started with ${service.name} in ${area.name} is simple: (1) Contact us at ${PHONE} or request an estimate online, (2) We schedule a free on-site consultation within 48 hours, (3) You receive a detailed proposal with design concepts, materials, timeline, and pricing, (4) Our expert ${area.borough} crews complete the work to the highest standards. Most projects begin within 1-2 weeks of approval.`,
    },
    {
      question: `Do you offer ongoing maintenance for ${service.name} in ${area.name}?`,
      answer: `Yes — we offer comprehensive maintenance plans to keep your ${service.name.toLowerCase()} looking its best year-round in ${area.name}. Our maintenance programs cover seasonal care, plant health monitoring, equipment maintenance, and adjustments as your landscape matures. Plans are available on weekly, biweekly, or monthly schedules and can be customized to your specific needs and budget.`,
    },
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.name} in ${area.name}, ${area.borough}`,
    description: `${service.shortDesc} Available to property owners in ${area.name}, ${area.borough}.`,
    provider: {
      "@id": `${SITE_DOMAIN}/#organization`,
    },
    areaServed: {
      "@type": "Place",
      name: `${area.name}, ${area.borough}`,
    },
    serviceType: "Landscaping Service",
    url: pageUrl,
  };

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `${service.name} in ${area.name}, ${area.borough}`,
          `${service.shortDesc} Available in ${area.name}, ${area.borough}.`,
          pageUrl
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_DOMAIN },
          { name: "Areas", url: `${SITE_DOMAIN}/areas` },
          { name: area.borough, url: `${SITE_DOMAIN}${getBoroughUrl(area.boroughSlug)}` },
          { name: area.name, url: `${SITE_DOMAIN}${getAreaUrl(area)}` },
          { name: service.name, url: pageUrl },
        ])}
      />
      <JsonLd data={serviceSchema} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-200 font-cta">
            <Link href={getBoroughUrl(area.boroughSlug)} className="hover:text-white">
              {area.borough}
            </Link>
            {" / "}
            <Link href={getAreaUrl(area)} className="hover:text-white">
              {area.name}
            </Link>
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            {service.name} in{" "}
            <span className="text-green-200">{area.name}, {area.borough}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {service.tagline}. Expert crews, local knowledge, and free estimates for {area.name} property owners.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-green-700 shadow-lg transition-colors hover:bg-green-50 font-cta">
                Text Us: {PHONE}
              </span>
            </a>
            <Link href="/contact">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Get a Free Estimate
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            About {service.name} in {area.name}, {area.borough}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {service.description}
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            For property owners in {area.name}, {area.borough}, our {service.name.toLowerCase()} service is tailored to the neighborhood&apos;s specific conditions and character. {area.name} properties present unique opportunities and challenges that our team has extensive experience navigating. From the local soil composition and seasonal weather patterns to building regulations and neighborhood aesthetics, every aspect of your {service.name.toLowerCase()} project is designed with {area.name} in mind. Our {area.borough} crews bring years of hands-on experience in this neighborhood, ensuring your project is completed on time, on budget, and to the highest professional standards.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Whether you are starting a new project from scratch or enhancing an existing outdoor space, our{" "}
            <Link href={getServiceUrl(service)} className="font-semibold text-green-600 hover:text-green-700 underline">
              {service.name}
            </Link>{" "}
            team is ready to bring your vision to life in {area.name}.{" "}
            <Link href="/contact" className="font-semibold text-green-600 hover:text-green-700 underline">
              Request a free estimate
            </Link>{" "}
            or call us at <a href={SMS_HREF} className="font-semibold text-green-600 hover:text-green-700 underline">{PHONE}</a> to get started today.
          </p>
        </div>
      </section>

      {/* Quick Stats Grid */}
      <section className="bg-section-green py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            {service.name} in {area.name} at a Glance
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-green-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Estimates</p>
              <p className="mt-1 text-2xl font-bold text-green-700">Free</p>
              <p className="mt-1 text-xs text-slate-400">No Obligation</p>
            </div>
            <div className="rounded-xl border border-green-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Consultation</p>
              <p className="mt-1 text-2xl font-bold text-green-700">48h</p>
              <p className="mt-1 text-xs text-slate-400">Response Time</p>
            </div>
            <div className="rounded-xl border border-green-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Experience</p>
              <p className="mt-1 text-2xl font-bold text-green-700">15+ Yrs</p>
              <p className="mt-1 text-xs text-slate-400">In {area.borough}</p>
            </div>
            <div className="rounded-xl border border-green-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Satisfaction</p>
              <p className="mt-1 text-2xl font-bold text-green-700">98%</p>
              <p className="mt-1 text-xs text-slate-400">Client Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pro Tip */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border-l-4 border-green-500 bg-green-50 p-6">
            <h3 className="text-lg font-bold text-green-800 font-heading">
              Insider Tip for {area.name} Property Owners
            </h3>
            <p className="mt-2 text-base leading-relaxed text-green-900/80">
              When planning {service.name.toLowerCase()} in {area.name}, consider the full picture: how this service integrates with your property&apos;s existing features, seasonal changes, and long-term maintenance needs. Our free consultation covers all of this — we evaluate your property holistically and recommend the most effective approach for lasting results. Many {area.name} clients start with one service and expand their outdoor improvements over multiple seasons, which we fully support with phased project plans.
            </p>
            <p className="mt-3">
              <a href={SMS_HREF} className="text-sm font-semibold text-green-700 hover:text-green-800 underline font-cta">
                Schedule your free consultation: {PHONE}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-section-green py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Key Features of {service.name} in {area.name}, {area.borough}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {service.features.map((feature, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-green-200/60 bg-white p-4">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose This Service in This Area */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Why {area.name} Property Owners Choose Our {service.name}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {area.name}, {area.borough} is a neighborhood with distinctive character, and our {service.name.toLowerCase()} approach reflects that. Here is why property owners in {area.name} trust {SITE_NAME} for their outdoor projects:
          </p>
          <ul className="mt-6 space-y-4">
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">1</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Neighborhood expertise.</strong>{" "}
                Our crews work in {area.name} regularly and understand the local conditions that affect {service.name.toLowerCase()} success — from microclimate patterns and soil composition to building codes and co-op requirements. This knowledge translates to better designs, more appropriate material selections, and projects that stand the test of time.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">2</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Premium materials and craftsmanship.</strong>{" "}
                We use only professional-grade materials sourced from trusted suppliers. Every installation is completed by experienced, trained crew members who take pride in their work. Our attention to detail shows in the finished product and in how well your landscape performs over the seasons.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">3</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">End-to-end project management.</strong>{" "}
                From the initial consultation and design through permitting, installation, and post-project care, you have a dedicated project manager who keeps everything on track. We handle NYC DOB permits, co-op board presentations, material procurement, and crew scheduling so you can focus on enjoying the transformation.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">4</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Year-round support and maintenance.</strong>{" "}
                Your {service.name.toLowerCase()} project doesn&apos;t end at installation. We offer ongoing maintenance plans that keep your outdoor space looking its absolute best through every season. Spring, summer, fall, and winter — our {area.borough} maintenance crews are there when you need them.
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
            Frequently Asked Questions About {service.name} in {area.name}, {area.borough}
          </h2>
          <div className="mt-8 space-y-4">
            {faqItems.map((faq, i) => (
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

      {/* Other Services in this Area */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">
            Other Landscaping Services in {area.name}, {area.borough}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-slate-500">
            Explore additional landscaping services available to {area.name} property owners. We offer 18 professional services tailored to every property type and outdoor need.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {otherServices.map((s) => (
              <Link key={s.slug} href={getAreaServiceUrl(area, s)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-green-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-green-600 font-heading">
                    {s.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{s.shortDesc}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href={getAreaUrl(area)} className="text-sm font-semibold text-green-600 hover:text-green-700 font-cta">
              All Services in {area.name}, {area.borough} &rarr;
            </Link>
          </div>
        </div>
      </section>

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
            <Link href="/about" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50 hover:text-green-700 border border-green-200/60">
              About Our Team
            </Link>
            <Link href="/services" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50 hover:text-green-700 border border-green-200/60">
              All 18 Services
            </Link>
            <Link href={getAreaUrl(area)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50 hover:text-green-700 border border-green-200/60">
              Landscaping in {area.name}
            </Link>
            <Link href={getBoroughUrl(area.boroughSlug)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50 hover:text-green-700 border border-green-200/60">
              Landscaping in {area.borough}
            </Link>
            <Link href={getServiceUrl(service)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50 hover:text-green-700 border border-green-200/60">
              {service.name} Guide
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-green-700 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready for {service.name} in {area.name}?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Get a free estimate, explore the full {service.name} guide, or connect with a specialist who knows {area.name} properties inside and out.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-green-700 shadow-lg transition-colors hover:bg-green-50 font-cta">
                {PHONE} | Text Us
              </span>
            </a>
            <Link href={getServiceUrl(service)}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Full {service.name} Guide
              </span>
            </Link>
            <Link href="/contact">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Free Estimate
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
