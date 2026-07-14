import type { Metadata } from "next";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";

const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  { name: "Privacy", url: "https://homeservicesbusinesscrm.com/privacy" },
];

export const metadata: Metadata = {
  title: "Privacy | Full Loop CRM",
  description:
    "How Full Loop CRM handles data: what we collect, the sub-processors we use, how long we retain data, and your rights under GDPR and CCPA.",
  keywords:
    "privacy policy, GDPR, CCPA, data subject rights, sub-processors, data retention, Full Loop CRM",
  alternates: { canonical: "https://homeservicesbusinesscrm.com/privacy" },
  openGraph: {
    title: "Privacy | Full Loop CRM",
    description:
      "What we collect, who processes it, how long we keep it, and your rights under GDPR and CCPA.",
    url: "https://homeservicesbusinesscrm.com/privacy",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy | Full Loop CRM",
    description:
      "What we collect, who processes it, how long we keep it, and your rights under GDPR and CCPA.",
  },
};

const subProcessors = [
  { name: "Supabase", purpose: "Primary database and file storage" },
  { name: "Clerk", purpose: "Authentication and session management" },
  { name: "Stripe", purpose: "Payment processing and platform billing" },
  { name: "Telnyx", purpose: "SMS and voice communications" },
  { name: "Resend", purpose: "Transactional and marketing email delivery" },
  { name: "Anthropic", purpose: "AI-assisted features (e.g. Selena assistant, categorization)" },
  { name: "Vercel", purpose: "Application hosting, edge network, and analytics" },
];

const retention = [
  {
    category: "Account & billing data",
    period:
      "Retained for the life of the account, plus the period required for tax and accounting records after cancellation.",
  },
  {
    category: "Customer data you enter (bookings, invoices, communications, notes)",
    period:
      "Retained for the life of the tenant account. On cancellation, exportable via CSV/ZIP; deleted or anonymized on request, subject to legal retention holds (e.g. financial records).",
  },
  {
    category: "Communications logs (SMS, email, chat)",
    period: "Retained for the life of the account for support and dispute-resolution purposes.",
  },
  {
    category: "Website analytics (IP, device, page views)",
    period: "Retained for a limited rolling window for security and performance monitoring.",
  },
  {
    category: "Audit and security logs",
    period: "Retained separately from operational data to preserve an accurate compliance trail.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Privacy | Full Loop CRM",
          "How Full Loop CRM handles data: what we collect, our sub-processors, retention, and your rights.",
          "https://homeservicesbusinesscrm.com/privacy",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold text-white font-heading mb-4">Privacy</h1>
          <p className="text-slate-300">Last updated: July 14, 2026</p>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="mx-auto max-w-3xl prose prose-slate prose-headings:font-heading">
          <p>
            Full Loop CRM (&quot;we,&quot; &quot;our,&quot; or &quot;the Company&quot;) provides a
            CRM platform to home-service businesses (&quot;tenants&quot;). This page explains what
            data we collect, who we share it with, how long we keep it, and the rights available to
            tenants and their customers under the GDPR and CCPA. It supplements our{" "}
            <a href="/privacy-policy">Privacy Policy</a> and{" "}
            <a href="/terms">Terms of Service</a>.
          </p>

          <h2>Data We Handle</h2>
          <p>We process two broad categories of personal data:</p>
          <ul>
            <li>
              <strong>Tenant account data</strong> — the business owner and their team: name,
              email, phone, business details, and payment information used to operate their Full
              Loop CRM account.
            </li>
            <li>
              <strong>End-customer data entered by a tenant</strong> — the tenant&apos;s own
              clients&apos; bookings, invoices, communications (SMS/email/chat), and service notes.
              We process this data as a data processor on the tenant&apos;s behalf; the tenant is
              the data controller for their own customers&apos; information.
            </li>
          </ul>

          <h2>Sub-processors</h2>
          <p>
            We use the following third-party services to operate the platform. Each receives only
            the data necessary to perform its function:
          </p>
          <table>
            <thead>
              <tr>
                <th>Sub-processor</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {subProcessors.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{p.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>We do not sell personal information to third parties.</p>

          <h2>Data Retention</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Retention</th>
              </tr>
            </thead>
            <tbody>
              {retention.map((r) => (
                <tr key={r.category}>
                  <td>{r.category}</td>
                  <td>{r.period}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Your Rights</h2>
          <p>
            If you are located in the European Economic Area or the UK, you have rights under the
            GDPR, including the right to:
          </p>
          <ul>
            <li>Access the personal data we (or a tenant, as controller) hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request erasure of your data</li>
            <li>Request a portable, machine-readable copy of your data</li>
            <li>Restrict or object to certain processing</li>
            <li>Lodge a complaint with your local data protection authority</li>
          </ul>
          <p>If you are a California resident, you have rights under the CCPA, including the right to:</p>
          <ul>
            <li>Know what personal information is collected, used, and shared</li>
            <li>Request deletion of your personal information</li>
            <li>Correct inaccurate personal information</li>
            <li>Opt out of the sale or sharing of personal information (we do not sell data)</li>
            <li>Not be discriminated against for exercising these rights</li>
          </ul>
          <p>
            Tenant business owners can generate a full export of a customer&apos;s data — bookings,
            invoices, communications, and notes, in JSON or CSV — directly from their Full Loop CRM
            dashboard to fulfill an access or portability request. End customers who want to submit
            a request should contact the business they booked with directly; that business is the
            data controller for their information. For requests about your own Full Loop CRM tenant
            account, or if you cannot reach a tenant, contact us using the details below.
          </p>

          <h2>Contact</h2>
          <ul>
            <li>
              Email: <a href="mailto:hi@fullloopcrm.com">hi@fullloopcrm.com</a>
            </li>
            <li>
              Phone: <a href="tel:+18445667276">1-844-LOOP-CRM</a>{" "}
              <a href="tel:+18445667276">(844) 566-7276</a>
            </li>
            <li>Address: 150 W 47th St, New York, NY 10036</li>
          </ul>
        </div>
      </section>
    </>
  );
}
