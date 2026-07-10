import Link from "next/link";
import type { Metadata } from "next";
import { states, SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

export const metadata: Metadata = {
  title: "About Stretch Service | America's #1 Mobile Stretch Service | $99/hr",
  description: "About Stretch Service — America's premier mobile stretch service. Certified therapists, $99/hr, 10% off weekly. Serving all 50 states 7AM-10PM. Learn our story.",
  alternates: { canonical: `${SITE_URL}/about` },
};

const faqItems = [
  { question: "What is Stretch Service?", answer: "Stretch Service is America&apos;s premier mobile assisted stretching service. Our certified stretch therapists come directly to your home, office, hotel, park, or any location across all 50 states. We provide professional one-on-one assisted stretching sessions using PNF, passive, active, and myofascial release techniques. Every session is 60 minutes, personalized to your body, and priced at $99/hr with 10% off for weekly clients." },
  { question: "How is Stretch Service different from a stretching studio?", answer: "Unlike stretching studios that require you to travel to their location and work around their schedule, Stretch Service comes to you. We provide the same (or better) quality of professional assisted stretching, but in the comfort of your own space — your home, your office, your hotel room, or even your favorite park. There is no commute, no waiting room, and no rigid class schedule. Just private, one-on-one stretch therapy at your convenience, 7AM to 10PM daily." },
  { question: "What areas does Stretch Service cover?", answer: "Stretch Service operates across all 50 states with therapists in 902+ cities nationwide. Whether you are in New York, Los Angeles, Chicago, Houston, Phoenix, or any other city — we have certified stretch therapists ready to come to your location. Our coverage area is growing every month as we add new therapists to meet the demand for mobile stretch service across the country." },
  { question: "Are Stretch Service therapists certified?", answer: "Yes. Every Stretch Service therapist is certified in assisted stretching, PNF (Proprioceptive Neuromuscular Facilitation), and myofascial release techniques. Many of our therapists also hold Licensed Massage Therapist (LMT) credentials, personal training certifications (NASM, ACE, NSCA), or physical therapy degrees. All therapists undergo our onboarding process to ensure they meet Stretch Service&apos;s standards for professionalism, technique, and client care." },
  { question: "How much does a Stretch Service session cost?", answer: "A single 60-minute stretch service session costs $99. Weekly program members pay $89 per session — a 10% discount for consistent stretching. All prices include professional equipment, travel to your location, a full mobility assessment, and a personalized treatment plan. There are no hidden fees, no surcharges for specific locations, and no extra charges for equipment. Corporate and group pricing is available for offices and teams." },
  { question: "How do I book a Stretch Service session?", answer: "The fastest way to book is to text (888) 734-7274. You can also call (888) 734-7274 or email hello@stretchservice.com. Let us know your preferred date, time, and location, and we will match you with an available certified stretch therapist. Same-day appointments are often available. We respond to texts and calls within minutes during our operating hours of 7AM to 10PM daily." },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={webPageSchema("About Stretch Service", "Learn about America's premier mobile assisted stretching service.", `${SITE_URL}/about`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "About", url: `${SITE_URL}/about` },
      ])} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">About Us</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            About Stretch Service
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            America&apos;s premier mobile assisted stretching service. We bring professional flexibility and rehabilitation therapy directly to you — anywhere in the country.
          </p>
          <p className="mx-auto mt-2 text-base text-teal-200 font-semibold">$99/hr &middot; 50 States &middot; 902+ Cities &middot; 7AM-10PM Daily</p>
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Our Story</h2>
          <div className="mt-8 space-y-4 text-base text-slate-600 leading-relaxed">
            <p>
              Stretch Service was founded with a simple mission: make professional assisted stretching accessible to everyone. We saw a country full of people dealing with chronic pain, stiffness, and limited mobility from the demands of modern life — long commutes, hours at desks, intense workouts, aging joints, and the general wear and tear of daily living. These people needed professional help, but the existing options were inconvenient, expensive, or both.
            </p>
            <p>
              Traditional stretching studios require you to travel across town, wait for appointments, and work around their schedule. Physical therapy offices involve insurance hassles, long wait times, and often focus on injury recovery rather than proactive flexibility and pain prevention. Yoga classes are wonderful but not personalized to your specific body. We saw a gap in the market — and Stretch Service was built to fill it.
            </p>
            <p>
              We flipped the model. Instead of making clients come to us, our certified stretch therapists come directly to the client. Your home, your office, your hotel room, your favorite park — any location works. We bring professional-grade equipment and transform any space into a therapy environment. The result is a completely frictionless experience: you text us, we show up, you get stretched, you feel amazing. No commute, no parking, no changing into gym clothes in a locker room. Just professional stretch therapy in your own space, on your own schedule.
            </p>
            <p>
              What started as a small operation has grown into a nationwide mobile stretch service with certified therapists across all 50 states and 902+ cities. Every session is personalized to the client&apos;s body, goals, and schedule. We serve desk workers, athletes, seniors, tourists, corporate teams, chronic pain sufferers, and anyone who wants to move better and feel better. Our therapists bring expertise in PNF stretching, passive stretching, active stretching, myofascial release, foam rolling, recovery stretching, and more.
            </p>
            <p>
              The growth of Stretch Service has been driven entirely by results. Clients book one session, feel the difference immediately, and become weekly regulars. They tell their friends. Their friends book sessions. Word spreads. We do not rely on gimmicks or heavy advertising — we rely on delivering $99/hr sessions that are so good, clients cannot imagine going back to stretching alone. That commitment to quality and client outcomes is the foundation of everything we do, and it is what will continue to drive our growth as more Americans discover the transformative power of professional assisted stretching.
            </p>
          </div>
        </div>
      </section>

      {/* Mission and Values */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Our Mission &amp; Values</h2>
          <div className="mt-6 space-y-4 text-base text-slate-600 leading-relaxed max-w-3xl mx-auto">
            <p>
              Our mission is to help every American move better, feel better, and live without pain — by bringing world-class assisted stretching directly to their door. We believe that professional stretch therapy should not be a luxury reserved for professional athletes and the wealthy. It should be accessible, affordable, and convenient for everyone — from the office worker with chronic back pain to the senior who wants to maintain independence to the weekend warrior who wants to recover faster.
            </p>
            <p>
              At $99/hr with 10% off for weekly clients, stretch service sessions are priced to be accessible while reflecting the genuine expertise and value our certified therapists provide. Every dollar goes toward a personalized 60-minute session that includes a mobility assessment, professional equipment, targeted stretch therapy, and post-session recommendations. There are no hidden fees, no upsells, and no pressure to buy packages you do not need. We believe in transparent, honest pricing — and in delivering so much value that clients choose to come back because they want to, not because they are locked into a contract.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-teal-200/60 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-teal-600">100%</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Mobile</h3>
              <p className="mt-2 text-sm text-slate-600">We come to you. No commute, no hassle. Your home, office, hotel, or park — we bring everything needed for a professional stretch service session.</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-teal-600">50</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">States Covered</h3>
              <p className="mt-2 text-sm text-slate-600">Stretch Service operates nationwide with therapists in all 50 states and 902+ cities. Wherever you are, we can get a stretch service therapist to your location.</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-teal-600">7-10PM</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Daily Hours</h3>
              <p className="mt-2 text-sm text-slate-600">Open 7AM to 10PM, seven days a week, 365 days a year. Early morning, lunch break, evening, or weekend — we fit your schedule.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How We're Different */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How Stretch Service Is Different</h2>
          <div className="mt-8 space-y-4 text-base text-slate-600 leading-relaxed">
            <p>
              The wellness industry is full of stretching options — yoga studios, stretch franchises, physical therapy offices, personal trainers. So what makes Stretch Service different? Three things: convenience, personalization, and results.
            </p>
            <p>
              <strong>Convenience.</strong> We come to you. Period. No driving across town to a studio, no searching for parking, no waiting in a lobby, no changing in a locker room. Our stretch service therapists arrive at your location — wherever that is — with all professional equipment. Setup takes 2-3 minutes. Your 60-minute session happens in the comfort and privacy of your own space. When the session is done, your therapist packs up and you are already home. For busy professionals, parents, seniors, and anyone who values their time, this level of convenience is transformative.
            </p>
            <p>
              <strong>Personalization.</strong> Every stretch service session is one-on-one and customized to your specific body. This is not a group class where the instructor cannot see your form. This is not a generic routine repeated with every client. Your therapist assesses your mobility, identifies your restrictions and pain patterns, and builds a session tailored to your unique needs and goals. A session for a desk worker with lower back pain looks completely different from a session for a marathon runner with tight hamstrings. Our therapists have the expertise to serve both — and everyone in between.
            </p>
            <p>
              <strong>Results.</strong> Our clients feel the difference after their first session. Not in a vague, general-wellness kind of way — in a tangible, measurable way. A desk worker who could not turn their neck fully to the left walks away with full range of motion. A runner who could not touch their toes reaches past them. A senior who was afraid of falling can suddenly balance on one foot for 15 seconds. These are not theoretical benefits — they are real results that happen in real sessions, every single day, across all 50 states. And when clients see results, they come back. Most of our clients are weekly regulars who chose <Link href="/pricing" className="text-teal-600 underline hover:text-teal-700">Stretch Service&apos;s weekly program</Link> because the cumulative benefits of consistent professional stretching are extraordinary.
            </p>
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Our Team</h2>
          <p className="mt-4 text-center text-base text-slate-600 max-w-2xl mx-auto">
            Every Stretch Service therapist is certified, experienced, and passionate about helping people move better. Here is what sets our team apart.
          </p>
          <div className="mt-10 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Certified Stretch Therapists</h3>
              <p className="mt-2 text-sm text-slate-600">
                All therapists hold certifications in assisted stretching, PNF techniques, and myofascial release. Many have backgrounds in sports medicine, physical therapy, and rehabilitation. Every therapist undergoes rigorous vetting and orientation before joining our team. We do not hire beginners — our clients expect and deserve experienced professionals who understand anatomy, can assess mobility issues on sight, and deliver sessions that produce measurable results from day one.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Professional Standards</h3>
              <p className="mt-2 text-sm text-slate-600">
                Our therapists maintain the highest professional standards. They arrive on time, bring all necessary equipment, conduct thorough mobility assessments, and tailor every session to your specific needs. Professionalism, hygiene, and client comfort are non-negotiable. When a stretch service therapist enters your home, office, or hotel room, they represent our brand — and we take that responsibility seriously. Every interaction should leave you feeling respected, cared for, and better than when the session started.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Ongoing Education</h3>
              <p className="mt-2 text-sm text-slate-600">
                Our team stays current with the latest stretching techniques, sports science research, and rehabilitation methods. Continuous education ensures you receive the most effective, evidence-based treatment available. The science of flexibility and mobility is constantly evolving, and Stretch Service therapists evolve with it. Whether it is new PNF protocols, updated myofascial release techniques, or emerging research on fascial health — our therapists stay informed so your sessions stay effective.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Nationwide Coverage */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Nationwide Stretch Service Coverage</h2>
          <div className="mt-6 space-y-4 text-base text-slate-600 leading-relaxed max-w-3xl mx-auto">
            <p>
              Stretch Service provides mobile assisted stretching across all 50 states of the United States. With therapists in 902+ cities, we are the largest mobile stretch service network in the country. Whether you live in a major metro area or a mid-size city, chances are we have certified stretch therapists available in your area — ready to come to your location within the same day.
            </p>
            <p>
              Our nationwide coverage means you can book stretch service sessions wherever you are. Traveling for business? Book a hotel stretch in any city. Visiting family in another state? Schedule a session at their home. Relocating? Your Stretch Service sessions move with you. The consistency of our $99/hr pricing, professional standards, and session quality is the same whether you are in Manhattan or Montana, Miami or Minneapolis.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
            {states.map((s) => (
              <Link key={s.slug} href={`/locations/${s.slug}`}>
                <div className="group rounded-lg border border-slate-200 bg-white p-2 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="text-xs font-bold text-slate-700 group-hover:text-teal-600">{s.abbr}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 rounded-xl border border-teal-200/60 bg-teal-50 p-6">
            <h3 className="text-lg font-bold text-slate-900 font-heading">We Come To You Anywhere:</h3>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm text-slate-600">
              <li>Your home or apartment</li>
              <li>Your office or coworking space</li>
              <li>Hotels and Airbnbs</li>
              <li>Parks and outdoor spaces</li>
              <li>Gyms and fitness studios</li>
              <li>Corporate offices and events</li>
              <li>Assisted living and senior centers</li>
              <li>Any private or semi-private location</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Frequently Asked Questions About Stretch Service</h2>
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
          <h2 className="text-2xl font-bold text-white font-heading">Ready to Experience Our Assisted Stretch Service?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Book your first mobile assisted stretch service session today. $99/hr for professional stretching at your location. 10% off weekly.
          </p>
          <div className="mx-auto mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/services" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">All Services</Link>
            <Link href="/locations" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">902+ Cities</Link>
            <Link href="/parks" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Parks</Link>
            <Link href="/pricing" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Pricing</Link>
            <Link href="/hotel-stretching" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Hotel Stretch</Link>
            <Link href="/corporate-wellness" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Corporate</Link>
            <Link href="/stretching-101" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Stretching 101</Link>
            <Link href="/faq" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">FAQ</Link>
            <Link href="/jobs" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Careers</Link>
            <Link href="/discounts" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Discounts</Link>
            <Link href="/contact" className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/20 transition-colors">Contact</Link>
          </div>
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
    </>
  );
}
