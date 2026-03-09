import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";

const breadcrumbs = [
  { name: "Home", url: "https://fullloopcrm.com" },
  { name: "Partners", url: "https://fullloopcrm.com/partner-with-full-loop-crm" },
];

export const metadata: Metadata = {
  title: "Partner With Full Loop CRM | Exclusive Territory CRM Partnership",
  description:
    "One partner per trade per metro. Get exclusive territory, AI-powered CRM, Selenas SMS automation, SEO microsites, and GMB optimization. Apply to see if your market is available.",
  keywords: [
    "CRM partnership program",
    "home service CRM partner",
    "exclusive territory CRM",
    "CRM franchise alternative",
    "home service lead generation partner",
  ],
  alternates: { canonical: "https://fullloopcrm.com/partner-with-full-loop-crm" },
  openGraph: {
    title: "Partner With Full Loop CRM | Exclusive Territory CRM Partnership",
    description:
      "One partner per trade per metro. Apply to see if your market is still available.",
    url: "https://fullloopcrm.com/partner-with-full-loop-crm",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Partner With Full Loop CRM | Exclusive Territory CRM Partnership",
    description:
      "One partner per trade per metro. Apply to see if your market is still available.",
  },
};

export default function PartnersPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Partner With Full Loop CRM | Exclusive Territory CRM Partnership",
          "One partner per trade per metro. Get exclusive territory, AI-powered CRM, Selenas SMS automation, SEO microsites, and GMB optimization.",
          "https://fullloopcrm.com/partner-with-full-loop-crm",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      {/* Hero */}
      <section className="bg-slate-900 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-teal-400 font-mono text-sm tracking-widest uppercase mb-4">
            Partnership Program
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white font-heading leading-tight mb-6">
            One Partner Per Trade Per Metro.
            <br />
            Is Your Market Still Available?
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Full Loop CRM grants exclusive territory rights to one service
            provider per trade per metropolitan area. Once a territory is
            claimed, it is permanently off the market for that trade.
          </p>
          <Link
            href="/crm-partnership-request-form"
            className="inline-block bg-teal-500 hover:bg-teal-400 text-white font-cta font-bold px-8 py-4 rounded-lg text-lg transition-colors"
          >
            Check Territory Availability
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-12 text-center">
            How the Partnership Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Apply",
                desc: "Submit your partnership request with your trade, service area, and business details.",
              },
              {
                step: "02",
                title: "Territory Check",
                desc: "We verify your metro area is available for your specific trade. One partner per trade per metro — no exceptions.",
              },
              {
                step: "03",
                title: "Onboarding",
                desc: "CRM setup takes one day. Selenas AI SMS configuration takes one to two weeks. You are live within days.",
              },
              {
                step: "04",
                title: "Growth Begins",
                desc: "SEO microsites build in the background. Organic leads start flowing within 30 to 60 days as domains age and index.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-600 font-mono font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-heading mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-10 text-center">
            What You Get as a Partner
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Full Loop CRM Platform",
                desc: "Complete seven-stage CRM with scheduling, dispatch, invoicing, payments, GPS tracking, and customer management.",
              },
              {
                title: "Selenas AI Assistant",
                desc: "AI-powered SMS, phone, and web chat agent that qualifies leads, books jobs, and follows up — 24/7, no staff required.",
              },
              {
                title: "Google Business Profile Optimization",
                desc: "Full GMB setup, category optimization, review strategy, and local pack ranking support for your service area.",
              },
              {
                title: "Multi-Domain SEO Strategy",
                desc: "A network of microsites targeting every service + city keyword combination in your territory, driving organic leads to your CRM.",
              },
              {
                title: "Exclusive Territory Rights",
                desc: "Your metro area is locked for your trade. No other provider in your trade will be onboarded in your territory. Period.",
              },
              {
                title: "Microsite Network",
                desc: "Purpose-built SEO sites for each service line — each with its own domain, content, and local optimization — all funneling leads into your CRM.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white border border-slate-200 rounded-xl p-6"
              >
                <h3 className="text-xl font-bold text-slate-900 font-heading mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Look For */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-8 text-center">
            What We Look For in a Partner
          </h2>
          <div className="space-y-6">
            {[
              {
                title: "Committed Business Owners",
                desc: "You are actively running a home service company — not looking to flip a territory. This is for operators who want to grow a real business.",
              },
              {
                title: "Organic Growth Mindset",
                desc: "You understand that SEO takes 30 to 90 days to gain traction. You are not looking for overnight results from paid ads. You want compounding organic traffic that you own.",
              },
              {
                title: "Quality Service Providers",
                desc: "Your reputation matters. We only partner with businesses that deliver consistently high-quality work. The platform earns reviews automatically — but only if the service earns them.",
              },
            ].map((item) => (
              <div key={item.title} className="border-l-4 border-teal-500 pl-6">
                <h3 className="text-xl font-bold text-slate-900 font-heading mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600 text-lg">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ownership Transparency */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-10 text-center">
            Ownership Transparency
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* You Own */}
            <div className="bg-white border-2 border-teal-500 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-teal-600 font-heading mb-6">
                You Own
              </h3>
              <ul className="space-y-3">
                {[
                  "Your customer data and contact lists",
                  "Your Google Business Profile",
                  "Your reviews and reputation",
                  "Your brand name and identity",
                  "Your phone number and business lines",
                  "Your revenue and customer relationships",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-teal-500 font-bold mt-0.5">
                      &#10003;
                    </span>
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Full Loop Owns */}
            <div className="bg-white border border-slate-200 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-slate-900 font-heading mb-6">
                Full Loop Owns
              </h3>
              <ul className="space-y-3">
                {[
                  "The CRM software platform and code",
                  "Selenas AI engine and training data",
                  "SEO microsite domains and content",
                  "The proprietary lead routing system",
                  "Platform infrastructure and hosting",
                  "Analytics dashboards and reporting tools",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-slate-400 font-bold mt-0.5">
                      &#8226;
                    </span>
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-center text-slate-500 mt-8 text-sm">
            If you ever leave Full Loop CRM, you take your customers, your
            reviews, your GMB, and your brand with you. We keep the software.
          </p>
        </div>
      </section>

      {/* Availability */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-6">
            Current Availability
          </h2>
          <div className="flex flex-col sm:flex-row gap-8 justify-center mb-8">
            <div>
              <p className="text-5xl font-extrabold text-teal-600 font-heading">
                300+
              </p>
              <p className="text-slate-600 mt-1">US Metros Available</p>
            </div>
            <div>
              <p className="text-5xl font-extrabold text-teal-600 font-heading">
                50+
              </p>
              <p className="text-slate-600 mt-1">Industries Supported</p>
            </div>
          </div>
          <p className="text-slate-700 text-lg max-w-xl mx-auto">
            Territories are claimed on a first-come, first-served basis. Once
            your trade is taken in a metro, it does not reopen. Check
            availability before your competitor does.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            Lock In Your Territory Today
          </h2>
          <p className="text-slate-300 text-lg mb-10">
            Submit a partnership request or reach out directly. We respond
            within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/crm-partnership-request-form"
              className="inline-block bg-teal-500 hover:bg-teal-400 text-white font-cta font-bold px-8 py-4 rounded-lg text-lg transition-colors"
            >
              Request Partnership
            </Link>
            <a
              href="tel:+12122029220"
              className="inline-block border-2 border-slate-500 hover:border-slate-300 text-slate-300 hover:text-white font-cta font-bold px-8 py-4 rounded-lg text-lg transition-colors"
            >
              Call (212) 202-9220
            </a>
          </div>
          <p className="text-slate-400 text-sm mt-6">
            Or text us at{" "}
            <a
              href="sms:+12122029220"
              className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200"
            >
              (212) 202-9220
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
