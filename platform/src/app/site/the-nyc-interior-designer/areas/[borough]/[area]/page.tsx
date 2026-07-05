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
  PHONE_HREF,
  SMS_HREF,
} from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";

interface Props {
  params: Promise<{ borough: string; area: string }>;
}

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough, area: areaSlug } = await params;
  const area = findAreaBySlug(borough, areaSlug);
  if (!area) return {};

  return {
    title: `Interior Design in ${area.name}, ${area.borough} — Services & Free Consultations`,
    description: `Professional interior design in ${area.name}, ${area.borough}. 18 services including full-home design, kitchen & bathroom renovation, staging, and more. Free consultations available.`,
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
      question: `How do I get interior design services in ${area.name}, ${area.borough}?`,
      answer: `Getting interior design services in ${area.name} is easy. Contact us at ${PHONE} or request a free consultation online. We will schedule an in-home visit within one week to assess your space, discuss your vision, and provide a detailed design proposal. Our ${area.borough} designers handle everything from concept through installation and styling.`,
    },
    {
      question: `What interior design services do you offer in ${area.name}?`,
      answer: `We offer all 18 of our professional interior design services in ${area.name}, including full-home interior design, kitchen design, bathroom design, living room design, bedroom design, home office design, commercial interior design, space planning, color consultation, furniture selection, lighting design, custom closet design, renovation management, window treatment design, art curation, staging and styling, wallpaper and wall treatments, and smart home integration.`,
    },
    {
      question: `How much does interior design cost in ${area.name}, ${area.borough}?`,
      answer: `Interior design costs in ${area.name} depend on the scope of work, property size, and materials selected. Color consultations start around $500-$1,500. Single-room design projects range from $5,000-$25,000. Full-home design and renovation projects typically range from $15,000-$200,000+. We provide free, no-obligation consultations for all ${area.name} projects so you know exactly what to expect.`,
    },
    {
      question: `Do you offer renovation management in ${area.name}?`,
      answer: `Yes — our renovation management service covers all aspects of your ${area.name} renovation: contractor vetting and selection, NYC DOB permit filing, co-op and condo board alteration agreements, construction scheduling, budget tracking, quality inspections, and material coordination. We manage the entire project so you can focus on enjoying the transformation.`,
    },
    {
      question: `Is ${area.name} a good area for interior design investment?`,
      answer: `${area.name} in ${area.borough} offers excellent opportunities for interior design investment. Well-designed interiors increase property value, improve daily quality of life, and make your home more functional and beautiful. Whether you have a compact apartment, a spacious brownstone, or a commercial property, professional design delivers measurable returns in ${area.name}'s competitive real estate market.`,
    },
    {
      question: `Can you work with my building management or co-op board in ${area.name}?`,
      answer: `Absolutely. We regularly coordinate with building management companies, co-op boards, and condo associations throughout ${area.borough}. Our team prepares professional alteration agreement packages including detailed plans, material specifications, timelines, and insurance documentation. We handle all permit applications with NYC DOB when required.`,
    },
    {
      question: `What types of properties do you design in ${area.name}?`,
      answer: `We design interiors for all property types in ${area.name}: pre-war and post-war apartments, brownstones and townhouses, condos and co-ops, single-family homes, commercial offices and retail spaces, restaurants and hospitality venues, and new construction properties. Each property type gets a customized design approach.`,
    },
    {
      question: `How long does a typical interior design project take in ${area.name}?`,
      answer: `Project timelines in ${area.name} vary by scope: color consultation and furniture selection take 2-4 weeks, single-room design takes 4-8 weeks, full-home design takes 3-6 months, and full renovation projects take 4-12 months depending on scope and board approvals. We provide detailed timelines during your free consultation.`,
    },
  ];

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${SITE_NAME} — ${area.name} Interior Design`,
    description: `Professional interior design services in ${area.name}, ${area.borough}. Design, renovation, and styling.`,
    url: canonicalUrl,
    telephone: "+1-917-473-2013",
    areaServed: {
      "@type": "Place",
      name: `${area.name}, ${area.borough}`,
    },
    parentOrganization: {
      "@id": `${SITE_DOMAIN}/#organization`,
    },
    serviceType: "Interior Design",
    priceRange: "$$-$$$$",
  };

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `Interior Design in ${area.name}, ${area.borough}`,
          `Professional interior design services in ${area.name}, ${area.borough}. 18 services, free consultations, and expert designers.`,
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

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-20 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 inline-block rounded-full border border-blue-300/40 bg-slate-800/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-300 font-cta">
            <Link href={getBoroughUrl(area.boroughSlug)} className="hover:text-white">
              {area.borough}
            </Link>{" "}
            &bull; 18 Design Services &bull; Free Consultations
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Interior Design in <span className="text-blue-300">{area.name}, {area.borough}</span> &mdash; Professional Design Services &amp; Free Consultations
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/80">
            Transform your {area.name} property with professional interior design from NYC&apos;s trusted design experts. We offer all 18 design services — from <Link href="/services/full-home-interior-design" className="text-blue-300 underline underline-offset-2 hover:text-white">full-home interior design</Link> to <Link href="/services/staging-styling" className="text-blue-300 underline underline-offset-2 hover:text-white">real estate staging</Link> — tailored to {area.name}&apos;s unique properties and architectural character. Contact us today at <a href={SMS_HREF} className="text-blue-300 underline underline-offset-2 hover:text-white">{PHONE}</a> for a free consultation.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href={SMS_HREF} className="rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg hover:bg-blue-50 font-cta">
              Text Us
            </a>
            <a href={PHONE_HREF} className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Call {PHONE}
            </a>
            <Link href="/contact" className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Free Consultation
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            About Interior Design in {area.name}, {area.borough}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {area.name} is one of {area.borough}&apos;s most distinctive neighborhoods, and our design team knows it inside and out. Whether you have a compact apartment, a spacious brownstone, a modern condo, or a commercial property that needs professional interior design, we bring the right expertise to deliver outstanding results. Every project starts with a thorough assessment — we evaluate your space, natural light, existing architecture, and your lifestyle before designing anything.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Our {area.borough} designers have deep experience working in {area.name} and understand the local characteristics that affect design success: architectural styles unique to the neighborhood, natural light patterns determined by building orientation, ceiling heights and floor plans typical of the area&apos;s housing stock, and the aesthetic expectations of the community. We design interiors that not only look stunning on day one but continue to serve you beautifully for years to come.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Ready to start? Browse our <Link href="/services" className="font-semibold text-blue-700 hover:text-blue-800 underline">18 design services</Link> below or <a href={SMS_HREF} className="font-semibold text-blue-700 hover:text-blue-800 underline">contact us at {PHONE}</a> for a free consultation.
          </p>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="bg-section-alt py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            {area.name} Interior Design at a Glance
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Services</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">18</p>
              <p className="mt-1 text-xs text-slate-400">Full-Service</p>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Borough</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">{area.borough}</p>
              <p className="mt-1 text-xs text-slate-400">Service Area</p>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Consultations</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">Free</p>
              <p className="mt-1 text-xs text-slate-400">No Obligation</p>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Response</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">1 Week</p>
              <p className="mt-1 text-xs text-slate-400">Consultation</p>
            </div>
          </div>
        </div>
      </section>

      {/* All 18 Services in This Area */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            All 18 Interior Design Services in {area.name}, {area.borough}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every service below is available for {area.name} properties. Click any service for a detailed guide specific to {area.name}, including local tips, process details, and pricing information.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {services.map((service) => (
              <Link key={service.slug} href={getAreaServiceUrl(area, service)}>
                <div className="group flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white p-4 transition-all hover:border-blue-400 hover:shadow-md">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                    <span className="text-blue-700 text-sm font-bold">&rarr;</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 font-heading">{service.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{service.tagline}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-section-alt py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Why {area.name} Property Owners Choose {SITE_NAME}
          </h2>
          <ul className="mt-6 space-y-4">
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">1</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Deep local knowledge of {area.name}.</strong>{" "}
                Our designers work in {area.name} regularly and understand the neighborhood&apos;s unique characteristics — from architectural styles and typical floor plans to natural light patterns and building regulations. This local expertise means better design decisions and interiors that truly fit the neighborhood.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">2</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Full-service from concept to completion.</strong>{" "}
                We handle everything — design concepts, material selection, furniture procurement, contractor coordination, and project management. One team, one point of contact, and consistent quality from start to finish.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">3</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Transparent pricing with free consultations.</strong>{" "}
                Every {area.name} project begins with a free in-home consultation and a detailed, itemized proposal. No hidden fees, no surprises. We offer phased design plans so you can build your dream interior over time.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">4</span>
              <p className="text-base leading-relaxed text-slate-600">
                <strong className="text-slate-900">Permit and approval experts.</strong>{" "}
                We handle NYC DOB permits, co-op and condo board presentations, and any other approvals your {area.name} project requires. Our team has navigated hundreds of approval processes across {area.borough}.
              </p>
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Frequently Asked Questions About Interior Design in {area.name}, {area.borough}
          </h2>
          <div className="mt-8 space-y-4">
            {areaFaqs.map((faq, i) => (
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

      {/* Nearby Neighborhoods */}
      {nearbyAreas.length > 0 && (
        <section className="bg-section-alt py-16">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">
              Nearby {area.borough} Neighborhoods We Serve
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-base text-slate-500">
              We also provide full interior design services in these nearby {area.borough} neighborhoods.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {nearbyAreas.map((nearby) => (
                <Link key={nearby.slug} href={getAreaUrl(nearby)}>
                  <div className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-blue-400 hover:shadow-md">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 font-heading">
                      {nearby.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href={getBoroughUrl(area.boroughSlug)} className="text-sm font-semibold text-blue-700 hover:text-blue-800 font-cta">
                All {area.borough} Neighborhoods &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

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
            <Link href="/services" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800 border border-slate-200/60">
              All 18 Services
            </Link>
            <Link href="/about" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800 border border-slate-200/60">
              About Our Team
            </Link>
            <Link href={getBoroughUrl(area.boroughSlug)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800 border border-slate-200/60">
              Interior Design in {area.borough}
            </Link>
            <Link href="/areas" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800 border border-slate-200/60">
              All Service Areas
            </Link>
            <Link href="/blog" className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800 border border-slate-200/60">
              Design Blog
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-slate-900 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready to Transform Your {area.name} Property?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Get a free consultation, browse our services, or connect with a designer who knows {area.name} inside and out.
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
