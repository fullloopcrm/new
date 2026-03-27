import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";

const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  { name: "About", url: "https://homeservicesbusinesscrm.com/about-full-loop-crm" },
];

export const metadata: Metadata = {
  title: "About Full Loop CRM | Built by Home Service Operators",
  description:
    "Full Loop CRM was built by a home service business owner with 20+ years in the field. One platform that handles the full cycle — leads to rebooking. Web design by Consortium NYC, SEO by The NYC SEO.",
  keywords: [
    "about full loop CRM",
    "home service CRM founder",
    "CRM built by operators",
    "home service business technology",
    "full cycle CRM",
  ],
  alternates: { canonical: "https://homeservicesbusinesscrm.com/about-full-loop-crm" },
  openGraph: {
    title: "About Full Loop CRM | Built by Home Service Operators",
    description:
      "Full Loop CRM was built by a home service business owner with 20+ years in the field. One platform, full cycle.",
    url: "https://homeservicesbusinesscrm.com/about-full-loop-crm",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Full Loop CRM | Built by Home Service Operators",
    description:
      "Full Loop CRM was built by a home service business owner with 20+ years in the field. One platform, full cycle.",
  },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "About Full Loop CRM | Built by Home Service Operators",
          "Full Loop CRM was built by a home service business owner with 20+ years in the field. One platform that handles the full cycle — leads to rebooking.",
          "https://homeservicesbusinesscrm.com/about-full-loop-crm",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      {/* Hero */}
      <section className="bg-slate-900 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-teal-400 font-mono text-sm tracking-widest uppercase mb-4">
            Our Story
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white font-heading leading-tight mb-6">
            Built From Inside the Business.
            <br />
            Not a Boardroom.
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto">
            Full Loop CRM exists because the person who built it spent two
            decades running home service companies and never found a CRM that
            actually worked.
          </p>
        </div>
      </section>

      {/* Founder Story */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-8">
            20+ Years in the Field
          </h2>
          <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
            <p>
              Full Loop CRM was not designed by consultants, venture capitalists,
              or software engineers who read a whitepaper about "field service
              management." It was built by someone who spent over twenty years
              working in, managing, and owning multiple home service companies.
            </p>
            <p>
              Cleaning companies. Maintenance crews. Pest control operations.
              Moving teams. The founder lived every pain point that service
              business owners face: missed calls, lost leads, no-show crews,
              unpaid invoices, and zero reviews to show for good work.
            </p>
            <p>
              Over those two decades, every CRM on the market was tested. Jobber
              handled scheduling but ignored lead generation. HouseCall Pro
              managed dispatching but had no SEO strategy. GoHighLevel focused on
              funnels but couldn&apos;t track a crew in the field. ServiceTitan
              required a six-figure commitment and a team of admins.
            </p>
            <p>
              Every single platform covered one piece of the puzzle.
              Scheduling <em>or</em> invoicing <em>or</em> leads — always
              separately. None of them handled the full cycle from the moment a
              customer searches Google to the moment they rebook six months
              later.
            </p>
          </div>
        </div>
      </section>

      {/* The Gap */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-8">
            The CRM That Should Have Existed
          </h2>
          <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
            <p>
              The idea was simple: build the CRM that every home service owner
              has always wanted. Not a scheduling tool with a CRM label. Not a
              marketing funnel with a calendar bolted on. A single system that
              handles the entire customer lifecycle from first click to repeat
              booking.
            </p>
            <p>
              One platform that generates leads organically through multi-domain
              SEO. Converts those leads with an AI assistant named Selenas who
              answers calls, texts, and chats 24/7. Books the job automatically.
              Tracks the crew with GPS. Collects payment on-site. Earns the
              five-star review. Then retargets that customer for rebooking when
              the next service window opens.
            </p>
            <p>
              That is what "full loop" means. Not a partial solution. Not a
              stack of integrations. One closed loop where every stage feeds the
              next.
            </p>
          </div>
        </div>
      </section>

      {/* Vision — 7 stages */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-10 text-center">
            The Seven Stages of the Full Loop
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                num: "01",
                title: "Organic Lead Generation",
                desc: "Multi-domain SEO microsites rank for every service + city combination in your territory.",
              },
              {
                num: "02",
                title: "AI-Powered Sales",
                desc: "Selenas answers calls, texts, and web chats — qualifying leads and booking jobs autonomously.",
              },
              {
                num: "03",
                title: "Smart Scheduling",
                desc: "Route-optimized scheduling that accounts for crew availability, travel time, and job type.",
              },
              {
                num: "04",
                title: "GPS Field Operations",
                desc: "Real-time crew tracking, clock-in verification, and automated customer arrival alerts.",
              },
              {
                num: "05",
                title: "Payment Collection",
                desc: "On-site card processing, automatic invoicing, and payment reminders with zero manual follow-up.",
              },
              {
                num: "06",
                title: "Review Automation",
                desc: "Timed review requests sent after every completed job — building your Google reputation automatically.",
              },
              {
                num: "07",
                title: "Retargeting & Rebooking",
                desc: "Automated follow-ups based on service intervals so customers rebook before they think to call a competitor.",
              },
            ].map((stage) => (
              <div
                key={stage.num}
                className="border border-slate-200 rounded-xl p-6 hover:border-teal-300 transition-colors"
              >
                <span className="text-teal-600 font-mono text-sm font-bold">
                  Stage {stage.num}
                </span>
                <h3 className="text-xl font-bold text-slate-900 font-heading mt-1 mb-2">
                  {stage.title}
                </h3>
                <p className="text-slate-600">{stage.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built By */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-8">
            Built by Operators, Not Investors
          </h2>
          <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
            <p>
              Full Loop CRM is engineered and maintained by{" "}
              <a
                href="https://consortiumnyc.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
              >
                Consortium NYC
              </a>
              , a New York-based web design and digital marketing studio
              specializing in high-performance applications for service
              businesses. All SEO strategy and organic lead generation is powered
              by{" "}
              <a
                href="https://thenycseo.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
              >
                The NYC SEO
              </a>
              . The same team that builds the CRM also operates home service
              companies — giving Full Loop a feedback loop that no competitor can
              replicate.
            </p>
            <p>
              Every feature ships because it solves a real operational problem,
              not because a product manager read a trend report. The roadmap is
              driven by operators, not investors.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-6">
            Our Mission
          </h2>
          <p className="text-slate-700 text-xl leading-relaxed max-w-2xl mx-auto">
            Empower home service businesses to compete with big franchises using
            better technology — not bigger budgets. One owner-operator with Full
            Loop CRM should be able to outperform a franchise location with ten
            times the marketing spend.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            Ready to Close the Loop?
          </h2>
          <p className="text-slate-300 text-lg mb-10">
            See what Full Loop CRM can do for your service business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/crm-partnership-request-form"
              className="inline-block bg-teal-500 hover:bg-teal-400 text-white font-cta font-bold px-8 py-4 rounded-lg text-lg transition-colors"
            >
              Request Partnership
            </Link>
            <Link
              href="/full-loop-crm-service-features"
              className="inline-block border-2 border-slate-500 hover:border-slate-300 text-slate-300 hover:text-white font-cta font-bold px-8 py-4 rounded-lg text-lg transition-colors"
            >
              Explore Features
            </Link>
            <Link
              href="/full-loop-crm-pricing"
              className="inline-block border-2 border-slate-500 hover:border-slate-300 text-slate-300 hover:text-white font-cta font-bold px-8 py-4 rounded-lg text-lg transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
