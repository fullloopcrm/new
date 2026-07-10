import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

export const metadata: Metadata = {
  title: "Stretch Service Pricing | $99/hr | 10% Off Weekly | All 50 States",
  description: "Stretch Service pricing: $99/hr single session, $89/hr weekly (10% off). Mobile stretch service nationwide. Professional equipment included. Same-day available.",
  alternates: { canonical: `${SITE_URL}/pricing` },
};

const pricingTiers = [
  {
    name: "Single Session",
    price: "$99",
    per: "per session",
    description: "Perfect for trying assisted stretching or occasional sessions when you need relief.",
    features: [
      "60-minute session",
      "Full-body mobility assessment",
      "Personalized treatment plan",
      "Professional equipment included",
      "Any location nationwide",
      "Same-day availability",
    ],
    highlight: false,
  },
  {
    name: "Weekly Program",
    price: "$89",
    per: "per session",
    description: "Best value for consistent results. Weekly clients see the biggest improvements in flexibility and pain relief.",
    features: [
      "60-minute sessions weekly",
      "10% savings per session",
      "Priority scheduling",
      "Same therapist continuity",
      "Progress tracking",
      "Customized long-term plan",
      "Flexible rescheduling",
    ],
    highlight: true,
  },
  {
    name: "Group / Corporate",
    price: "Custom",
    per: "per program",
    description: "On-site stretching for offices, teams, events, and group wellness programs nationwide.",
    features: [
      "Multiple therapists available",
      "On-site at your office or venue",
      "Flexible scheduling",
      "Employee wellness programs",
      "Team building events",
      "Volume pricing available",
    ],
    highlight: false,
  },
];

const faqItems = [
  { question: "How much does a single stretch service session cost?", answer: "A single 60-minute mobile stretch service session costs $99. This is a flat rate that includes everything — travel to your location, professional equipment, a full-body mobility assessment, and 60 minutes of personalized assisted stretching therapy. There are no hidden fees, no surcharges for specific locations (home, office, hotel, park), and no extra charges for equipment or setup. The $99/hr rate is the same across all 50 states and 902+ cities." },
  { question: "What does the weekly program cost?", answer: "The weekly stretch service program is $89 per session — a 10% discount off the standard $99/hr rate. This discount is applied automatically to every session for weekly clients. Weekly clients also receive priority scheduling, same-therapist continuity, progress tracking, and a customized long-term treatment plan. There are no contracts or long-term commitments — you can pause or cancel your weekly program at any time." },
  { question: "Are there any hidden fees?", answer: "No. The price you see is the price you pay. A single session is $99. A weekly session is $89. That includes everything: travel to your location, professional equipment, mobility assessment, 60 minutes of hands-on stretching therapy, and post-session recommendations. There are no setup fees, no cancellation fees (with 4+ hours notice), no equipment charges, and no surcharges for specific locations. Stretch Service believes in transparent, honest pricing." },
  { question: "How does corporate stretch service pricing work?", answer: "Corporate stretch service pricing is customized based on your company&apos;s needs — including the number of employees, session frequency, program duration, and whether sessions are individual or group format. Volume discounts apply for companies booking multiple sessions per week. We provide on-site therapists at your office for individual employee sessions, team wellness events, or ongoing weekly programs. Contact us for a custom corporate quote." },
  { question: "Is the $99/hr rate the same everywhere?", answer: "Yes. Stretch Service charges $99/hr for single sessions and $89/hr for weekly sessions regardless of your location. Whether you are in New York City, rural Montana, or anywhere in between — the price is the same. We do not charge extra for specific neighborhoods, hotel locations, outdoor sessions, or hard-to-reach areas. One price, nationwide, all-inclusive." },
  { question: "Is stretch service worth $99/hr?", answer: "Absolutely. Consider what $99/hr gets you: a certified stretch therapist who comes to your location with all professional equipment, performs a comprehensive mobility assessment, and delivers 60 minutes of personalized assisted stretching therapy. Compare that to a stretching studio membership ($150-$250/month for less personalized sessions), a single physical therapy session ($50-$150+ copay), or a massage ($120-$200/hr in most cities). Stretch service delivers comparable or better results at a competitive price — with the added convenience of mobile service." },
  { question: "Can I try a single session before committing to weekly?", answer: "Yes, and we actually recommend it. Most clients book a single $99 session first to experience stretch service and meet their therapist. After feeling the results — which are typically dramatic and immediate — the majority of clients choose to sign up for the weekly program at $89/session. There is zero pressure to commit to weekly. We want you to experience the value firsthand before making any recurring commitment." },
  { question: "Do you offer discounts for seniors, veterans, or military?", answer: "Yes. Stretch Service offers a 10% community discount for seniors (65+), military veterans, active service members, first responders (police, fire, EMS), and individuals with disabilities. This brings the single session rate to $89 — the same as our weekly program rate. Community discounts can be combined with the weekly program for additional savings. Just mention your eligibility when booking — no paperwork required." },
];

