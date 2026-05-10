// @ts-nocheck
import Link from "next/link";
import Logo from "@/app/site/stretch-service/_components/Logo";
import type { Metadata } from "next";
import { states, SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK, SITE_EMAIL } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";

export const metadata: Metadata = {
  title: "Contact Stretch Service | Book Your Stretch Service | (888) 734-7274",
  description: "Contact Stretch Service for mobile stretch service. Text or call (888) 734-7274. $99/hr, same-day available. 902+ cities nationwide across all 50 states.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

const faqItems = [
  { question: "What is the fastest way to book a stretch service session?", answer: "The fastest way to book is to text (888) 734-7274. Our team monitors texts throughout our operating hours of 7AM to 10PM daily. Simply send your preferred date, time, and location, and we will confirm your booking within minutes. Texting is faster than calling because our scheduling team can process multiple booking requests simultaneously. Same-day appointments are often available, especially for weekday midday and afternoon slots." },
  { question: "What should I include in my text or call?", answer: "When you contact us to book a stretch service session, include: your preferred date, your preferred time (or a range of times that work), your location (home address, office, hotel name, or park), and any specific needs or concerns (chronic pain areas, injuries, preferences for stretching type). The more information you provide upfront, the faster we can confirm your booking and match you with the right therapist." },
  { question: "How quickly does Stretch Service respond?", answer: "During our operating hours of 7AM to 10PM, we typically respond to texts within 5-15 minutes and answer calls immediately. Email responses are sent within a few hours during business days. We understand that when you are ready to book a stretch service session, you want a fast confirmation — not a 24-hour wait. Our scheduling team is staffed throughout our operating hours to ensure quick response times." },
  { question: "Can I book a stretch service session for someone else?", answer: "Yes. You can book a stretch service session as a gift for a friend, family member, partner, or colleague. Just provide their name, preferred location, and any relevant health information. We will coordinate directly with the recipient for scheduling. Gift sessions are a popular choice for birthdays, holidays, Mother&apos;s Day, Father&apos;s Day, and corporate employee appreciation. The $99/hr rate applies." },
  { question: "What if I need to cancel or reschedule my stretch service session?", answer: "We ask for at least 4 hours notice for cancellations or rescheduling. With adequate notice, there is no cancellation fee and rescheduling is always free. Same-day cancellations with less than 4 hours notice may be subject to a cancellation fee. To cancel or reschedule, simply text (888) 734-7274 with your updated request. We will confirm the change within minutes." },
  { question: "Does Stretch Service have a physical office location?", answer: "Stretch Service is a mobile stretch service — our therapists come to you. We do not operate a storefront or studio location. Our administrative headquarters is at 150 W 47th Street, but all stretch service sessions are delivered at client locations: homes, offices, hotels, parks, and other venues. This mobile-first model is what allows us to offer professional stretch therapy at $99/hr across all 50 states without the overhead of brick-and-mortar locations." },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Contact Stretch Service", "Contact us to book mobile assisted stretching nationwide.", `${SITE_URL}/contact`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Contact", url: `${SITE_URL}/contact` },
      ])} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Get In Touch</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Contact Stretch Service
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Ready to book a stretch service session or have a question? Reach out by phone, text, or email. We respond quickly — usually within minutes.
          </p>
          <p className="mx-auto mt-2 text-base text-teal-200 font-semibold">$99/hr &middot; Same-Day Available &middot; 7AM-10PM Daily</p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Multiple Ways to Reach Stretch Service</h2>
          <p className="mt-3 text-center text-base text-slate-600 max-w-2xl mx-auto">Choose the method that works best for you. Text is the fastest way to book. All methods are monitored 7AM to 10PM daily, seven days a week.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <a href={SITE_SMS_LINK} className="group rounded-xl border border-slate-200 bg-white p-6 text-center transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-3xl">💬</p>
              <h3 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-teal-600 font-heading">Text Us</h3>
              <p className="mt-2 text-base font-semibold text-teal-700">{SITE_PHONE}</p>
              <p className="mt-1 text-sm text-slate-500">Fastest way to book — response within minutes</p>
            </a>
            <a href={SITE_PHONE_LINK} className="group rounded-xl border border-slate-200 bg-white p-6 text-center transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-3xl">📞</p>
              <h3 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-teal-600 font-heading">Call Us</h3>
              <p className="mt-2 text-base font-semibold text-teal-700">{SITE_PHONE}</p>
              <p className="mt-1 text-sm text-slate-500">7AM - 10PM daily, answered live</p>
            </a>
            <a href={`mailto:${SITE_EMAIL}`} className="group rounded-xl border border-slate-200 bg-white p-6 text-center transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-3xl">✉️</p>
              <h3 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-teal-600 font-heading">Email Us</h3>
              <p className="mt-2 text-base font-semibold text-teal-700">{SITE_EMAIL}</p>
              <p className="mt-1 text-sm text-slate-500">We reply within hours</p>
            </a>
          </div>
        </div>
      </section>

      {/* What to Expect When You Contact Us */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">What to Expect When You Text or Call Stretch Service</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              When you text (888) 734-7274 to book a stretch service session, here is exactly what happens. Our scheduling team receives your message and responds within 5-15 minutes (usually faster). We will confirm your preferred date, time, and location, then match you with an available certified stretch therapist in your area. You will receive a confirmation text with your therapist&apos;s name and any relevant details. On the day of your session, your therapist arrives at the confirmed time and location, ready to deliver a professional 60-minute stretch service session.
            </p>
            <p>
              If you call (888) 734-7274 instead, you will reach our scheduling team directly during operating hours (7AM to 10PM daily). They will walk you through the booking process, answer any questions about stretch service, help you choose the right service type for your needs, and confirm your appointment before you hang up. Our phone team is knowledgeable about all aspects of stretch service — from pricing ($99/hr, $89/hr weekly) to techniques to service areas — and can address any concerns you have before your first session.
            </p>
            <p>
              For email inquiries, send your message to hello@stretchservice.com. We respond to emails within a few hours during business days. Email is ideal for non-urgent inquiries, corporate wellness program requests, group booking coordination, and detailed questions that benefit from a written response. If you need to book a same-day session, we recommend texting for the fastest response time.
            </p>
          </div>
        </div>
      </section>

      {/* Booking Process Explained */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">How Booking a Stretch Service Session Works</h2>
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">1</span>
                <h3 className="text-base font-bold text-slate-900 font-heading">Contact Us</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">Text or call (888) 734-7274 with your preferred date, time, and location. Include any specific needs — areas of pain, preferred stretching type, or medical considerations. The more detail you provide, the better we can match you with the right therapist and prepare for your session.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">2</span>
                <h3 className="text-base font-bold text-slate-900 font-heading">Get Matched</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">We match you with an available certified stretch service therapist in your area. You will receive a confirmation with your therapist&apos;s name and appointment details. If you have a preferred therapist from a previous session, let us know and we will schedule them for you whenever possible.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">3</span>
                <h3 className="text-base font-bold text-slate-900 font-heading">Your Therapist Arrives</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">On the day of your session, your stretch service therapist arrives at your location on time with all professional equipment. Setup takes 2-3 minutes. Your 60-minute session begins with a mobility assessment, followed by hands-on assisted stretching personalized to your body and goals.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">4</span>
                <h3 className="text-base font-bold text-slate-900 font-heading">Feel the Difference</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600">After your session, you will feel noticeably more flexible, more relaxed, and less tense. Your therapist provides post-session recommendations. Most clients book their next session immediately — many sign up for the weekly program at $89/session (10% off) because the results are so dramatic.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Details + Form */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            {/* Info */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-heading">Business Information</h2>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-teal-200/60 bg-white p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600 font-cta">Address</h3>
                  <p className="mt-1 text-base text-slate-700">150 W 47th Street<br />Nationwide Mobile Service</p>
                </div>
                <div className="rounded-xl border border-teal-200/60 bg-white p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600 font-cta">Hours</h3>
                  <p className="mt-1 text-base text-slate-700">7:00 AM &ndash; 10:00 PM<br />7 days a week, 365 days a year</p>
                </div>
                <div className="rounded-xl border border-teal-200/60 bg-white p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600 font-cta">Service Area</h3>
                  <p className="mt-1 text-base text-slate-700">All 50 States &middot; 902+ Cities<br />We come to your location</p>
                </div>
                <div className="rounded-xl border border-teal-200/60 bg-white p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600 font-cta">Pricing</h3>
                  <p className="mt-1 text-base text-slate-700">$99/hr single session<br />$89/hr weekly (10% off)</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-heading">Send Us a Message</h2>
              <form className="mt-6 space-y-4" action={`mailto:${SITE_EMAIL}`} method="POST" encType="text/plain">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">Phone (optional)</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Your phone number"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-slate-700">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    required
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Tell us about your needs — preferred date, time, location, and any specific concerns..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-teal-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-teal-700 font-cta"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Service Areas — All 50 States */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Stretch Service Covers All 50 States</h2>
          <p className="mt-3 text-center text-base text-slate-600 max-w-2xl mx-auto">Contact us to book a stretch service session in any state. $99/hr, same-day available, 7AM-10PM daily. Click any state to see available cities.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
            {states.map((s) => (
              <Link key={s.slug} href={`/locations/${s.slug}`}>
                <div className="group rounded-lg border border-slate-200 bg-white p-2 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="text-xs font-bold text-slate-700 group-hover:text-teal-600">{s.abbr}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Contact &amp; Booking FAQ</h2>
          <div className="mt-8 space-y-3">
            {faqItems.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-teal-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-teal-700 font-heading">{faq.question}</summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Prefer to Book Directly?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Text is the fastest way to book your stretch service session. Send us your preferred date, time, and location and we&apos;ll confirm within minutes. $99/hr all-inclusive.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
              Text {SITE_PHONE} — Book Now
            </a>
            <a href={SITE_PHONE_LINK} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
              Call {SITE_PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* Explore Links */}
      <section className="bg-section-teal py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold text-slate-500 mb-4">Explore Our Assisted Stretch Service</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/services" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Services</Link>
            <Link href="/locations" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">902+ Cities</Link>
            <Link href="/parks" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Parks</Link>
            <Link href="/pricing" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Pricing</Link>
            <Link href="/hotel-stretching" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Hotel Stretch</Link>
            <Link href="/corporate-wellness" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Corporate</Link>
            <Link href="/faq" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">FAQ</Link>
            <Link href="/about" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">About</Link>
            <Link href="/discounts" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Discounts</Link>
            <Link href="/jobs" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Careers</Link>
          </div>
        </div>
      </section>
    </>
  );
}
