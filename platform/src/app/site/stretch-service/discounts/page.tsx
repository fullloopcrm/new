// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

const pageTitle = "Stretch Service Discounts | 10% Off Weekly, Referrals & More";
const pageDescription =
  "Save on Stretch Service mobile stretch service. 10% off weekly, community discounts for seniors/veterans/first responders, 10% referral rewards. $99/hr base rate.";
const pageUrl = `${SITE_URL}/discounts`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
};

const discounts = [
  {
    icon: "📅",
    title: "Weekly Program Discount",
    savings: "10% Off Every Session",
    price: "$89/session (reg. $99)",
    description:
      "Commit to weekly stretching and save on every single session. Weekly clients enjoy priority scheduling, same-therapist continuity, and the best long-term results through consistent treatment.",
    details: [
      "10% off every session — $89 instead of $99",
      "Priority scheduling with preferred time slots",
      "Same therapist every week for continuity",
      "Better results through consistent treatment",
      "Cancel or pause anytime — no long-term contracts",
    ],
  },
  {
    icon: "🇺🇸",
    title: "Community Discount",
    savings: "10% Off Every Session",
    price: "$89/session (reg. $99)",
    description:
      "We proudly support the people who make our communities great. Elderly residents, military veterans, active service members, first responders, and individuals with disabilities receive an automatic 10% discount on all stretch services.",
    details: [
      "Senior citizens (65+)",
      "Military veterans & active service members",
      "Police officers & firefighters",
      "EMS and first responders",
      "Individuals with disabilities",
      "Just mention your status when booking — no paperwork",
    ],
  },
  {
    icon: "🎁",
    title: "Referral Rewards",
    savings: "10% Recurring Commission",
    price: "Earn from every session your referrals book",
    description:
      "Love Stretch Service? Share it with friends, family, or colleagues and earn 10% of every session they book — not just their first, but every single appointment. The more people you refer, the more you earn.",
    details: [
      "Earn 10% of every service your referrals book",
      "Recurring — not just the first session, every session",
      "No limit on the number of people you can refer",
      "Credit applied to your account or paid out",
      "Share your unique referral link or just give your name",
    ],
  },
];

const faqItems = [
  { question: "How does the weekly stretch service discount work?", answer: "When you commit to weekly stretch service sessions, every session is automatically discounted to $89 instead of the standard $99 — a 10% savings on every session. Over a year of weekly sessions, that is $520 in savings, equivalent to more than five free sessions. Weekly clients also receive priority scheduling (first choice of time slots), same-therapist continuity (the same therapist who knows your body every week), and a customized long-term treatment plan. There are no contracts — you can pause or cancel anytime." },
  { question: "Who qualifies for the community discount?", answer: "The Stretch Service community discount is available to senior citizens (65+), military veterans, active-duty service members, police officers, firefighters, EMS professionals, and individuals with disabilities. The discount is 10% off every stretch service session, bringing the rate from $99 to $89. Just mention your eligibility when booking — no paperwork, no proof required. We operate on an honor system because we trust and respect the communities we serve." },
  { question: "How does the referral program work?", answer: "The Stretch Service referral program rewards you with 10% of every session your referrals book — and this is recurring, not just a one-time bonus. If you refer a friend who books a weekly stretch service session at $89/session, you earn $8.90 from every single session they attend. Refer five friends who each book weekly, and you are earning $44.50 per week in referral credits. There is no limit to the number of people you can refer. Credits can be applied to your own sessions or paid out." },
  { question: "Can I combine multiple stretch service discounts?", answer: "In most cases, yes. The community discount and weekly program discount can often be combined, as they serve different purposes — one rewards consistency, the other honors community service. Referral credits apply on top of any session pricing. The specific combination depends on the discounts involved, so mention all applicable discounts when you book and our team will apply the best available pricing to your stretch service sessions." },
  { question: "Is there a corporate discount for stretch service?", answer: "Yes. Companies that book regular on-site stretch service sessions for employees receive custom volume pricing that can significantly reduce the per-session cost. Corporate stretch service discounts are based on session frequency, number of employees, and program scope. A company booking weekly sessions for 10+ employees will receive a substantially better per-session rate than the standard $99/hr individual pricing. Contact us for a custom corporate quote." },
  { question: "How do I claim my stretch service discount?", answer: "Claiming your discount is simple. When you text or call (888) 734-7274 to book your session, just mention which discount applies to you — weekly program, community discount (and your qualifying status), or referral credit. Our team will apply the discount to your session. For referral rewards, provide the name of the person who referred you (or share your own referral link with friends). There is no paperwork, no verification process, and no waiting period for any stretch service discount." },
];