export default function PricingPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Stretch Service Pricing", "Mobile assisted stretching pricing nationwide. $99/session, $89 weekly.", `${SITE_URL}/pricing`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Pricing", url: `${SITE_URL}/pricing` },
      ])} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Simple, Transparent Pricing</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch Service Pricing — $99/hr
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Professional mobile assisted stretching with no hidden fees. Everything is included — equipment, travel, and a personalized session at your location. 10% off for weekly clients.
          </p>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl border p-6 ${
                  tier.highlight
                    ? "border-teal-400 bg-teal-50 shadow-lg ring-2 ring-teal-400"
                    : "border-slate-200 bg-white"
                }`}
              >
                {tier.highlight && (
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-teal-600 font-cta">Most Popular</p>
                )}
                <h2 className="text-xl font-bold text-slate-900 font-heading">{tier.name}</h2>
                <div className="mt-3">
                  <span className="text-4xl font-bold text-teal-700">{tier.price}</span>
                  <span className="ml-2 text-sm text-slate-500">{tier.per}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{tier.description}</p>
                <ul className="mt-6 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 text-teal-600 font-bold">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={SITE_SMS_LINK}
                  className={`mt-6 block rounded-lg px-6 py-3 text-center text-sm font-semibold transition-colors font-cta ${
                    tier.highlight
                      ? "bg-teal-600 text-white hover:bg-teal-700"
                      : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                  }`}
                >
                  {tier.name === "Group / Corporate" ? "Get a Quote" : "Book Now"}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Pricing Breakdown */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Detailed Stretch Service Pricing Breakdown</h2>
          <div className="mt-8 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Stretch Service pricing is designed to be simple, transparent, and all-inclusive. When you book a stretch service session at $99/hr, that price covers everything: your certified therapist&apos;s time and expertise, travel to your location (anywhere in the United States), all professional equipment (mats, straps, bolsters, accessories), a comprehensive mobility assessment at the start of every session, 60 minutes of hands-on personalized stretching therapy, and post-session recommendations for maintaining your results between appointments.
            </p>
            <p>
              There are no hidden fees. There is no setup charge. There is no equipment surcharge. There is no premium for hotel sessions, outdoor park sessions, or hard-to-reach locations. There is no tipping obligation (though tips are always appreciated). And there is no cancellation fee as long as you provide at least 4 hours notice. The $99/hr rate is the same whether your session takes place in a Manhattan penthouse, a suburban home in Texas, a hotel room in Florida, or an outdoor park in California. One price. Everywhere. All-inclusive.
            </p>
            <p>
              For weekly clients, the math is even better. At $89/session (10% off), you save $10 on every session. Over a year of weekly stretch service sessions, that&apos;s $520 in savings — equivalent to more than five free sessions. Weekly clients also receive priority scheduling (you get first choice of time slots), same-therapist continuity (the same therapist every week who knows your body and tracks your progress), and a customized long-term treatment plan designed to produce cumulative results in flexibility, pain reduction, and overall mobility.
            </p>
            <p>
              Corporate stretch service pricing is customized based on your organization&apos;s needs. Volume discounts apply for companies booking multiple sessions per week, and package pricing is available for ongoing programs. A typical corporate program might include weekly on-site sessions for 10-20 employees at a per-session rate significantly below the individual $99/hr price. <Link href="/corporate-wellness" className="text-teal-600 underline hover:text-teal-700">Contact us about corporate wellness programs</Link> for a custom quote.
            </p>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What&apos;s Included in Every $99 Stretch Service Session</h2>
          <p className="mt-3 text-center text-base text-slate-600 max-w-2xl mx-auto">Every stretch service session — whether single or weekly — includes all of the following at no additional cost.</p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              "Full-body mobility assessment",
              "60 minutes of professional assisted stretching",
              "PNF and assisted stretching techniques",
              "Professional stretching mat and equipment",
              "Resistance straps and bolsters",
              "Personalized treatment plan",
              "Post-session recommendations and self-care tips",
              "Travel to your location — home, office, hotel, park",
              "No hidden fees or surcharges",
              "No equipment charges",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-teal-200/60 bg-white p-4">
                <span className="mt-0.5 text-teal-600 font-bold">&#10003;</span>
                <p className="text-sm text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison to Competitors */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretch Service vs. Competitors: Pricing Comparison</h2>
          <div className="mt-8 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              How does stretch service pricing compare to other options? Let&apos;s break it down. A typical stretching studio franchise charges $150-$250 per month for a membership that includes one or two sessions per week. These sessions happen at their location (not yours), on their schedule (not yours), and often in a semi-private or group format. At Stretch Service, $89/week for a private, mobile, one-on-one session at your location with your own dedicated therapist is a comparable or better value — with dramatically more convenience and personalization.
            </p>
            <p>
              Physical therapy sessions typically cost $50-$150 out of pocket (after insurance copays) and require office visits, referrals, and appointment availability that can be limited. While stretch service is not a replacement for medical physical therapy, many clients use it as a maintenance and prevention tool that keeps them out of the PT office in the first place. At $99/hr with same-day availability and mobile service, stretch service fills a unique niche between clinical physical therapy and general wellness stretching.
            </p>
            <p>
              Massage therapy in most US cities ranges from $120-$200/hr for a quality in-home session. Stretch service at $99/hr delivers comparable hands-on therapy time with a focus on mobility and flexibility rather than soft tissue manipulation. Many clients find that stretch service produces more lasting results for pain relief and range of motion than massage alone. Some clients book both — massage for relaxation and soft tissue work, and stretch service for flexibility and mobility gains.
            </p>
            <p>
              Personal training sessions with a stretching component typically cost $80-$150/hr, but the stretching portion is usually just 10-15 minutes of a broader fitness session. With stretch service, you get a full 60 minutes focused exclusively on assisted stretching techniques performed by a certified stretch specialist. The depth of technique, the time dedicated to stretching, and the specialized expertise of our therapists produce results that a few minutes of stretching at the end of a personal training session simply cannot match.
            </p>
          </div>
        </div>
      </section>

      {/* Is Stretch Service Worth It? */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Is Stretch Service Worth $99/hr? The ROI of Professional Stretching</h2>
          <div className="mt-8 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              The return on investment for professional stretch service sessions is significant when you consider the full picture. Chronic pain costs the average American $2,000-$5,000 per year in medical visits, medications, and lost productivity. A single stretch service session at $99/hr can provide immediate relief for many common pain conditions — lower back pain, neck tension, shoulder tightness, hip pain, and more. Weekly sessions at $89 each ($4,628/year) can dramatically reduce or eliminate chronic pain, potentially saving thousands in medical costs and missed work days.
            </p>
            <p>
              For athletes, the ROI is measured in performance and injury prevention. Professional assisted stretching improves flexibility by 2-3x more than self-stretching (especially with PNF techniques), speeds recovery by 40-60%, and significantly reduces injury risk. A single sports injury can cost $1,000-$10,000+ in medical bills, physical therapy, and lost training time. Regular stretch service sessions are a fraction of that cost and help prevent the injuries from happening in the first place.
            </p>
            <p>
              For seniors, the ROI is measured in independence and quality of life. Falls are the leading cause of injury for adults over 65, costing an average of $35,000 per fall in medical expenses. Professional stretch service improves balance, increases mobility, and reduces fall risk — potentially preventing the kinds of injuries that lead to hospitalization, surgery, and loss of independence. At $89-$99 per session, stretch service is one of the most cost-effective preventive health investments a senior can make.
            </p>
            <p>
              For corporate clients, the ROI is measured in productivity and healthcare cost reduction. Workplace musculoskeletal disorders cost US employers $45-$54 billion annually. Companies that implement regular stretch service programs for employees see reductions in workplace injury claims, lower healthcare costs, improved employee satisfaction, and increased productivity. The cost of a corporate stretch service program is a fraction of the savings it generates — making it one of the highest-ROI wellness investments a company can make.
            </p>
          </div>
        </div>
      </section>

      {/* Discounts */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretch Service Discounts &amp; Special Offers</h2>
          <div className="mt-10 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">10% OFF Weekly Programs</h3>
              <p className="mt-2 text-sm text-slate-600">
                Commit to weekly stretch service sessions at $89/session (normally $99). Weekly clients get priority scheduling, same therapist continuity, progress tracking, and the best long-term results through consistent treatment. Consistency is key to lasting flexibility improvement and chronic pain reduction. No contracts — cancel or pause anytime.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Community Discount — 10% Off</h3>
              <p className="mt-2 text-sm text-slate-600">
                Seniors (65+), military veterans, active service members, first responders (police, fire, EMS), and individuals with disabilities receive an automatic 10% discount on all stretch service sessions. Just mention your eligibility when booking — no paperwork required. <Link href="/discounts" className="text-teal-600 underline hover:text-teal-700">View all discounts</Link>.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Referral Program — 10% Recurring Commission</h3>
              <p className="mt-2 text-sm text-slate-600">
                Refer a friend to Stretch Service and earn 10% of every session they book — not just their first session, every session. There is no limit on the number of people you can refer. Credits are applied to your account or paid out. The best way to save on stretch service is to share it with people you care about.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Corporate Volume Pricing</h3>
              <p className="mt-2 text-sm text-slate-600">
                Companies booking regular on-site stretching sessions for employees receive custom pricing based on frequency, group size, and program scope. Volume discounts can significantly reduce the per-session cost. <Link href="/corporate-wellness" className="text-teal-600 underline hover:text-teal-700">Learn about corporate stretch service programs</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing FAQ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretch Service Pricing FAQ</h2>
          <div className="mt-8 space-y-3">
            {faqItems.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-slate-200 bg-white">
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
          <h2 className="text-2xl font-bold text-white font-heading">Ready to Book Your Stretch Service Session?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            $99/hr single session. $89/hr weekly. All-inclusive pricing. Same-day appointments available nationwide.
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
            <Link href="/hotel-stretching" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Hotel Stretch</Link>
            <Link href="/corporate-wellness" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Corporate</Link>
            <Link href="/faq" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">FAQ</Link>
            <Link href="/discounts" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Discounts</Link>
            <Link href="/about" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">About</Link>
            <Link href="/contact" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Contact</Link>
          </div>
        </div>
      </section>
    </>
  );
}
