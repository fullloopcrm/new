import Link from "next/link";
import Logo from "@/app/site/stretch-ny/_components/Logo";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-ny/_lib/schema";

export const metadata: Metadata = {
  title: "Stretch Service FAQ | NYC Mobile Stretching Questions",
  description: "Frequently asked questions about Stretch NYC mobile stretch service. Pricing, booking, locations, safety, certifications & more. $99/hr, same-day available.",
  alternates: { canonical: `${SITE_URL}/faq` },
};

const faqs = [
  {
    question: "How much does a stretching session cost?",
    answer: "A single 60-minute mobile stretching session is $99. Weekly program members pay $89 per session (10% discount). All prices include professional equipment, travel to your location, and a personalized treatment plan. No hidden fees.",
  },
  {
    question: "How do I book a session?",
    answer: "The easiest way to book is to text or call us at 212-202-7080. We'll confirm your location, preferred time, and match you with an available therapist. Same-day appointments are often available.",
  },
  {
    question: "Where do you provide stretching services?",
    answer: "We serve all five NYC boroughs: Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. We come to your home, apartment, office, hotel, Airbnb, gym, park, or any location across New York City.",
  },
  {
    question: "What should I wear to a stretching session?",
    answer: "Wear comfortable, stretchy clothing — athletic wear, yoga clothes, or anything that allows full range of motion. Avoid jeans, belts, or restrictive clothing. No special shoes needed.",
  },
  {
    question: "How long is each session?",
    answer: "Standard sessions are 60 minutes. This includes a mobility assessment, comprehensive stretching therapy, and post-session recommendations. The full hour is dedicated to your treatment.",
  },
  {
    question: "Do you bring all the equipment?",
    answer: "Yes! Our therapists bring everything needed: professional massage table, stretching mats, straps, and all necessary tools. We transform any space — even a small NYC apartment — into a professional therapy environment.",
  },
  {
    question: "Are your therapists certified?",
    answer: "Absolutely. All Stretch NYC therapists are certified in assisted stretching, PNF (Proprioceptive Neuromuscular Facilitation), and myofascial release. Many have additional backgrounds in sports medicine, physical therapy, and rehabilitation.",
  },
  {
    question: "Is assisted stretching safe?",
    answer: "Yes. Assisted stretching performed by a certified therapist is very safe. Our therapists use controlled, gradual movements and constant communication to ensure your comfort. Every stretch is adjusted to your flexibility level and any medical conditions.",
  },
  {
    question: "Can stretching help with chronic pain?",
    answer: "Yes, professional assisted stretching is highly effective for chronic pain including lower back pain, neck tension, sciatica, shoulder tightness, and hip pain. Many clients experience significant relief after their first session.",
  },
  {
    question: "What is PNF stretching?",
    answer: "PNF (Proprioceptive Neuromuscular Facilitation) is the most effective stretching technique in sports science. It combines passive stretching with isometric contractions to achieve 2-3x greater flexibility gains than static stretching alone. All our therapists are PNF certified.",
  },
  {
    question: "How often should I get stretched?",
    answer: "For best results, we recommend weekly sessions. Consistent stretching produces cumulative benefits — improved flexibility, reduced pain, better posture, and enhanced recovery. Many clients start with weekly sessions and adjust based on their goals.",
  },
  {
    question: "Can I book same-day appointments?",
    answer: "Yes! We offer same-day appointments subject to therapist availability. Text or call 212-202-7080 to check availability in your area. Morning and evening slots tend to fill fastest.",
  },
  {
    question: "Do you offer corporate wellness programs?",
    answer: "Yes, we provide on-site corporate wellness programs for NYC offices. Employee stretching reduces workplace injuries, improves productivity, and boosts morale. Contact us for custom corporate pricing.",
  },
  {
    question: "What is the cancellation policy?",
    answer: "We ask for at least 4 hours notice for cancellations or rescheduling. Same-day cancellations with less than 4 hours notice may be subject to a cancellation fee. We understand NYC schedules change — just give us as much notice as possible.",
  },
  {
    question: "Can seniors benefit from assisted stretching?",
    answer: "Absolutely. Assisted stretching is excellent for seniors. It improves mobility, reduces fall risk, relieves joint stiffness, and enhances quality of life. Our therapists are experienced with senior clients and adjust techniques for comfort and safety.",
  },
  {
    question: "Do you work with athletes?",
    answer: "Yes, we work with professional athletes, weekend warriors, runners, gym-goers, and anyone who trains regularly. Assisted stretching improves performance, speeds recovery, and prevents injuries. Many NYC athletes use us as part of their regular training routine.",
  },
  {
    question: "What areas of the body do you stretch?",
    answer: "We provide full-body stretching covering neck, shoulders, upper back, lower back, hips, hamstrings, quads, calves, and more. Each session is customized to target your specific problem areas while maintaining overall flexibility.",
  },
  {
    question: "Do you come to hotels for visitors and tourists?",
    answer: "Yes! We come directly to your hotel room anywhere in NYC. It's perfect for tourists who've been walking all day exploring the city, business travelers with jet lag and stiffness, or anyone visiting New York who wants to feel their best.",
  },
];

export default function FAQPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Stretch NYC FAQ", "Frequently asked questions about mobile assisted stretching in NYC.", `${SITE_URL}/faq`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "FAQ", url: `${SITE_URL}/faq` },
      ])} />
      <JsonLd data={faqSchema(faqs)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Questions &amp; Answers</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Everything you need to know about Stretch NYC&apos;s mobile assisted stretching service.
          </p>
        </div>
      </section>

      {/* FAQ List */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-bold text-slate-900 font-heading">{faq.question}</h2>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Still Have Questions?</h2>
          <p className="mt-4 text-base text-slate-600">
            We&apos;re happy to answer any questions about our mobile stretching service. Text or call us anytime between 7AM and 10PM.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK} className="inline-block rounded-lg bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-teal-700 font-cta">
              Text {SITE_PHONE}
            </a>
            <a href={SITE_PHONE_LINK} className="inline-block rounded-lg border-2 border-teal-600 px-8 py-3.5 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Call {SITE_PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Ready to Feel the Difference?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Book your first mobile stretching session today. $99 for 60 minutes at your NYC location.
          </p>
          <a href={SITE_SMS_LINK} className="mt-6 inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
            Text {SITE_PHONE} — Book Now
          </a>
        </div>
      </section>
      {/* Explore Links */}
      <section className="bg-section-teal py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold text-slate-500 mb-4">Explore Our Assisted Stretch Service</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/services" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Services</Link>
            <Link href="/locations" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">374 Neighborhoods</Link>
            <Link href="/parks" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">132 Parks</Link>
            <Link href="/pricing" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Pricing</Link>
            <Link href="/hotel-stretching" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Hotel Stretch</Link>
            <Link href="/corporate-wellness" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Corporate</Link>
            <Link href="/stretching-101" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Stretching 101</Link>
            <Link href="/faq" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">FAQ</Link>
            <Link href="/jobs" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Careers</Link>
            <Link href="/discounts" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Discounts</Link>
            <Link href="/services/assisted-stretch-service-in-nyc" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Assisted Stretch</Link>
            <Link href="/services/pnf-stretch-service-in-nyc" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">PNF Stretching</Link>
            <Link href="/locations/manhattan" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Manhattan</Link>
            <Link href="/locations/brooklyn" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Brooklyn</Link>
            <Link href="/locations/queens" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Queens</Link>
          </div>
        </div>
      </section>

    </>
  );
}
