import type { Metadata } from "next";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";

const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  {
    name: "Partnership Agreement",
    url: "https://homeservicesbusinesscrm.com/agreement",
  },
];

export const metadata: Metadata = {
  title: "Partnership Agreement | Full Loop CRM",
  description:
    "Full Loop CRM partnership agreement. Plain-language terms covering pricing, ownership, cancellation, and everything you need to know before partnering with us.",
  keywords:
    "partnership agreement, Full Loop CRM, CRM pricing, website ownership, home service business, cancellation policy",
  alternates: { canonical: "https://homeservicesbusinesscrm.com/agreement" },
  openGraph: {
    title: "Partnership Agreement | Full Loop CRM",
    description:
      "Plain-language partnership agreement covering pricing, ownership, cancellation, and what you get with Full Loop CRM.",
    url: "https://homeservicesbusinesscrm.com/agreement",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Partnership Agreement | Full Loop CRM",
    description:
      "Plain-language partnership agreement covering pricing, ownership, cancellation, and what you get with Full Loop CRM.",
  },
};

export default function AgreementPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Partnership Agreement | Full Loop CRM",
          "Plain-language partnership agreement for Full Loop CRM partners.",
          "https://homeservicesbusinesscrm.com/agreement",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      {/* Hero */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold text-white font-heading mb-4">
            Full Loop CRM Partnership Agreement
          </h1>
          <p className="text-slate-300 text-lg">
            No legalese. No fine print. Just a clear understanding of what we
            provide, what you own, and how this works.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-6 bg-white">
        <div className="mx-auto max-w-3xl prose prose-slate prose-headings:font-heading">
          {/* ── 1. The Service ── */}
          <h2>1. The Service</h2>
          <p>
            Full Loop CRM is an all-in-one platform built for home service
            businesses. We handle your website, SEO, AI booking, CRM, team
            management, and client communications so you can focus on running
            your business.
          </p>
          <p>
            <strong>Setup fee:</strong> $999 one-time.
          </p>
          <p>
            <strong>Monthly subscription:</strong> Flat $1,000 per user / month.
            No tiers, no feature gates, no revenue caps. Every operator on every
            team size gets the complete platform. Add a seat in your Team page
            and the next monthly invoice picks up the additional charge. Remove
            a seat the same way.
          </p>
          <p>
            This is a month-to-month partnership. There is no long-term
            contract. You can cancel anytime with 30 days written notice.
          </p>

          {/* ── 2. What's Included ── */}
          <h2>2. What&apos;s Included</h2>
          <p>
            Every Full Loop CRM partner gets the full platform from day one.
            Here is what that looks like:
          </p>
          <ul>
            <li>
              A custom Next.js website launched on a new domain, designed for
              your brand and optimized for search
            </li>
            <li>
              Full SEO management &mdash; on-page optimization, service area
              pages, and ongoing content
            </li>
            <li>
              Yinez, our AI booking agent, handling SMS and web chat
              conversations in English and Spanish
            </li>
            <li>
              The CRM platform with client management, bookings, calendar,
              finance tracking, campaigns, and referral tools
            </li>
            <li>
              A team portal with GPS check-in/check-out, video walkthroughs, and
              earnings tracking for your crew
            </li>
            <li>
              A client portal where your customers can book services on their
              own
            </li>
            <li>
              Hiring and careers pages with job applications flowing directly
              into your dashboard
            </li>
            <li>Review automation and follow-up sequences</li>
            <li>SMS and email communications</li>
            <li>
              White-glove onboarding &mdash; we set everything up for you
            </li>
            <li>Ongoing platform updates and support</li>
          </ul>

          {/* ── 3. What You Own ── */}
          <h2>3. What You Own</h2>
          <p>
            Your client data is yours. Period. You can export it as a CSV
            anytime you want, no questions asked, no fees, no hoops to jump
            through.
          </p>
          <p>
            If you purchase EMD micro site domains ($500 each), you own those
            domains outright.
          </p>
          <p>
            Any content you provide &mdash; photos, bios, service descriptions
            &mdash; remains your property.
          </p>

          {/* ── 4. What Full Loop Owns ── */}
          <h2>4. What Full Loop Owns</h2>
          <p>We own the tools we build and the technology that powers them:</p>
          <ul>
            <li>The Full Loop CRM platform and software</li>
            <li>
              The website we build for you (unless you purchase it &mdash; see
              below)
            </li>
            <li>The website template and codebase</li>
            <li>The Yinez AI system</li>
          </ul>

          {/* ── 5. Website Ownership Options ── */}
          <h2>5. Website Ownership Options</h2>
          <p>You have three paths when it comes to your website:</p>
          <p>
            <strong>Buy now for $5,000.</strong> You own the site and domain from
            day one. It is yours regardless of whether you stay with Full Loop or
            not.
          </p>
          <p>
            <strong>Don&apos;t buy.</strong> The website is part of your monthly
            service. If you cancel, the site goes dark.
          </p>
          <p>
            <strong>Buy out later.</strong> The buyout price starts at $20,000
            and increases 10% per month. This reflects the SEO equity, content,
            and domain authority we build over time. The longer you wait, the
            more that site is worth.
          </p>
          <p>
            Your monthly subscription stays the same whether you buy the site or
            not. The subscription covers the CRM, Yinez, SEO management, and
            ongoing support.
          </p>

          {/* ── 6. Google Business Profile ── */}
          <h2>6. Google Business Profile</h2>
          <p>
            We can set up and manage a Google Business Profile for your company.
            The setup fee is $999. Important: Google controls the verification
            process, and we cannot guarantee verification will be approved.
          </p>
          <p>
            As part of your monthly service, we manage and optimize your GBP
            with posts, photos, and review responses.
          </p>
          <p>
            If you cancel, the GBP buyout starts at $999 and increases 10% per
            month to reflect the reviews, ranking signals, and optimization work
            we put in. If the GBP was originally created under your own Google
            account, it remains yours regardless.
          </p>

          {/* ── 7. EMD Micro Sites ── */}
          <h2>7. EMD Micro Sites</h2>
          <p>
            Exact-match domain micro sites are $500 each. You own the domain.
            Full Loop hosts the site and manages its SEO as part of your monthly
            service.
          </p>
          <p>
            There is a $99/year maintenance fee per micro site that covers
            hosting and management.
          </p>

          {/* ── 8. Cancellation ── */}
          <h2>8. Cancellation</h2>
          <p>
            If this isn&apos;t working for you, you can walk away. Here is how
            cancellation works:
          </p>
          <ul>
            <li>Give us 30 days written notice</li>
            <li>Your CRM access ends at the end of your billing period</li>
            <li>Yinez stops responding to your leads</li>
            <li>
              Your website goes dark (unless you purchased it)
            </li>
            <li>
              We export your client data and send it to you free of charge
            </li>
            <li>
              Your data is retained on our servers for 90 days, then permanently
              deleted
            </li>
          </ul>
          <p>No cancellation fees. No penalties. No hard feelings.</p>

          {/* ── 9. What We Don't Guarantee ── */}
          <h2>9. What We Don&apos;t Guarantee</h2>
          <p>We are honest about what we can and cannot promise:</p>
          <ul>
            <li>We do not guarantee specific search engine rankings or positions</li>
            <li>We do not guarantee specific revenue or lead volume</li>
            <li>
              We do not guarantee Google Business Profile verification &mdash;
              Google controls that process
            </li>
          </ul>
          <p>
            What we do guarantee is our work, our platform, and our commitment.
            Results depend on your market, your service quality, and factors
            outside our control.
          </p>

          {/* ── 10. Territory ── */}
          <h2>10. Territory</h2>
          <p>
            Full Loop CRM does not offer exclusive territories. We may serve
            other businesses in your market and industry. Your success depends on
            the quality of our platform and the quality of your execution, not on
            blocking competitors from using the same tools.
          </p>

          {/* ── 11. Communication ── */}
          <h2>11. Communication</h2>
          <p>
            We communicate with you via email and in-app notifications. If you
            need support, reach us at{" "}
            <a
              href="mailto:support@homeservicesbusinesscrm.com"
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              support@homeservicesbusinesscrm.com
            </a>
            .
          </p>
          <p>
            If we make changes to the platform that affect your service, we will
            notify you in advance.
          </p>

          {/* ── Closing ── */}
          <hr className="my-12 border-slate-200" />
          <p className="text-slate-500 text-sm">
            This agreement is meant to be read and understood, not buried in a
            drawer. If anything is unclear, ask us. We would rather answer your
            questions now than deal with misunderstandings later.
          </p>
          <p className="text-slate-500 text-sm">
            Last updated: March 24, 2026
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-50 py-16 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 font-heading mb-4">
            Ready to partner with Full Loop?
          </h2>
          <p className="text-slate-600 mb-8">
            If these terms work for you, let&apos;s get started.
          </p>
          <a
            href="/waitlist"
            className="inline-block rounded-lg bg-teal-600 px-8 py-3 text-white font-cta font-semibold hover:bg-teal-700 transition-colors"
          >
            Apply for Partnership
          </a>
        </div>
      </section>
    </>
  );
}