export default function DiscountsPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema(pageTitle, pageDescription, pageUrl, [
            { name: "Home", url: SITE_URL },
            { name: "Discounts", url: pageUrl },
          ]),
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Discounts", url: pageUrl },
          ]),
        ]}
      />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-teal-600 to-teal-800 text-white py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Stretch Service Discounts &amp; Savings
          </h1>
          <p className="text-lg md:text-xl text-teal-100 max-w-2xl mx-auto">
            Three ways to save on professional mobile assisted stretch service. Base rate: $99/hr. Weekly clients save 10% automatically.
          </p>
        </div>
      </section>

      {/* Discounts */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="space-y-12">
            {discounts.map((discount) => (
              <div
                key={discount.title}
                className="bg-gray-50 rounded-2xl p-8 md:p-10 border border-gray-100"
              >
                <div className="flex items-start gap-4 mb-4">
                  <span className="text-4xl">{discount.icon}</span>
                  <div>
                    <h2 className="font-heading text-2xl md:text-3xl font-bold text-gray-900">
                      {discount.title}
                    </h2>
                    <p className="text-teal-600 font-semibold text-lg">
                      {discount.savings}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">{discount.price}</p>
                  </div>
                </div>
                <p className="text-gray-700 text-lg mb-6">{discount.description}</p>
                <ul className="space-y-2">
                  {discount.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2 text-gray-700">
                      <span className="text-teal-500 mt-1">&#10003;</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly Discount Deep Dive */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Why the Weekly Stretch Service Discount Is Our Most Popular Offer</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              The weekly stretch service program at $89/session is by far our most popular discount, and it is not just because of the 10% savings — though saving $520/year is significant. The real reason weekly clients choose this program is because consistent professional stretching produces dramatically better results than occasional sessions. Flexibility is cumulative. Pain reduction is cumulative. Range of motion improvements are cumulative. Your body responds to regular stretching the way it responds to regular exercise — with compounding benefits that build week over week.
            </p>
            <p>
              Weekly stretch service clients report the most dramatic improvements in flexibility, the most significant reductions in chronic pain, and the highest satisfaction ratings of any client group. This makes sense when you consider the science: a single stretch service session produces immediate but temporary improvements in flexibility and pain. A weekly program produces those same immediate benefits PLUS progressive, lasting changes in muscle length, fascial mobility, and joint range of motion that a single session cannot achieve.
            </p>
            <p>
              Beyond the physical benefits, the weekly program includes same-therapist continuity — meaning you work with the same stretch service therapist every week. This therapist learns your body, tracks your progress, remembers your trouble spots, and adapts your sessions as you improve. This continuity of care is like having a personal flexibility coach who knows exactly where you started and how far you have come. Many of our weekly clients develop genuine professional relationships with their therapists that enhance every session.
            </p>
            <p>
              The weekly program has no contracts and no long-term commitments. You can pause or cancel at any time with no fees. We believe that the results speak for themselves — and the vast majority of weekly clients continue their programs month after month because they feel the difference in their bodies and do not want to give it up. At $89/session for a private, mobile, one-on-one professional stretching session delivered to your location, it is one of the best wellness investments you can make.
            </p>
          </div>
        </div>
      </section>

      {/* Referral Program Deep Dive */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">The Stretch Service Referral Program — Earn 10% on Every Session</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              The Stretch Service referral program is one of the most generous in the wellness industry. When you refer someone to Stretch Service, you earn 10% of every session they book — not just their first session, but every single session, indefinitely. This is a recurring commission that continues as long as your referral remains a client. If your referral becomes a weekly client at $89/session, you earn $8.90 every single week from that one referral.
            </p>
            <p>
              There is no limit to the number of people you can refer. Refer 5 friends who each book weekly stretch service sessions, and you are earning $44.50 per week — $2,314 per year — in referral credits. Refer 10 weekly clients, and your referral income covers the cost of your own weekly stretch service sessions entirely. Some of our most active referrers have effectively made their own stretch service sessions free through the referral program alone.
            </p>
            <p>
              Referral credits can be applied to your own stretch service sessions (reducing your out-of-pocket cost) or paid out as cash. The choice is yours. To refer someone, simply give them your name and tell them to mention it when they book. You can also request a unique referral link to share via text, email, or social media. When your referral books their first session and mentions your name (or uses your link), the referral is tracked automatically and your commission begins.
            </p>
            <p>
              The referral program works because stretch service sells itself. When someone experiences their first professional assisted stretching session — feeling muscles release, pain melt away, and flexibility improve in real time — they immediately understand the value. Your job as a referrer is simply to introduce people to the experience. We handle everything else: booking, scheduling, delivering world-class stretch therapy at $99/hr, and tracking your commission. It is the easiest referral program you will ever participate in because the product genuinely transforms how people feel.
            </p>
          </div>
        </div>
      </section>

      {/* Corporate Volume Discounts */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Corporate Stretch Service Volume Discounts</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Companies and organizations that book regular stretch service sessions for their employees or members receive custom volume pricing that can significantly reduce the per-session cost. Corporate stretch service programs are one of the most effective employee wellness investments available — reducing workplace injuries, lowering healthcare costs, improving productivity, and boosting employee morale and retention.
            </p>
            <p>
              Corporate pricing is customized based on several factors: the number of employees participating, session frequency (weekly, bi-weekly, or monthly), whether sessions are individual or group format, program duration, and on-site logistics. A company booking weekly on-site stretch service sessions for 10-20 employees will receive a per-session rate substantially below the individual $99/hr price. Larger programs with more participants and higher frequency receive deeper discounts.
            </p>
            <p>
              Typical corporate stretch service programs include dedicated therapists who come to your office on a set schedule, providing 15-20 minute individual sessions for employees throughout the day. Some companies opt for longer 30 or 60-minute individual sessions for executives or employees with specific needs. Others book group stretching sessions for team-building events, wellness days, or conference break activities. We customize every corporate program to fit your company&apos;s culture, budget, and wellness goals.
            </p>
            <p>
              To learn more about corporate stretch service pricing or request a custom quote, <Link href="/corporate-wellness" className="text-teal-600 underline hover:text-teal-700">visit our corporate wellness page</Link> or contact us directly at (888) 734-7274. We work with companies of all sizes, from startups with 10 employees to enterprises with thousands. The ROI on corporate stretch service programs — measured in reduced injury claims, lower absenteeism, and improved productivity — consistently exceeds the program cost.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Stretch Service Discounts FAQ</h2>
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
      <section className="py-16 bg-gradient-to-br from-teal-600 to-teal-800">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl font-bold text-white mb-4">
            Ready to Save on Stretch Service?
          </h2>
          <p className="text-teal-100 text-lg mb-8">
            Text or call us to book your first session and ask about discounts. $99/hr standard. $89/hr weekly. Community and referral discounts available.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={SITE_SMS_LINK}
              className="font-cta inline-block bg-white hover:bg-teal-50 text-teal-700 px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
            >
              Text {SITE_PHONE}
            </a>
            <Link
              href="/pricing"
              className="font-cta inline-block border-2 border-white/30 text-white hover:border-white/60 px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
            >
              View Full Pricing
            </Link>
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
            <Link href="/stretching-101" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Stretching 101</Link>
            <Link href="/faq" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">FAQ</Link>
            <Link href="/about" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">About</Link>
            <Link href="/jobs" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Careers</Link>
            <Link href="/contact" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Contact</Link>
          </div>
        </div>
      </section>
    </>
  );
}
