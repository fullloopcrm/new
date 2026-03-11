import type { Metadata } from "next";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";

const breadcrumbs = [
  { name: "Home", url: "https://www.fullloopcrm.com" },
  { name: "Terms of Service", url: "https://www.fullloopcrm.com/terms" },
];

export const metadata: Metadata = {
  title: "Terms of Service | Full Loop CRM",
  description:
    "Full Loop CRM terms of service. Read the terms governing use of the Full Loop CRM platform and partnership agreements.",
  alternates: { canonical: "https://www.fullloopcrm.com/terms" },
  openGraph: {
    title: "Terms of Service | Full Loop CRM",
    description: "Terms governing use of the Full Loop CRM platform and partnership agreements.",
    url: "https://www.fullloopcrm.com/terms",
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
          "https://www.fullloopcrm.com/terms",
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
            Last updated: March 9, 2026
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
            geographic metro area. Partnership terms include:
          </p>
          <ul>
            <li>Monthly fee of $2,500, billed monthly</li>
            <li>90-day minimum commitment</li>
            <li>Month-to-month after the initial 90 days</li>
            <li>30-day written notice required for cancellation</li>
          </ul>

          <h2>4. Ownership &amp; Intellectual Property</h2>
          <h3>You Own:</h3>
          <ul>
            <li>Your Telnyx phone account and number</li>
            <li>Your Resend email account</li>
            <li>Your business name and LLC</li>
            <li>Any microsites you purchase ($500 each)</li>
            <li>Your customer data (exportable upon request)</li>
          </ul>
          <h3>Full Loop Owns:</h3>
          <ul>
            <li>The CRM platform and Selenas AI engine</li>
            <li>The full SEO site and domain (unless buyout is completed)</li>
            <li>Google Business Profiles created by Full Loop</li>
            <li>All website code, templates, and SEO architecture</li>
          </ul>

          <h2>5. SEO Site Buyout</h2>
          <p>
            Partners may purchase their full SEO site and domain at the
            following schedule: Year 1 — $25,000; Year 2 — $35,000; Year 3 —
            $45,000; Year 4 — $55,000; Year 5+ — $65,000. The increasing
            price reflects the compounding SEO value of aged domains,
            backlink profiles, and organic rankings.
          </p>

          <h2>6. Cancellation &amp; Data Export</h2>
          <p>Upon cancellation, you retain:</p>
          <ul>
            <li>Your phone number (Telnyx account)</li>
            <li>Your email account (Resend account)</li>
            <li>Your business name and LLC</li>
            <li>Any microsites purchased</li>
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
            <li>Email: <a href="mailto:hello@fullloopcrm.com">hello@fullloopcrm.com</a></li>
            <li>Phone: <a href="tel:+12122029220">(212) 202-9220</a></li>
            <li>Address: 150 W 47th St, New York, NY 10036</li>
          </ul>
        </div>
      </section>
    </>
  );
}
