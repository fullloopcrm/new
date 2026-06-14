// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import { BrandLink } from "@/app/site/the-nyc-marketing-company/_lib/brand";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Consortium NYC (Now The NYC Marketing Company). Learn how we collect, use, and protect your personal information. Call (212) 202-9220 with questions.",
  alternates: { canonical: "https://www.thenycmarketingcompany.com/privacy-policy" },
  robots: { index: true, follow: true },
};

const UPDATED = "March 7, 2026";

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Privacy Policy",
          "Privacy Policy for Consortium NYC (Now The NYC Marketing Company). How we collect, use, and protect your personal information.",
          "https://www.thenycmarketingcompany.com/privacy-policy"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.thenycmarketingcompany.com" },
          { name: "Privacy Policy", url: "https://www.thenycmarketingcompany.com/privacy-policy" },
        ])}
      />

      <article className="pt-32 pb-20 sm:pt-40 sm:pb-28 px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-teal-600 text-sm font-semibold tracking-[0.15em] uppercase mb-3 font-cta">Legal</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight font-heading">Privacy Policy</h1>
          <p className="mt-3 text-sm text-slate-400">Last updated: {UPDATED}</p>

          <div className="mt-12 prose-legal">
            <Section title="1. Introduction">
              <p>
                <BrandLink /> (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at <strong>thenycmarketingcompany.com</strong> (the &quot;Site&quot;) or engage our services.
              </p>
              <p>
                By accessing or using the Site, you agree to this Privacy Policy. If you do not agree, please do not use the Site.
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <h3>Personal Information You Provide</h3>
              <p>We may collect information you voluntarily provide, including:</p>
              <ul>
                <li>Name, email address, phone number, and company name</li>
                <li>Project details, budget information, and business goals</li>
                <li>Files and documents uploaded through our RFP form</li>
                <li>Any other information you choose to share via forms, email, phone, or SMS</li>
              </ul>

              <h3>Information Collected Automatically</h3>
              <p>When you visit the Site, we may automatically collect:</p>
              <ul>
                <li>IP address, browser type, operating system, and device information</li>
                <li>Pages visited, time spent on pages, and referring URLs</li>
                <li>Cookies and similar tracking technologies (see Section 6)</li>
              </ul>

              <h3>Information from Third Parties</h3>
              <p>
                We may receive information from analytics providers (such as Google Analytics), advertising platforms, and publicly available sources to improve our services and marketing.
              </p>
            </Section>

            <Section title="3. How We Use Your Information">
              <p>We use collected information to:</p>
              <ul>
                <li>Respond to your inquiries and provide requested services</li>
                <li>Send project proposals, invoices, and service-related communications</li>
                <li>Improve our website, services, and user experience</li>
                <li>Analyze website traffic and usage patterns</li>
                <li>Send marketing communications (with your consent)</li>
                <li>Comply with legal obligations</li>
                <li>Protect against fraud and unauthorized access</li>
              </ul>
            </Section>

            <Section title="4. How We Share Your Information">
              <p>We do not sell your personal information. We may share it with:</p>
              <ul>
                <li><strong>Service providers:</strong> Hosting (Vercel), email (Resend), analytics (Google Analytics), CRM (Supabase), and communication platforms (Telnyx) that help us operate the Site and deliver services</li>
                <li><strong>Professional advisors:</strong> Attorneys, accountants, and consultants as needed</li>
                <li><strong>Legal authorities:</strong> When required by law, court order, or governmental request</li>
                <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </Section>

            <Section title="5. Data Retention">
              <p>
                We retain your personal information only as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law. Contact form submissions are retained for up to 3 years. You may request deletion at any time.
              </p>
            </Section>

            <Section title="6. Cookies and Tracking Technologies">
              <p>We use cookies and similar technologies to:</p>
              <ul>
                <li>Remember your preferences and settings</li>
                <li>Analyze site traffic and performance</li>
                <li>Understand how visitors interact with our content</li>
              </ul>
              <p>
                You can control cookies through your browser settings. Disabling cookies may affect Site functionality.
              </p>
            </Section>

            <Section title="7. Your Rights">
              <p>Depending on your location, you may have the right to:</p>
              <ul>
                <li>Access, correct, or delete your personal information</li>
                <li>Opt out of marketing communications</li>
                <li>Request a copy of your data in a portable format</li>
                <li>Withdraw consent where processing is based on consent</li>
                <li>Lodge a complaint with a supervisory authority</li>
              </ul>
              <p>
                <strong>California Residents:</strong> Under the California Consumer Privacy Act (CCPA), you have additional rights including the right to know what personal information we collect and the right to request deletion. We do not sell personal information.
              </p>
              <p>
                <strong>New York Residents:</strong> We comply with all applicable New York State privacy regulations, including the NY SHIELD Act requirements for data security.
              </p>
            </Section>

            <Section title="8. Data Security">
              <p>
                We implement industry-standard security measures to protect your personal information, including encryption in transit (TLS/SSL), secure hosting infrastructure, and access controls. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </Section>

            <Section title="9. Third-Party Links">
              <p>
                The Site may contain links to third-party websites. We are not responsible for the privacy practices of those sites. We encourage you to review their privacy policies before providing personal information.
              </p>
            </Section>

            <Section title="10. Children&apos;s Privacy">
              <p>
                The Site is not directed to individuals under 16 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will delete it promptly.
              </p>
            </Section>

            <Section title="11. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top reflects the most recent revision. Continued use of the Site after changes constitutes acceptance of the updated policy.
              </p>
            </Section>

            <Section title="12. Contact Us">
              <p>If you have questions about this Privacy Policy or wish to exercise your rights, contact us:</p>
              <ul>
                <li><strong>Email:</strong> <a href="mailto:hello@thenycmarketingcompany.com">hello@thenycmarketingcompany.com</a></li>
                <li><strong>Phone:</strong> <a href="tel:+12122029220">(212) 202-9220</a></li>
                <li><strong>Address:</strong> <BrandLink />, New York, NY 10001</li>
              </ul>
            </Section>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <Link href="/terms" className="hover:text-teal-600 transition-colors">Terms of Service &rarr;</Link>
            <Link href="/accessibility" className="hover:text-teal-600 transition-colors">Accessibility Statement &rarr;</Link>
          </div>
        </div>
      </article>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-slate-900 mb-4 font-heading">{title}</h2>
      <div className="text-slate-600 leading-relaxed space-y-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-800 [&_h3]:mt-5 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-teal-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-teal-700">
        {children}
      </div>
    </section>
  );
}