import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  articleSchema,
} from "@/lib/schema";

const BASE = "https://www.fullloopcrm.com";
const PAGE_URL = `${BASE}/case-study/the-nyc-maid`;

const breadcrumbs = [
  { name: "Home", url: BASE },
  { name: "Case Studies", url: `${BASE}/case-study` },
  { name: "The NYC Maid", url: PAGE_URL },
];

export const metadata: Metadata = {
  title:
    "The NYC Maid Case Study | 298 Clients in 7 Weeks | Full Loop CRM",
  description:
    "How The NYC Maid went from zero to 298 clients, 1,169 bookings, and $18,574 in revenue in just 7 weeks using Full Loop CRM. Real numbers, real business, no ad spend.",
  keywords: [
    "Full Loop CRM case study",
    "home service CRM results",
    "cleaning business CRM",
    "The NYC Maid",
    "CRM for cleaning companies",
    "organic lead generation results",
    "AI receptionist case study",
    "service business growth",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "The NYC Maid Case Study | 298 Clients in 7 Weeks",
    description:
      "Real numbers from our first partner. 298 clients, 1,169 bookings, $18,574 revenue, zero ad spend. Here's exactly how it happened.",
    url: PAGE_URL,
    type: "article",
    publishedTime: "2026-03-25T00:00:00Z",
  },
  twitter: {
    card: "summary_large_image",
    title: "The NYC Maid Case Study | 298 Clients in 7 Weeks",
    description:
      "Real numbers from our first partner. 298 clients, 1,169 bookings, $18,574 revenue, zero ad spend.",
  },
};

const stats = [
  { value: "298", label: "Clients" },
  { value: "1,169", label: "Bookings" },
  { value: "$18,574", label: "Revenue" },
  { value: "9", label: "Team Members" },
  { value: "64", label: "AI Conversations" },
  { value: "2,590", label: "Pages Indexed" },
  { value: "148K", label: "Google Impressions" },
  { value: "4.9", label: "Stars (45 Reviews)" },
  { value: "80+", label: "EMD Domains" },
];

const forecast = [
  { month: "Feb 2026", bookings: "36", revenue: "~$4,500", projected: false },
  { month: "Mar 2026", bookings: "80+", revenue: "~$10,000", projected: false },
  { month: "Apr 2026", bookings: "120+", revenue: "~$15,000", projected: true },
  { month: "Jun 2026", bookings: "200+", revenue: "~$25,000", projected: true },
  { month: "Dec 2026", bookings: "400+", revenue: "~$50,000", projected: true },
];

