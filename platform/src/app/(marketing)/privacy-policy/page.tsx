import type { Metadata } from "next";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";

const breadcrumbs = [
  { name: "Home", url: "https://www.fullloopcrm.com" },
  { name: "Privacy Policy", url: "https://www.fullloopcrm.com/privacy-policy" },
];

export const metadata: Metadata = {
  title: "Privacy Policy | Full Loop CRM",
  description:
    "Full Loop CRM privacy policy. Learn how we collect, use, and protect your data.",
  alternates: { canonical: "https://www.fullloopcrm.com/privacy-policy" },
  openGraph: {
    title: "Privacy Policy | Full Loop CRM",
    description: "Learn how Full Loop CRM collects, uses, and protects your data.",
    url: "https://www.fullloopcrm.com/privacy-policy",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | Full Loop CRM",
    description: "Learn how Full Loop CRM collects, uses, and protects your data.",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Privacy Policy | Full Loop CRM",
          "Full Loop CRM privacy policy.",
          "https://www.fullloopcrm.com/privacy-policy",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold text-white font-heading mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-300">
            Last updated: March 9, 2026
          </p>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="mx-auto max-w-3xl prose prose-slate prose-headings:font-heading">
          <h2>1. Information We Collect</h2>
          <p>
            Full Loop CRM (&quot;we,&quot; &quot;our,&quot; or &quot;the Company&quot;) collects information
            you provide directly when you:
          </p>
          <ul>
            <li>Submit a partnership application or contact form</li>
            <li>Create an account or sign in to the platform</li>
            <li>Use our CRM dashboard, client portal, or team portal</li>
            <li>Communicate with us via phone, text, or email</li>
            <li>Submit anonymous feedback</li>
          </ul>
          <p>
            This may include your name, email address, phone number, business
            name, service area, and payment information.
          </p>

          <h2>2. Automatically Collected Information</h2>
          <p>
            When you visit our website, we may automatically collect:
          </p>
          <ul>
            <li>IP address and approximate geographic location</li>
            <li>Browser type, device type, and operating system</li>
            <li>Pages visited, time spent, and referral source</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use collected information to:</p>
          <ul>
            <li>Provide and improve the Full Loop CRM platform</li>
            <li>Process partnership applications and manage accounts</li>
            <li>Send appointment reminders, invoices, and service communications</li>
            <li>Respond to inquiries and provide customer support</li>
            <li>Analyze website traffic and platform usage</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>4. Data Sharing</h2>
          <p>
            We do not sell your personal information. We may share data with:
          </p>
          <ul>
            <li><strong>Service providers:</strong> Supabase (database), Clerk (authentication), Stripe (payments), Telnyx (SMS), Resend (email)</li>
            <li><strong>Legal requirements:</strong> When required by law, subpoena, or court order</li>
            <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
          </ul>

          <h2>5. Data Security</h2>
          <p>
            We implement industry-standard security measures including HTTPS
            encryption, secure authentication, and database-level access
            controls. However, no method of transmission over the Internet is
            100% secure.
          </p>

          <h2>6. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as
            needed to provide services. Upon cancellation, we export your
            customer list and job history in CSV format. You may request
            deletion of your personal data at any time.
          </p>

          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt out of marketing communications</li>
            <li>Export your data in a portable format</li>
          </ul>

          <h2>8. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management.
            We may use analytics cookies to understand site usage. You can
            control cookie preferences through your browser settings.
          </p>

          <h2>9. Children&apos;s Privacy</h2>
          <p>
            Full Loop CRM is not directed at individuals under 18. We do not
            knowingly collect personal information from children.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. Changes will
            be posted on this page with an updated &quot;Last updated&quot; date.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            If you have questions about this privacy policy or your data,
            contact us at:
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
