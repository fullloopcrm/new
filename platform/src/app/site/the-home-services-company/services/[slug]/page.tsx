import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { notFound } from "next/navigation";
import { PHONE, CITY_COUNT, STATE_COUNT } from "@/app/site/the-home-services-company/_data/content";
import { SERVICES, SERVICE_CATEGORIES, getExtendedContent } from "@/app/site/the-home-services-company/_data/services";
import { ServiceSchema, BreadcrumbSchema } from "@/app/site/the-home-services-company/_components/SiteSchema";

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) return {};
  return {
    title: `${service.title} — Nationwide Home Services`,
    description: `${service.description} Starting at $99/hour, licensed and insured, same-day availability. ${CITY_COUNT} cities, all ${STATE_COUNT} states.`,
    alternates: { canonical: `/services/${slug}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) notFound();

  const serviceIndex = SERVICES.indexOf(service);
  const category = SERVICE_CATEGORIES[service.category];
  const relatedServices = SERVICES.filter((s) => s.category === service.category && s.slug !== service.slug);
  const otherServices = SERVICES.filter((s) => s.category !== service.category).slice(0, 6);
  const svcLower = service.title.toLowerCase();

  return (
    <>
      <ServiceSchema serviceName={service.title} description={service.description} />
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Services", url: "/services" }, { name: service.title, url: `/services/${service.slug}` }]} />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            {category.label} — Service #{serviceIndex + 1} of {SERVICES.length}
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            {service.title}
          </h1>
          <p className="mt-4 text-2xl font-bold text-teal-200 font-heading">
            {service.subtitle}
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {service.description}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {service.ideal.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-sm text-teal-200 backdrop-blur-sm">{tag}</span>
            ))}
          </div>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            About {service.title}
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>{service.longDescription}</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Everything You Need to Know About {service.title}</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            {getExtendedContent(service).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How {svcLower} Works With Home Services Co</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Our {svcLower} technicians are part of Home Services Co — a consolidated home services company offering 40 trades under one phone number. When you call for {svcLower}, you&apos;re not routed to a random contractor. You get a licensed, insured technician trained specifically in {svcLower}, backed by a company with accountability, upfront pricing, and real standards.</p>
            <p>Our {svcLower} service starts at $99/hour with upfront pricing. For jobs requiring parts, fixtures, or materials, those costs are itemized up front before work begins. You approve the estimate, and work starts. The invoice at the end matches the estimate at the start. No mystery shop fees, no &ldquo;while we were here&rdquo; add-ons.</p>
            <p>Most {svcLower} jobs finish in 1-4 hours depending on scope. Smaller jobs often complete within the first hour. Larger {svcLower} projects are quoted as written project scopes with clear milestones — you see the full cost before any work begins.</p>
            <p>Our technicians are specifically trained in {svcLower}. They carry the right tools and equipment for this trade, follow the safety standards required, and treat your home as a working environment that contains people, pets, and belongings. Drop cloths, floor protection, and clean-up are built into how we work.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Common {service.title} Scenarios</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Quick service call (1 hour or less):</strong> A focused {svcLower} task — a specific repair, a single install, a targeted fix. At the starting rate of $99/hour, small jobs often finish within the first hour. Parts itemized separately when needed.</p>
            <p><strong>Half-day project (2-4 hours):</strong> A larger {svcLower} task — a more involved repair, a multi-step install, a moderate project scope. Typically quoted at $198–$396 in labor plus any parts or materials itemized up front.</p>
            <p><strong>Full-day project (4-8 hours):</strong> A significant {svcLower} job — a substantial install, a complex scope, or coordinated work that takes most of a day. Labor runs $396–$792 plus parts and materials itemized in the written estimate.</p>
            <p><strong>Multi-day projects:</strong> Larger {svcLower} work that spans multiple days is quoted as a complete written project scope rather than strictly hourly. You see the full cost up front — labor, materials, permits, and any specialty subcontracting — before any work begins.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">{service.title} vs. DIY</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>DIY is sometimes the right answer for {svcLower}. For small, low-risk tasks where you have the skills and tools, handling it yourself is cheaper and reasonable. But for most {svcLower} work — especially anything involving code, permits, safety risk, or specialized tools — professional service is usually the smart call.</p>
            <p>The hidden costs of DIY {svcLower} add up: tool purchases or rentals, materials at retail instead of contractor rates, time spent learning and executing, and the risk of doing the work incorrectly and having to redo it (or pay a professional to fix it). At $99/hour with a licensed technician, professional service is often cheaper than DIY once you factor in everything.</p>
            <p>There&apos;s also the question of code, permits, and insurance. Many {svcLower} tasks require permits when done to code. Unpermitted work surfaces at resale and creates real problems. Licensed professionals pull permits when required and do the work to current code, which protects you now and at resale later.</p>
            <p>The rule of thumb: if {svcLower} involves safety risk, code requirements, specialized tools, or skills you don&apos;t have, professional service is the cheaper long-term answer. If it&apos;s a low-risk task you have the skills for, DIY makes sense. We&apos;ll tell you honestly which bucket your specific {svcLower} job falls into if you call us.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">When to Book {service.title}</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Same-Day Service:</strong> Available for calls placed before noon in most markets. Our dispatch routes the nearest available technician to your location, typically arriving within 2-4 hours. Same-day is ideal for urgent {svcLower} needs — broken systems, active issues, or simply wanting it done today.</p>
            <p><strong>Scheduled Appointments:</strong> Book 24 hours to 4 weeks in advance and lock in your preferred date and time. We offer 2-hour arrival windows for all scheduled appointments. Weekend and holiday appointments are available at the same starting rate — no surcharges.</p>
            <p><strong>Seasonal Timing:</strong> Some {svcLower} work has optimal seasonal timing — exterior work in warm weather, HVAC tune-ups before the season starts, chimney sweep before fall heating, and so on. Our schedulers will flag seasonal considerations when you book.</p>
            <p><strong>Larger Projects:</strong> For major {svcLower} work, schedule 3-5 days in advance. This allows us to assign the optimal technician, coordinate any needed materials or permits, and plan for multi-visit work if needed.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            How {service.title} Works — Step by Step
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Call & Describe", desc: `Call ${PHONE} and describe your ${svcLower} job. Our scheduler asks clarifying questions and gives you a starting rate plus any relevant pricing information. Same-day available before noon in most markets.` },
              { step: "2", title: "We Show Up", desc: `Your technician arrives in the scheduled window in a branded vehicle. They walk through the job with you and confirm the scope.` },
              { step: "3", title: "Written Estimate", desc: `Before any work begins, you get a written estimate — labor at $99/hour plus parts and materials itemized. You approve the estimate, and work starts.` },
              { step: "4", title: "Work & Walkthrough", desc: `Work gets completed to the agreed scope. Scope changes require your approval before continuing. Final walkthrough confirms everything is done right, and the workspace is left clean.` },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white">{item.step}</div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Responsible Practice for {service.title}</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Every {svcLower} job is done to the current standards for that trade — permits when required, proper materials, code-compliant installation, and safe disposal of any waste generated. This isn&apos;t marketing. It&apos;s how the work should be done, and it&apos;s why we have the company behind every job rather than just handing you a receipt and driving away.</p>
            <p>For {svcLower} work that generates waste — old materials, packaging, replaced parts — we route reusable materials to donation or recycling when appropriate. Only items with no reuse value go to licensed disposal facilities. This is especially important for trades that handle hazardous materials (like refrigerant in HVAC work, lead in older paint, or e-waste in appliance repair), where proper handling is required by law.</p>
            <p>Our {svcLower} technicians follow the safety standards required for their trade. This includes the right PPE, proper lockout/tagout procedures where applicable, and respectful handling of customer property. Drop cloths, floor protection, and clean-up are built into how we work — not optional extras.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Choose Home Services Co for {service.title}</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>There are plenty of companies that offer {svcLower}. What sets Home Services Co apart is the combination of one-company convenience across 40 trades, upfront pricing on every job, licensed and insured technicians, and same-day availability in most markets. You&apos;re not just hiring a {svcLower} technician — you&apos;re starting a relationship with a company that handles every home service you need.</p>
            <p>The operating principle across every one of our 40 services is the same: starting at $99/hour, written estimates before work begins, parts and materials itemized, and the invoice matches the estimate. Scope changes require your approval. No mystery shop fees, no &ldquo;while we were here&rdquo; add-ons, no weekend premiums.</p>
            <p>Fully licensed, bonded, and insured across every trade. Every technician background-checked. Comprehensive liability coverage. Same-day service. Evening and weekend appointments. Operating 7 days a week. No contracts, no minimums beyond the first hour, no recurring fees unless you set up a recurring service account. Call {PHONE} to book {svcLower} today — and for the next 39 services you need after that.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            {service.title} Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
            Upfront pricing. Written estimates. Parts and materials itemized.
          </p>
          <div className="mt-8 max-w-sm mx-auto">
            <div className="rounded-xl border-2 border-teal-400 bg-white p-6 text-center shadow-md">
              <p className="text-5xl font-bold text-teal-700 font-heading">$99</p>
              <p className="mt-1 text-base text-slate-600">per hour &bull; starting rate</p>
              <p className="mt-3 text-sm text-slate-500">Licensed and insured &bull; Upfront pricing</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Labor at $99/hour. Parts and materials itemized before work begins. Larger projects quoted as written scopes.
          </p>
          <div className="mt-6">
            <Link href="/pricing" className="text-teal-700 font-semibold text-sm hover:underline font-cta">
              View Full Pricing Details →
            </Link>
          </div>
        </div>
      </section>

      {relatedServices.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
              Related {category.label}
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedServices.map((s) => (
                <Link key={s.slug} href={`/services/${s.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-teal-600">{s.subtitle}</p>
                  <p className="mt-3 text-sm text-slate-600">{s.description}</p>
                  <p className="mt-3 text-sm font-semibold text-teal-600 font-cta">Learn More →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Other Home Services
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {otherServices.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                <p className="mt-1 text-xs font-semibold text-teal-600">{s.subtitle}</p>
                <p className="mt-3 text-sm text-slate-600">{s.description}</p>
                <p className="mt-3 text-sm font-semibold text-teal-600 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/services" className="text-teal-700 font-semibold text-sm hover:underline font-cta">
              View All {SERVICES.length} Services →
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">
            Book {service.title} Today
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            One call. Upfront pricing starting at $99/hour. Licensed and insured technicians. Same-day available in {CITY_COUNT} cities.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
