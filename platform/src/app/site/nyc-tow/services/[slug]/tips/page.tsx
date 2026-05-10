// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaButtons } from "@/app/site/nyc-tow/_components/CtaButtons";
import { PHONE } from "@/app/site//_data/content";
import { SERVICES, SERVICE_CATEGORIES } from "@/app/site//_data/services";
import { getServiceTips, parseLinks, type TextPart } from "@/app/site//_data/service-tips";
import { JsonLd, breadcrumbSchema, howToSchema, articleSchema, faqPageSchema } from "@/app/site/nyc-tow/_lib/schema";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) return {};
  return {
    title: `${service.title} in NYC — Complete Guide, Pricing & 24/7 Dispatch`,
    description: `${service.title} in NYC — complete guide. Emergency 101, common causes, flat-rate pricing, do's and don'ts, and NYC-specific FAQs from The NYC Towing Service dispatch team.`,
    alternates: { canonical: `/services/${slug}/tips` },
  };
}

function RichText({ text }: { text: string }) {
  const parts: TextPart[] = parseLinks(text);
  return (
    <>
      {parts.map((part, i) => {
        if (typeof part === "string") return <span key={i}>{part}</span>;
        return (
          <Link key={i} href={part.href} className="text-teal-700 font-semibold hover:underline">
            {part.text}
          </Link>
        );
      })}
    </>
  );
}

/** RichText on a dark background — yellow link per house rules. */
function RichTextDark({ text }: { text: string }) {
  const parts: TextPart[] = parseLinks(text);
  return (
    <>
      {parts.map((part, i) => {
        if (typeof part === "string") return <span key={i}>{part}</span>;
        return (
          <Link key={i} href={part.href} className="text-yellow-300 font-semibold hover:underline">
            {part.text}
          </Link>
        );
      })}
    </>
  );
}