export default function TheNYCMaidCaseStudy() {
  return (
    <>
      {/* Schema Markup */}
      <JsonLd
        data={webPageSchema(
          "The NYC Maid Case Study | Full Loop CRM",
          "How The NYC Maid went from zero to 298 clients, 1,169 bookings, and $18,574 in revenue in 7 weeks using Full Loop CRM.",
          PAGE_URL,
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={articleSchema(
          "The NYC Maid Case Study: 298 Clients in 7 Weeks with Full Loop CRM",
          "How The NYC Maid went from zero to 298 clients, 1,169 bookings, and $18,574 in revenue in just 7 weeks. Real numbers, real business, zero ad spend.",
          PAGE_URL,
          "2026-03-25T00:00:00Z",
          "2026-03-25T00:00:00Z"
        )}
      />

      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="bg-slate-900 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-teal-400 font-mono text-sm tracking-widest uppercase mb-4">
            Partner Case Study
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white font-heading leading-tight mb-6">
            Our First Partner.
            <br />
            Real Numbers. No BS.
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            The NYC Maid launched on Full Loop CRM in February 2026.
            Here&apos;s what happened in 7 weeks.
          </p>
          <p className="text-slate-500 text-sm font-mono">
            Last updated March 25, 2026
          </p>
        </div>
      </section>

      {/* ───────────────────── THE NUMBERS ────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-4 text-center">
            The Numbers
          </h2>
          <p className="text-slate-500 text-center mb-12 text-lg">
            7 weeks. One platform. Zero ad spend.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="border border-slate-200 rounded-xl p-6 text-center hover:border-teal-300 transition-colors"
              >
                <p className="text-3xl md:text-4xl font-extrabold text-teal-600 font-heading">
                  {stat.value}
                </p>
                <p className="text-slate-600 mt-2 text-sm font-medium uppercase tracking-wide">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── GROWTH TRAJECTORY ───────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-8">
            Growth Trajectory
          </h2>
          <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
            <div className="border-l-4 border-teal-500 pl-6">
              <p className="font-bold text-slate-900">
                February (Month 1):
              </p>
              <p>36 bookings. Getting the foundation set. Building the SEO pipeline.</p>
            </div>
            <div className="border-l-4 border-teal-500 pl-6">
              <p className="font-bold text-slate-900">
                March (Month 2):
              </p>
              <p>
                80+ bookings and climbing. More than double month one.
              </p>
            </div>
            <div className="border-l-4 border-teal-500 pl-6">
              <p className="font-bold text-slate-900">
                April (Month 3, projected):
              </p>
              <p>
                Heading toward 120+ bookings/month.
              </p>
            </div>
            <p>
              Revenue trajectory: $18K in 7 weeks. On pace for $8&ndash;10K/month
              recurring.
            </p>
            <blockquote className="bg-slate-900 text-white rounded-xl p-6 text-xl font-heading">
              &ldquo;Month 2 more than doubled month 1. That&apos;s what
              compounding SEO looks like.&rdquo;
            </blockquote>
          </div>
        </div>
      </section>

      {/* ─────────────────── REVENUE FORECAST ────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-8 text-center">
            Revenue Forecast
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-3 pr-4 text-sm font-bold text-slate-500 uppercase tracking-wide">
                    Month
                  </th>
                  <th className="py-3 pr-4 text-sm font-bold text-slate-500 uppercase tracking-wide">
                    Bookings
                  </th>
                  <th className="py-3 text-sm font-bold text-slate-500 uppercase tracking-wide">
                    Revenue (est)
                  </th>
                </tr>
              </thead>
              <tbody>
                {forecast.map((row) => (
                  <tr
                    key={row.month}
                    className="border-b border-slate-100"
                  >
                    <td className="py-4 pr-4 font-medium text-slate-900">
                      {row.month}
                      {row.projected && (
                        <span className="ml-2 text-xs text-teal-600 font-mono">
                          projected
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-slate-700 font-bold">
                      {row.bookings}
                    </td>
                    <td className="py-4 text-teal-600 font-bold">
                      {row.revenue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ──────────────────── SEO RESULTS ─────────────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-8">
            SEO Results
          </h2>
          <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  <strong>2,590 pages indexed</strong> by Google in weeks, not
                  months.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  <strong>148,000 impressions</strong> in 16 months &mdash;
                  hockey stick growth after Next.js site launch.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  <strong>696 clicks</strong> from organic search.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  <strong>80+ exact match domains</strong> ranking across Google.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  Multiple <strong>page 1 positions</strong> for competitive NYC
                  cleaning keywords.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  <strong>3 domains on page 1</strong> for single searches
                  &mdash; for example, search &ldquo;hell&apos;s kitchen maid
                  service&rdquo; and you&apos;ll find us occupying multiple
                  organic positions.
                </span>
              </li>
            </ul>
            <blockquote className="bg-slate-900 text-white rounded-xl p-6 text-xl font-heading">
              &ldquo;No ad spend. Zero. Every single lead is organic.&rdquo;
            </blockquote>
          </div>
        </div>
      </section>

      {/* ──────────────────── SELENA AI ────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-8">
            Selena AI
          </h2>
          <p className="text-slate-500 text-lg mb-8">
            Your 24/7 AI receptionist. Built into the platform.
          </p>
          <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  <strong>64 conversations</strong> handled by AI &mdash; no
                  human intervention needed.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  Books appointments <strong>end-to-end</strong> via SMS and web
                  chat.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  <strong>Bilingual EN/ES</strong> &mdash; handles
                  Spanish-speaking clients automatically.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  Recognizes <strong>returning clients</strong> by phone number.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  Escalates complex issues to the owner with a{" "}
                  <strong>full transcript</strong>.
                </span>
              </li>
            </ul>
            <blockquote className="bg-slate-900 text-white rounded-xl p-6 text-xl font-heading">
              &ldquo;Selena responded to a lead at 11pm on a Sunday. That lead
              booked a $260 cleaning.&rdquo;
            </blockquote>
          </div>
        </div>
      </section>

      {/* ────────────────── TEAM OPERATIONS ───────────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-8">
            Team Operations
          </h2>
          <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  <strong>9 team members</strong> using the mobile portal daily.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  <strong>GPS-verified</strong> check-in/check-out on every job.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  <strong>Before/after video walkthroughs</strong> on every job.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  <strong>15-minute payment heads up</strong> via SMS before the
                  crew finishes.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  <strong>Bilingual team portal</strong> (EN/ES).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-500 font-bold mt-1">&#9654;</span>
                <span>
                  <strong>Earnings tracking</strong> &mdash; weekly, monthly,
                  yearly.
                </span>
              </li>
            </ul>
            <blockquote className="bg-slate-900 text-white rounded-xl p-6 text-xl font-heading">
              &ldquo;No app download. No training manual. They opened a link
              and started using it.&rdquo;
            </blockquote>
          </div>
        </div>
      </section>

      {/* ──────────────── WHAT THIS MEANS FOR YOU ─────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-8">
            What This Means For You
          </h2>
          <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
            <p>
              The NYC Maid is not a tech company. It&apos;s a cleaning business
              run by a guy who&apos;s been in home services for 25 years.
            </p>
            <p>
              Everything you see here &mdash; the website, the AI, the CRM, the
              team portal &mdash; is the exact same platform you get when you
              sign up.
            </p>
            <p className="text-slate-900 font-bold text-xl">
              We didn&apos;t build a demo. We built our own business on it. If
              it&apos;s good enough for us, it&apos;s good enough for you.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────────────── CTA ────────────────────────── */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white font-heading mb-4">
            Ready to Be Our Next Case Study?
          </h2>
          <p className="text-slate-300 text-lg mb-10">
            Same platform. Same tools. Your business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link
              href="/crm-partnership-request-form"
              className="inline-block bg-teal-500 hover:bg-teal-400 text-white font-cta font-bold px-8 py-4 rounded-lg text-lg transition-colors"
            >
              Request Partnership
            </Link>
            <Link
              href="/full-loop-crm-pricing"
              className="inline-block border-2 border-slate-500 hover:border-slate-300 text-slate-300 hover:text-white font-cta font-bold px-8 py-4 rounded-lg text-lg transition-colors"
            >
              View Pricing
            </Link>
          </div>
          <p className="text-slate-400 text-sm">
            Or call/text us directly:{" "}
            <a
              href="tel:+12122029220"
              className="text-teal-400 hover:text-teal-300 font-bold"
            >
              212-202-9220
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
