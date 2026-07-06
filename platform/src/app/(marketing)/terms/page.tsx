import type { Metadata } from "next";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";

const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  { name: "Terms of Service", url: "https://homeservicesbusinesscrm.com/terms" },
];

export const metadata: Metadata = {
  title: "Terms of Service | Full Loop CRM",
  description:
    "Full Loop CRM terms of service. Read the terms governing use of the Full Loop CRM platform and partnership agreements.",
  keywords: "terms of service, service agreement, Full Loop CRM, user agreement, legal terms",
  alternates: { canonical: "https://homeservicesbusinesscrm.com/terms" },
  openGraph: {
    title: "Terms of Service | Full Loop CRM",
    description: "Terms governing use of the Full Loop CRM platform and partnership agreements.",
    url: "https://homeservicesbusinesscrm.com/terms",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service | Full Loop CRM",
    description: "Terms governing use of the Full Loop CRM platform and partnership agreements.",
  },
};

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Terms of Service | Full Loop CRM",
          "Terms governing use of the Full Loop CRM platform.",
          "https://homeservicesbusinesscrm.com/terms",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold text-white font-heading mb-4">
            Terms of Service
          </h1>
          <p className="text-slate-300">
            Last updated: July 6, 2026
          </p>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="mx-auto max-w-3xl prose prose-slate prose-headings:font-heading">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Full Loop CRM platform (&quot;Service&quot;),
            you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you
            do not agree, do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Full Loop CRM provides a full-cycle customer relationship
            management platform for home service businesses, including lead
            generation, AI-powered sales automation, scheduling, GPS field
            operations, invoicing, review management, and retargeting.
          </p>

          <h2>3. Partnership Agreement</h2>
          <p>
            Full Loop CRM operates on an exclusive territory model. Each
            partner receives exclusive rights to one trade within one
            geographic city. Partnership terms include:
          </p>
          <ul>
            <li>Monthly fee of $2,500 per admin + $250 per team member, billed monthly (no tiers)</li>
            <li>One-time setup &amp; onboarding fee of $25,000</li>
            <li>Month-to-month from day one &mdash; no minimum commitment, no lock-in</li>
            <li>Cancel anytime; you keep everything we built for you, website included</li>
            <li>30-day written notice required for cancellation</li>
          </ul>

          <h2>4. Ownership &amp; Intellectual Property</h2>
          <h3>You Own:</h3>
          <ul>
            <li>Your full SEO website, its code, and its domain</li>
            <li>Every microsite we build for you ($500 each)</li>
            <li>Google Business Profiles created for you</li>
            <li>Your Telnyx phone account and number</li>
            <li>Your Resend email account</li>
            <li>Your business name and LLC</li>
            <li>Your customer data (exportable anytime)</li>
          </ul>
          <p>
            Everything we build for you is yours from day one, at no extra
            charge. If you cancel, all of it stays with you.
          </p>
          <h3>Full Loop Owns:</h3>
          <ul>
            <li>The CRM software platform and the Yinez AI engine</li>
            <li>The shared platform infrastructure</li>
            <li>The reusable code library and templates our tools are built from</li>
          </ul>

          <h2>5. Website Ownership</h2>
          <p>
            Your website is yours &mdash; free, from day one. There is no buyout
            and no ownership schedule. While you are a partner, Full Loop builds,
            hosts, optimizes, and manages the site. If you cancel, the site, its
            code, and its domain transfer to you at no charge.
          </p>

          <h2>6. Cancellation &amp; Data Export</h2>
          <p>Upon cancellation, you retain:</p>
          <ul>
            <li>Your full SEO website, its code, and its domain</li>
            <li>All microsites we built for you</li>
            <li>Your Google Business Profile</li>
            <li>Your phone number (Telnyx account)</li>
            <li>Your email account (Resend account)</li>
            <li>Your business name and LLC</li>
            <li>Exported customer list and job history (CSV format)</li>
          </ul>
          <p>
            Your territory will be released and made available to the next
            partner in your industry.
          </p>

          <h2>7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to access other partners&apos; data or accounts</li>
            <li>Reverse engineer, decompile, or disassemble the platform</li>
            <li>Resell or sublicense access to the Service</li>
            <li>Interfere with the proper operation of the platform</li>
          </ul>

          <h2>8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Full Loop CRM shall not
            be liable for any indirect, incidental, special, consequential,
            or punitive damages arising from your use of the Service. Our
            total liability shall not exceed the amount you paid us in the
            12 months preceding the claim.
          </p>

          <h2>9. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Full Loop CRM, its
            officers, directors, and employees from any claims, damages, or
            expenses arising from your use of the Service or violation of
            these Terms.
          </p>

          <h2>10. Modifications</h2>
          <p>
            We reserve the right to modify these Terms at any time. Material
            changes will be communicated via email or platform notification
            at least 30 days before taking effect.
          </p>

          <h2>11. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of New York.
            Any disputes shall be resolved in the courts of New York County,
            New York.
          </p>

          <h2>12. Contact</h2>
          <p>
            Questions about these Terms? Contact us at:
          </p>
          <ul>
            <li>Email: <a href="mailto:hi@fullloopcrm.com">hi@fullloopcrm.com</a></li>
            <li>Phone: <a href="tel:+18445667276">1-844-LOOP-CRM</a> <a href="tel:+18445667276">(844) 566-7276</a></li>
            <li>Address: 150 W 47th St, New York, NY 10036</li>
          </ul>
        </div>
      </section>
    </>
  );
}
