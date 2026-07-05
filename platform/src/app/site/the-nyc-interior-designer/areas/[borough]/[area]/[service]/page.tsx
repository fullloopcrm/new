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
  PHONE_HREF,
  SMS_HREF,
  EMAIL,
} from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";

interface Props {
  params: Promise<{ borough: string; area: string; service: string }>;
}

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough, area: areaSlug, service: serviceSlug } = await params;
  const area = findAreaBySlug(borough, areaSlug);
  const service = findServiceBySlug(serviceSlug);
  if (!area || !service) return {};

  const title = `${service.name} in ${area.name}, ${area.borough} | Free Consultations`;
  const description = `${service.name} in ${area.name}, ${area.borough}. ${service.shortDesc} Free consultations, expert designers, and personalized service.`;

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
      answer: `${service.description} In ${area.name}, ${area.borough}, our team tailors this service to the neighborhood's unique property types, architectural styles, natural light conditions, and design aesthetics. Whether you have a pre-war apartment, a modern condo, a brownstone, or a commercial property, we deliver expert ${service.name.toLowerCase()} designed specifically for ${area.name} properties.`,
    },
    {
      question: `How much does ${service.name} cost in ${area.name}, ${area.borough}?`,
      answer: `The cost of ${service.name} in ${area.name} depends on your property size, scope of work, and materials selected. We provide free, no-obligation consultations for all ${area.name} projects. Contact us at ${PHONE} or email ${EMAIL} for a personalized quote. We also offer phased project plans and flexible payment options to fit any budget.`,
    },
    {
      question: `How do I get started with ${service.name} in ${area.name}?`,
      answer: `Getting started with ${service.name} in ${area.name} is simple: (1) Contact us at ${PHONE} or request a consultation online, (2) We schedule a free in-home consultation within one week, (3) You receive a detailed proposal with design concepts, materials, timeline, and pricing, (4) Our expert ${area.borough} designers complete the work to the highest standards. Most projects begin within 2-3 weeks of approval.`,
    },
    {
      question: `Do you offer ongoing support after ${service.name} in ${area.name}?`,
      answer: `Yes — we offer ongoing design support to ensure your ${service.name.toLowerCase()} continues to serve you well in ${area.name}. Whether you need seasonal styling updates, additional furniture sourcing, or design adjustments as your needs change, our team is available. Many clients engage us for ongoing design retainer relationships.`,
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
    serviceType: "Interior Design",
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
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-300 font-cta">
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
            <span className="text-blue-300">{area.name}, {area.borough}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {service.tagline}. Expert designers, local knowledge, and free consultations for {area.name} property owners.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg transition-colors hover:bg-blue-50 font-cta">
                Text Us
              </span>
            </a>
            <a href={PHONE_HREF}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Call {PHONE}
              </span>
            </a>
            <Link href="/contact">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Free Consultation
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
            For property owners in {area.name}, {area.borough}, our {service.name.toLowerCase()} service is tailored to the neighborhood&apos;s specific conditions and character. {area.name} properties present unique opportunities and challenges that our team has extensive experience navigating. From the architectural style and natural light patterns to building regulations and neighborhood aesthetics, every aspect of your {service.name.toLowerCase()} project is designed with {area.name} in mind.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Whether you are starting a new project from scratch or refreshing an existing space, our{" "}
            <Link href={getServiceUrl(service)} className="font-semibold text-blue-700 hover:text-blue-800 underline">
              {service.name}
            </Link>{" "}
            team is ready to bring your vision to life in {area.name}.{" "}
            <Link href="/contact" className="font-semibold text-blue-700 hover:text-blue-800 underline">
              Request a free consultation
            </Link>{" "}
            or call us at <a href={SMS_HREF} className="font-semibold text-blue-700 hover:text-blue-800 underline">{PHONE}</a> to get started today.
          </p>
        </div>
      </section>

      {/* Quick Stats Grid */}
      <section className="bg-section-alt py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            {service.name} in {area.name} at a Glance
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Consultations</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">Free</p>
              <p className="mt-1 text-xs text-slate-400">No Obligation</p>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Response</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">1 Week</p>
              <p className="mt-1 text-xs text-slate-400">Scheduling</p>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Experience</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">15+ Yrs</p>
              <p className="mt-1 text-xs text-slate-400">In {area.borough}</p>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Satisfaction</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">98%</p>
              <p className="mt-1 text-xs text-slate-400">Client Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Key Features of {service.name} in {area.name}, {area.borough}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {service.features.map((feature, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-slate-200/60 bg-white p-4">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose This Service in This Area */}
      <section className="bg-section-alt py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Why {area.name} Property Owners Choose Our {service.name}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {area.name}, {area.borough} is a neighborhood with distinctive character, and our {service.name.toLowerCase()} approach reflects that. Here is why property owners in {area.name} trust {SITE_NAME}:
          </p>
          <ul className="mt-6 space-y-4">
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">1</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Neighborhood expertise.</strong>{" "}
                Our designers work in {area.name} regularly and understand the local conditions that affect {service.name.toLowerCase()} success — from architectural styles and floor plan types to building codes and co-op requirements. This knowledge translates to better design decisions and results that stand the test of time.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">2</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Premium materials and craftsmanship.</strong>{" "}
                We work with the finest materials and most skilled tradespeople. From custom millwork to hand-selected fabrics, every detail is executed to the highest standard. Our trade-only access means better pricing on luxury materials.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">3</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">End-to-end project management.</strong>{" "}
                From the initial consultation and design through procurement, installation, and final styling, you have a dedicated designer who keeps everything on track. We handle permits, board presentations, contractor coordination, and delivery logistics.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">4</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Lasting relationships.</strong>{" "}
                Your {service.name.toLowerCase()} project doesn&apos;t end at installation. We offer ongoing design support, seasonal styling updates, and are always available when you are ready to tackle the next room or project.
              </p>
            </li>
          </ul>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-slate-800 font-cta">
                Text Us
              </span>
            </a>
            <a href={PHONE_HREF} className="text-sm font-semibold text-blue-700 hover:text-blue-800 font-cta">
              Call {PHONE}
            </a>
            <Link href="/contact" className="text-sm font-semibold text-blue-700 hover:text-blue-800 font-cta">
              Free Consultation
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Frequently Asked Questions About {service.name} in {area.name}, {area.borough}
          </h2>
          <div className="mt-8 space-y-4">
            {faqItems.map((faq, i) => (
              <details key={i} className="group rounded-xl border border-slate-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-blue-800 font-heading">
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
      <section className="bg-section-alt py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">
            Other Interior Design Services in {area.name}, {area.borough}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-slate-500">
            Explore additional design services available to {area.name} property owners. We offer 18 professional services tailored to every property type and design need.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {otherServices.map((s) => (
              <Link key={s.slug} href={getAreaServiceUrl(area, s)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 font-heading">
                    {s.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{s.shortDesc}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href={getAreaUrl(area)} className="text-sm font-semibold text-blue-700 hover:text-blue-800 font-cta">
              All Services in {area.name}, {area.borough} &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Inner Links */}
      <section className="bg-section-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-lg font-bold text-slate-900 font-heading">
            Related Interior Design Resources
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/contact" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800 border border-slate-200/60">
              Get a Free Consultation
            </Link>
            <Link href="/about" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800 border border-slate-200/60">
              About Our Team
            </Link>
            <Link href="/services" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800 border border-slate-200/60">
              All 18 Services
            </Link>
            <Link href={getAreaUrl(area)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800 border border-slate-200/60">
              Design in {area.name}
            </Link>
            <Link href={getBoroughUrl(area.boroughSlug)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800 border border-slate-200/60">
              Design in {area.borough}
            </Link>
            <Link href={getServiceUrl(service)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800 border border-slate-200/60">
              {service.name} Guide
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-slate-900 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready for {service.name} in {area.name}?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Get a free consultation, explore the full {service.name} guide, or connect with a designer who knows {area.name} properties inside and out.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg transition-colors hover:bg-blue-50 font-cta">
                Text Us
              </span>
            </a>
            <a href={PHONE_HREF}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Call {PHONE}
              </span>
            </a>
            <Link href="/contact">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Free Consultation
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
