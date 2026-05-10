// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/consortium-nyc/_lib/schema";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for The NYC Marketing Company. Read our terms governing the use of our website and digital marketing services. Call (212) 202-9220 with questions.",
  alternates: { canonical: "https://www.consortiumnyc.com/terms" },
  robots: { index: true, follow: true },
};

const UPDATED = "March 7, 2026";

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Terms of Service",
          "Terms of Service for The NYC Marketing Company. Terms governing use of our website and digital marketing services.",
          "https://www.consortiumnyc.com/terms"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.consortiumnyc.com" },
          { name: "Terms of Service", url: "https://www.consortiumnyc.com/terms" },
        ])}
      />

      <article className="pt-32 pb-20 sm:pt-40 sm:pb-28 px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-teal-600 text-sm font-semibold tracking-[0.15em] uppercase mb-3 font-cta">Legal</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight font-heading">Terms of Service</h1>
          <p className="mt-3 text-sm text-slate-400">Last updated: {UPDATED}</p>

          <div className="mt-12 prose-legal">
            <Section title="1. Agreement to Terms">
              <p>
                By accessing or using the website at <strong>consortiumnyc.com</strong> (the &quot;Site&quot;) or engaging any services provided by The NYC Marketing Company (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use the Site or our services.
              </p>
            </Section>

            <Section title="2. Services">
              <p>
                The NYC Marketing Company is a marketing company providing services including but not limited to search engine optimization (SEO), web design and development, branding, digital strategy, business development, marketing automation, and AI chatbot solutions (collectively, &quot;Services&quot;).
              </p>
              <p>
                Specific service terms, deliverables, timelines, and pricing are outlined in individual service agreements or proposals provided to clients. In the event of a conflict between these Terms and a signed service agreement, the service agreement shall prevail.
              </p>
            </Section>

            <Section title="3. Use of the Site">
              <p>You agree to use the Site only for lawful purposes and in accordance with these Terms. You agree not to:</p>
              <ul>
                <li>Use the Site in any way that violates applicable federal, state, or local law</li>
                <li>Attempt to gain unauthorized access to any portion of the Site or its systems</li>
                <li>Use automated systems (bots, scrapers, crawlers) to access the Site without our written permission</li>
                <li>Introduce viruses, malware, or other harmful material</li>
                <li>Impersonate any person or entity or misrepresent your affiliation</li>
                <li>Interfere with or disrupt the Site or its servers</li>
              </ul>
            </Section>

            <Section title="4. Intellectual Property">
              <p>
                All content on the Site — including text, graphics, logos, images, code, design, and the overall look and feel — is owned by The NYC Marketing Company or its licensors and is protected by copyright, trademark, and other intellectual property laws.
              </p>
              <p>
                You may not reproduce, distribute, modify, create derivative works of, publicly display, or otherwise use any Site content without our prior written consent.
              </p>
              <h3>Client Work Product</h3>
              <p>
                Unless otherwise specified in a service agreement: upon full payment, clients receive ownership of custom deliverables created specifically for them (e.g., website code, brand assets, copy). We retain the right to showcase work in our portfolio and case studies unless a client requests otherwise in writing.
              </p>
            </Section>

            <Section title="5. Client Responsibilities">
              <p>When engaging our Services, clients agree to:</p>
              <ul>
                <li>Provide accurate, complete, and timely information necessary for service delivery</li>
                <li>Grant necessary access to platforms, accounts, and systems as required</li>
                <li>Review and approve deliverables within agreed-upon timelines</li>
                <li>Ensure that all materials provided to us (text, images, logos) do not infringe third-party rights</li>
                <li>Make payments according to the terms of the service agreement</li>
              </ul>
            </Section>

            <Section title="6. Payment Terms">
              <p>
                Payment terms are specified in individual service agreements or proposals. Unless otherwise agreed:
              </p>
              <ul>
                <li>Invoices are due within 15 days of receipt</li>
                <li>Late payments may incur a fee of 1.5% per month on the outstanding balance</li>
                <li>We reserve the right to suspend services for accounts past due by more than 30 days</li>
                <li>All fees are non-refundable unless explicitly stated in the service agreement</li>
              </ul>
            </Section>

            <Section title="7. No Guarantees on Results">
              <p>
                While we employ industry best practices and data-driven strategies, we do not guarantee specific results including but not limited to search engine rankings, website traffic, lead volume, or revenue increases. Digital marketing results are influenced by factors beyond our control, including search engine algorithm changes, market conditions, competition, and client implementation of recommendations.
              </p>
              <p>
                Any projections, estimates, or case study results shared are based on past performance and are not guarantees of future results.
              </p>
            </Section>

            <Section title="8. Cancellation and Termination">
              <p>
                <strong>No long-term contracts.</strong> Unless otherwise specified in a service agreement, either party may terminate the engagement with 30 days&apos; written notice. Upon termination:
              </p>
              <ul>
                <li>Client is responsible for payment of all services rendered through the termination date</li>
                <li>We will provide all completed deliverables and work product</li>
                <li>We will transfer access to all client-owned accounts and assets</li>
                <li>Confidentiality obligations survive termination</li>
              </ul>
            </Section>

            <Section title="9. Confidentiality">
              <p>
                Both parties agree to keep confidential any proprietary information received during the engagement, including business strategies, customer data, financial information, and trade secrets. This obligation survives termination of the relationship for a period of 2 years.
              </p>
            </Section>

            <Section title="10. Limitation of Liability">
              <p>
                To the maximum extent permitted by law, The NYC Marketing Company shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of revenue, profits, data, or business opportunities, arising from or related to your use of the Site or our Services.
              </p>
              <p>
                Our total liability for any claim arising from these Terms or our Services shall not exceed the total fees paid by you to us in the 12 months preceding the claim.
              </p>
            </Section>

            <Section title="11. Indemnification">
              <p>
                You agree to indemnify, defend, and hold harmless The NYC Marketing Company, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including attorneys&apos; fees) arising from your use of the Site, violation of these Terms, or infringement of any third-party rights.
              </p>
            </Section>

            <Section title="12. Disclaimers">
              <p>
                The Site and its content are provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
              </p>
              <p>
                We do not warrant that the Site will be uninterrupted, error-free, or free of viruses or other harmful components.
              </p>
            </Section>

            <Section title="13. Third-Party Links and Services">
              <p>
                The Site may contain links to third-party websites and services. We are not responsible for the content, privacy policies, or practices of third-party sites. Your use of third-party services is at your own risk.
              </p>
            </Section>

            <Section title="14. Governing Law and Disputes">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the state or federal courts located in New York County, New York.
              </p>
            </Section>

            <Section title="15. Changes to These Terms">
              <p>
                We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated &quot;Last updated&quot; date. Continued use of the Site after changes constitutes acceptance of the revised Terms.
              </p>
            </Section>

            <Section title="16. Severability">
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
              </p>
            </Section>

            <Section title="17. Contact Us">
              <p>If you have questions about these Terms, contact us:</p>
              <ul>
                <li><strong>Email:</strong> <a href="mailto:hello@consortiumnyc.com">hello@consortiumnyc.com</a></li>
                <li><strong>Phone:</strong> <a href="tel:+12122029220">(212) 202-9220</a></li>
                <li><strong>Address:</strong> The NYC Marketing Company, New York, NY 10001</li>
              </ul>
            </Section>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <Link href="/privacy-policy" className="hover:text-teal-600 transition-colors">&larr; Privacy Policy</Link>
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
