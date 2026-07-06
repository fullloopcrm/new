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
            <strong>Setup fee:</strong> $25,000 one-time (setup &amp; onboarding).
          </p>
          <p>
            <strong>Monthly subscription:</strong> $2,500 per admin / month + $250 per team member / month.
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
            <strong>You own everything we build for you</strong> &mdash;
            including your website, its code, and its domain. Yours from day one,
            at no extra charge. No buyout, no clawback, no holding your site
            hostage.
          </p>
          <p>
            Your client data is yours. Period. You can export it as a CSV anytime
            you want, no questions asked, no fees, no hoops to jump through.
          </p>
          <p>
            You also own any EMD micro site domains ($500 each), your Google
            Business Profile, and any content you provide &mdash; photos, bios,
            service descriptions.
          </p>

          {/* ── 4. What Full Loop Owns ── */}
          <h2>4. What Full Loop Owns</h2>
          <p>
            We own the software product you subscribe to &mdash; not the assets
            we build for you:
          </p>
          <ul>
            <li>The Full Loop CRM platform and software</li>
            <li>The Yinez AI engine and its underlying models</li>
            <li>
              The shared platform infrastructure and the reusable code library
              our tools are built from
            </li>
          </ul>

          {/* ── 5. Website Ownership ── */}
          <h2>5. Website Ownership</h2>
          <p>
            <strong>Your website is yours &mdash; free, from day one.</strong> No
            buy-in, no buyout, no ownership tiers. While you&apos;re a partner we
            build, host, optimize, and manage the site for you. If you cancel, the
            site, its code, and its domain transfer to you &mdash; they go dark on
            our infrastructure only until you move them.
          </p>
          <p>
            Your monthly subscription covers the CRM, Yinez, SEO management,
            hosting, and ongoing support &mdash; not the ownership of the site.
            You already own that.
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
            The Google Business Profile is yours. If you cancel, it stays with you
            &mdash; there is no buyout. You keep the profile, its reviews, and its
            ranking signals.
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
              Your website, its code, and domain transfer to you &mdash; you keep it
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
            Full Loop CRM is licensed to one operator per trade per city. While
            you are a partner, we will not sign another business in your trade in
            your market &mdash; the territory is yours and off the board to
            competitors. If you cancel, the territory is released and made
            available to the next operator in your trade.
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
            Last updated: July 6, 2026
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
