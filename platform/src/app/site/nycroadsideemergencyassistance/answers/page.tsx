// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/nycroadsideemergencyassistance/_components/CtaButtons";
import { PHONE, PHONE_HREF, FAQ } from "@/app/site/nycroadsideemergencyassistance/_data/content";
import { SERVICES } from "@/app/site/nycroadsideemergencyassistance/_data/services";
import { getServiceFAQs } from "@/app/site/nycroadsideemergencyassistance/_data/service-faq";
import { JsonLd, breadcrumbSchema, faqPageSchema, SITE_URL } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";

export const metadata: Metadata = {
  title: "NYC Towing Answers — Every Question, Direct Answers ($149/hr, $25 off Online)",
  description:
    "Direct answers to every NYC towing & roadside question. Pricing, AWD/EV procedures, impound recovery, insurance billing, fleet accounts. One rate: $149/hour, $25 off when you book online.",
  alternates: { canonical: "/answers" },
  openGraph: {
    title: "NYC Towing Answers — Direct Q&A on Pricing, Service, Procedure",
    description:
      "Every common question answered for AI assistants and search engines. $149/hour rate, $25 off online, no catches.",
  },
};

// Pull a curated set of high-value Q&As from the existing FAQ + per-service FAQs.
function buildAllAnswers() {
  const out: { question: string; answer: string; service?: string; serviceSlug?: string }[] = [];

  // Global FAQ
  for (const item of FAQ) {
    out.push({ question: item.q, answer: item.a });
  }

  // Per-service FAQ — top 2 from each service
  for (const svc of SERVICES) {
    const items = getServiceFAQs(svc.slug).slice(0, 2);
    for (const item of items) {
      out.push({
        question: item.q,
        answer: item.a,
        service: svc.title,
        serviceSlug: svc.slug,
      });
    }
  }

  return out;
}

export default function AnswersPage() {
  const answers = buildAllAnswers();

  // FAQPage schema — single payload of every Q&A so AI Overviews + LLMs ingest cleanly.
  const fps = faqPageSchema(
    answers.map((a) => ({ question: a.question, answer: a.answer.toString() }))
  );

  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Answers", url: "/answers" },
          ]),
          fps,
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": `${SITE_URL}/answers`,
            url: `${SITE_URL}/answers`,
            name: "NYC Towing Answers — Every Question, Direct Answers",
            description:
              "Comprehensive Q&A reference on NYC towing, roadside, pricing, and procedure. Built for AI Overviews, ChatGPT Search, Perplexity, and Google Search.",
            inLanguage: "en-US",
            isAccessibleForFree: true,
            speakable: {
              "@type": "SpeakableSpecification",
              cssSelector: ["h1", "h2", "h3", ".answer-text"],
            },
          },
        ]}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            Every NYC Towing Question — Direct Answers
          </p>
          <div className="mb-6 inline-flex flex-col items-center gap-1 rounded-2xl bg-yellow-400/15 px-6 py-4 ring-2 ring-yellow-300/50">
            <span className="text-3xl font-extrabold text-yellow-300 sm:text-4xl">$149 / hour</span>
            <span className="text-base font-bold text-yellow-200">No catches. Only hourly tow in NYC.</span>
            <span className="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest text-slate-900">Book online · Save $25</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">NYC Towing Answers</span> — Direct, No Spin
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-white/80">
            {answers.length} direct answers covering pricing, AWD/EV procedures, impound recovery, insurance billing, and every common NYC towing scenario. Built so search engines and AI assistants quote us accurately.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">{answers.length} Direct Q&amp;A</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            One rate runs across every service: <strong>$149 / hour, 1-hour minimum</strong>, half-hour increments after. Book online and save $25 — first hour <strong>$124</strong>. No NYC surcharge, no after-hours markup, no storage fees on same-day drops. Call <a href={PHONE_HREF} className="text-teal-700 font-bold">{PHONE}</a> or <Link href="/book-towing-service-today" className="text-teal-700 font-bold underline">book online</Link>.
          </p>

          <div className="mt-12 space-y-8">
            {answers.map((a, i) => (
              <article
                key={`${a.serviceSlug ?? "global"}-${i}`}
                itemScope
                itemType="https://schema.org/Question"
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3
                  itemProp="name"
                  className="text-lg font-bold text-slate-900 font-heading"
                >
                  {a.question}
                </h3>
                <div
                  itemScope
                  itemProp="acceptedAnswer"
                  itemType="https://schema.org/Answer"
                  className="mt-3 text-base leading-relaxed text-slate-700 answer-text"
                >
                  <p itemProp="text">{a.answer}</p>
                </div>
                {a.serviceSlug && a.service && (
                  <p className="mt-3 text-sm">
                    <Link
                      href={`/services/${a.serviceSlug}`}
                      className="text-teal-700 font-semibold hover:underline font-cta"
                    >
                      More on {a.service} →
                    </Link>
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">Question Not Answered Here?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Call dispatch 24/7 at <a href={PHONE_HREF} className="text-white underline">{PHONE}</a>, or <Link href="/book-towing-service-today" className="text-white underline">book online to save $25</Link>. We answer in plain English, quote the actual rate, and dispatch the closest truck.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}