export default async function ServiceTipsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) notFound();

  const tips = getServiceTips(slug);
  const category = SERVICE_CATEGORIES[service.category];

  // Pick 4-6 sibling services for the related grid.
  const related = [
    ...SERVICES.filter((s) => s.category === service.category && s.slug !== service.slug),
    ...SERVICES.filter((s) => s.category !== service.category),
  ].slice(0, 6);

  // Strip {link:...|text} tokens out of plain text for JSON-LD.
  const stripTokens = (raw: string) =>
    raw.replace(/\{link:[^|}]+\|([^}]+)\}/g, "$1");

  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Services", url: "/services" },
            { name: service.title, url: `/services/${service.slug}` },
            { name: "Tips & How-To", url: `/services/${service.slug}/tips` },
          ]),
          howToSchema({
            name: `How to Handle ${service.title} in NYC`,
            description: `${service.title} step-by-step protocol from The NYC Towing Service dispatch team.`,
            url: `/services/${service.slug}/tips`,
            steps: tips.rightNow.map((step, i) => ({
              name: `Step ${i + 1}`,
              text: stripTokens(step),
            })),
          }),
          articleSchema({
            title: `${service.title} in NYC — Complete Guide, Pricing & 24/7 Dispatch`,
            description: `${service.title} in NYC — complete guide. Emergency 101 and full how-to for ${service.title.toLowerCase()} in NYC.`,
            url: `/services/${service.slug}/tips`,
            section: category.label,
            author: "The NYC Towing Service Dispatch",
          }),
          faqPageSchema(
            tips.faq.map((f) => ({
              question: f.q,
              answer: stripTokens(f.a),
            })),
          ),
        ]}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            Emergency 101 & Step-by-Step Guide
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            {service.title} in <span className="gradient-text">NYC</span> — Complete Guide, Pricing &amp; 24/7 Dispatch
          </h1>
          <p className="mt-4 text-xl font-bold text-teal-200 font-heading">{service.subtitle}</p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            What to do right now, what it costs, why it happens, and how we handle the call — straight from The NYC Towing Service dispatch team.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* Intro */}
      <section className="bg-section-white py-14">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 font-cta">Overview</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">
            The Short Version of {service.title} in NYC
          </h2>
          <p className="mt-6 text-base leading-relaxed text-slate-700">
            <RichText text={tips.intro} />
          </p>
        </div>
      </section>

      {/* What to do right now */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 font-cta">Emergency 101</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">
            What to Do Right Now — Step by Step for {service.title} in NYC
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Follow these steps the moment you realize you need help. They are tuned for NYC — narrow streets, alternate-side enforcement, bridge and tunnel approaches, and the traffic that makes every minute count.
          </p>
          <ol className="mt-8 space-y-4">
            {tips.rightNow.map((step, i) => (
              <li key={i} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                  {i + 1}
                </div>
                <p className="text-base leading-relaxed text-slate-700">
                  <RichText text={step} />
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Do / Don't */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-teal-700 font-cta">Common Mistakes</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Do's and Don'ts for {service.title}
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border-2 border-teal-400 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-widest text-teal-700 font-cta">Do</p>
              <ul className="mt-4 space-y-3">
                {tips.dos.map((d, i) => (
                  <li key={i} className="flex gap-3 text-base text-slate-700">
                    <span className="mt-0.5 inline-block h-5 w-5 shrink-0 rounded-full bg-teal-600 text-center text-xs font-bold leading-5 text-white">+</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-widest text-slate-600 font-cta">Don't</p>
              <ul className="mt-4 space-y-3">
                {tips.donts.map((d, i) => (
                  <li key={i} className="flex gap-3 text-base text-slate-700">
                    <span className="mt-0.5 inline-block h-5 w-5 shrink-0 rounded-full bg-slate-600 text-center text-xs font-bold leading-5 text-white">×</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cost */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 font-cta">What It Costs</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">
            {service.title} Pricing in NYC — Flat Rates & What Affects Them
          </h2>
          <p className="mt-6 text-base leading-relaxed text-slate-700">
            <RichText text={tips.cost} />
          </p>
          <div className="mt-6 rounded-xl border-2 border-teal-400 bg-white p-5 text-center">
            <p className="text-base font-bold text-teal-700 font-heading">{category.label}</p>
            <p className="mt-1 text-sm text-slate-600">{category.description}</p>
            <Link href="/pricing" className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:underline font-cta">
              View Full Pricing Details →
            </Link>
          </div>
        </div>
      </section>

      {/* Why it happens */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 font-cta">Why It Happens</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">
            Common Causes of {service.title} Calls in NYC
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Every breakdown has a story. These are the patterns we see most often on NYC streets — tuned for local conditions, local vehicles, and local wear.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {tips.causes.map((cause, i) => (
              <li key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-base text-slate-700">
                  <span className="mr-2 font-bold text-teal-700">{i + 1}.</span>
                  {cause}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How we handle the call */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-teal-700 font-cta">Our Process</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            How We Handle {service.title} Calls — Dispatch to Done
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Dispatch",
                desc: `Call ${PHONE}. NYC dispatcher confirms location, symptom, and vehicle. Flat-rate quoted on the phone, truck number and driver name before you hang up.`,
              },
              {
                step: "2",
                title: "Arrival",
                desc: "Truck arrives in 20-40 min typical. Driver confirms the situation, takes timestamped photos, and walks through what happens next.",
              },
              {
                step: "3",
                title: "Work",
                desc: "The actual service — tow, jump, tire, lockout, recovery. Done the right way, documented in real time. Nothing happens out of sight.",
              },
              {
                step: "4",
                title: "Payment",
                desc: "Paid on completion: card, Apple Pay, Google Pay, or cash. Receipt emailed immediately. Insurance direct-billed when coverage applies.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related services */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-teal-700 font-cta">Related Services</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            Services Related to {service.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-slate-700">
            Call dispatch at {PHONE} and describe the situation — we often handle several of these on one visit. Browse{" "}
            <Link href="/services" className="text-teal-700 font-semibold hover:underline">all our services</Link>{" "}
            or{" "}
            <Link href="/locations" className="text-teal-700 font-semibold hover:underline">find your NYC neighborhood</Link>{" "}
            for local dispatch details.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md"
              >
                <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">
                  {s.title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-teal-600">{s.subtitle}</p>
                <p className="mt-3 text-sm text-slate-600">{s.description}</p>
                <p className="mt-3 text-sm font-semibold text-teal-600 font-cta">
                  Read the Full Guide →
                </p>
                <Link
                  href={`/services/${s.slug}/tips`}
                  className="mt-1 inline-block text-xs font-semibold text-slate-500 hover:text-teal-700 hover:underline"
                >
                  {s.title} tips & how-to →
                </Link>
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

      {/* FAQ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-teal-700 font-cta">FAQ</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            {service.title} Frequently Asked Questions
          </h2>
          <div className="mt-10 space-y-4">
            {tips.faq.map((item, i) => (
              <details key={i} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <summary className="cursor-pointer list-none text-base font-bold text-slate-900 font-heading">
                  <span className="mr-2 inline-block text-teal-700">Q{i + 1}.</span>
                  {item.q}
                </summary>
                <p className="mt-3 text-base leading-relaxed text-slate-700">
                  <RichText text={item.a} />
                </p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-600">
            Still have questions? See our{" "}
            <Link href="/faq" className="text-teal-700 font-semibold hover:underline">
              full FAQ
            </Link>{" "}
            or call dispatch at{" "}
            <Link href={`tel:+12124704068`} className="text-teal-700 font-semibold hover:underline">
              {PHONE}
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Large CTA block */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            Dispatch is Live — 24/7
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl font-heading">
            Need {service.title} Right Now?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Call, text, or request a tow online. Flat-rate quoted on the phone. 20-40 min typical arrival across all five boroughs.
          </p>
          <CtaButtons variant="dark" />
          <p className="mt-8 text-sm text-white/70">
            <RichTextDark text={`Prefer the service overview? {link:/services/${service.slug}|Back to ${service.title}} · {link:/services|All services} · {link:/pricing|Pricing}`} />
          </p>
        </div>
      </section>
    </>
  );
}
