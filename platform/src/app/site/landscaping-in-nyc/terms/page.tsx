// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, breadcrumbSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";
import { SITE_NAME, SITE_DOMAIN, PHONE, EMAIL, ADDRESS } from "@/app/site/landscaping-in-nyc/_lib/siteData";

export const metadata: Metadata = {
  title: `Terms of Service — ${SITE_NAME}`,
  description: `Terms and conditions governing use of ${SITE_NAME}, including service agreements, payment terms, cancellation policy, warranties, and liability.`,
  alternates: { canonical: `${SITE_DOMAIN}/terms` },
};

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_DOMAIN },
          { name: "Terms of Service", url: `${SITE_DOMAIN}/terms` },
        ])}
      />

      <section className="pt-36 pb-16 sm:pt-44">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-400">Effective Date: March 26, 2026 | Last Updated: March 26, 2026</p>

          <div className="mt-10 space-y-10 text-base leading-relaxed text-slate-600">

            {/* 1. Acceptance of Terms */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">1. Acceptance of Terms</h2>
              <p className="mt-3">
                By accessing or using landscapinginnyc.com (the &quot;Site&quot;), you agree to be bound by these Terms of
                Service (&quot;Terms&quot;). If you do not agree to all of these Terms, you must not access or use the Site.
                These Terms constitute a legally binding agreement between you (&quot;you&quot; or &quot;user&quot;) and
                {SITE_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
              </p>
              <p className="mt-3">
                We reserve the right to update or modify these Terms at any time. Changes become effective immediately upon
                posting. Your continued use of the Site after any modifications constitutes acceptance of the revised Terms.
                We encourage you to review this page periodically.
              </p>
            </div>

            {/* 2. About the Site */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">2. About the Site</h2>
              <p className="mt-3">
                {SITE_NAME} is a professional landscaping company serving New York City and surrounding areas. The Site provides
                information about our services, service areas, cost estimates, educational guides, and tools designed to help
                property owners plan and manage landscaping projects.
              </p>
              <p className="mt-3">
                The Site also facilitates contact between users and our team for estimates, consultations, and project inquiries.
                All landscaping services are subject to separate service agreements executed between you and {SITE_NAME}.
              </p>
            </div>

            {/* 3. Service Agreements */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">3. Service Agreements</h2>
              <p className="mt-3">
                All landscaping services performed by {SITE_NAME} are governed by a separate written service agreement
                (&quot;Service Agreement&quot;) that will be provided to you before any work begins. The Service Agreement will include:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>Detailed scope of work, including materials, plants, and specifications</li>
                <li>Project timeline with estimated start and completion dates</li>
                <li>Total project cost with itemized breakdown</li>
                <li>Payment schedule and accepted payment methods</li>
                <li>Warranty terms for plants and workmanship</li>
                <li>Change order procedures</li>
                <li>Cancellation and termination provisions</li>
              </ul>
              <p className="mt-3">
                No work will commence until both parties have signed the Service Agreement and any required deposits have been
                received. The Service Agreement supersedes any verbal discussions, estimates, or representations made prior to signing.
              </p>
            </div>

            {/* 4. Payment Terms */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">4. Payment Terms</h2>
              <p className="mt-3">
                Payment terms are specified in each Service Agreement. Our standard payment structure is:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li><strong>Deposit:</strong> 30% of the total project cost, due upon signing the Service Agreement</li>
                <li><strong>Progress Payment:</strong> 40% due at project midpoint (as defined in the Service Agreement)</li>
                <li><strong>Final Payment:</strong> 30% due upon project completion and your walkthrough approval</li>
              </ul>
              <p className="mt-3">
                For maintenance contracts, payment is due monthly in advance. We accept all major credit cards, checks, ACH
                transfers, and Zelle. Late payments are subject to a 1.5% monthly interest charge after 15 days past due.
              </p>
              <p className="mt-3">
                Material costs may be subject to adjustment if prices change significantly between the estimate date and
                the purchase date. We will notify you of any material cost changes before proceeding.
              </p>
            </div>

            {/* 5. Cancellation Policy */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">5. Cancellation Policy</h2>
              <p className="mt-3">
                You may cancel a Service Agreement at any time, subject to the following terms:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li><strong>Before work begins:</strong> Full deposit refund minus any non-refundable expenses already incurred (e.g., custom material orders, permit filing fees)</li>
                <li><strong>After work has started:</strong> Payment due for all completed work, materials purchased, and a 15% cancellation fee on the remaining unperformed portion of the contract</li>
                <li><strong>Maintenance contracts:</strong> May be cancelled with 30 days written notice. No cancellation fee applies to maintenance contracts</li>
              </ul>
              <p className="mt-3">
                We reserve the right to cancel or suspend a project if: (a) payment terms are not met, (b) site conditions
                are unsafe or materially different from what was represented, or (c) required permits are denied.
              </p>
            </div>

            {/* 6. Warranties */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">6. Warranties</h2>
              <p className="mt-3">
                {SITE_NAME} provides the following warranties on completed work:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li><strong>Plant Warranty:</strong> 1-year warranty on all plants installed by us. If a plant dies within 12 months of installation under normal care conditions, we will replace it at no charge (one replacement per plant). This warranty requires that you follow our recommended watering and care instructions or maintain an active maintenance contract with us.</li>
                <li><strong>Workmanship Warranty:</strong> 2-year warranty on all hardscaping (patios, walkways, retaining walls, fences) against defects in workmanship. This covers settling, shifting, and structural issues caused by improper installation. Normal wear, weather damage, and freeze-thaw effects are not covered.</li>
                <li><strong>Irrigation Warranty:</strong> 1-year warranty on irrigation system components and installation. Does not cover damage from freezing due to failure to winterize the system.</li>
                <li><strong>Lighting Warranty:</strong> Manufacturer warranty on fixtures (typically 3-5 years). 1-year warranty on installation workmanship.</li>
              </ul>
              <p className="mt-3">
                Warranties are void if the property is modified by other contractors or if damage results from neglect,
                misuse, or failure to maintain the landscape as recommended.
              </p>
            </div>

            {/* 7. Limitation of Liability */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">7. Limitation of Liability</h2>
              <p className="mt-3">
                TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, {SITE_NAME.toUpperCase()}, ITS OWNERS, OFFICERS,
                EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
                OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SITE OR OUR SERVICES, INCLUDING BUT
                NOT LIMITED TO:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>Losses arising from reliance on cost estimator results or informational content</li>
                <li>Damage to underground utilities, structures, or systems not disclosed prior to work</li>
                <li>Plant loss due to acts of nature, extreme weather, pest infestation, or disease beyond our control</li>
                <li>Delays caused by weather, permit processing, material shortages, or other factors beyond our control</li>
                <li>Loss of data, profits, goodwill, or other intangible losses</li>
              </ul>
              <p className="mt-3">
                IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE TOTAL AMOUNT PAID BY YOU UNDER THE
                APPLICABLE SERVICE AGREEMENT, OR ONE THOUSAND DOLLARS ($1,000), WHICHEVER IS GREATER.
              </p>
            </div>

            {/* 8. Disclaimer of Warranties (Website) */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">8. Disclaimer of Warranties (Website)</h2>
              <p className="mt-3">
                THE SITE AND ALL CONTENT, TOOLS, COST ESTIMATORS, AND INFORMATIONAL RESOURCES ARE PROVIDED ON AN &quot;AS IS&quot;
                AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT
                LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR ACCURACY.
              </p>
              <p className="mt-3">
                Cost estimator results are approximations based on typical NYC pricing and the inputs you provide. They
                are not guarantees of actual project costs. Actual pricing requires an on-site assessment and written proposal.
              </p>
            </div>

            {/* 9. User Responsibilities */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">9. User Responsibilities</h2>
              <p className="mt-3">When using the Site, you agree to:</p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>Provide accurate and truthful information in any forms or communications</li>
                <li>Use the Site only for lawful purposes</li>
                <li>Not attempt to gain unauthorized access to any portion of the Site, its servers, or databases</li>
                <li>Not use automated tools (bots, scrapers, crawlers) to extract data from the Site without written permission</li>
                <li>Not interfere with or disrupt the Site&apos;s infrastructure or other users&apos; access</li>
                <li>Comply with all applicable federal, state, and local laws and regulations</li>
              </ul>
            </div>

            {/* 10. Intellectual Property */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">10. Intellectual Property</h2>
              <p className="mt-3">
                All content on the Site — including text, graphics, logos, icons, images, data, software, tools,
                guides, and the overall design and layout — is the property of {SITE_NAME} or its content
                suppliers and is protected by United States and international copyright, trademark, and intellectual
                property laws.
              </p>
              <p className="mt-3">
                You may access, view, and print content from the Site for your personal, non-commercial use. You may not
                reproduce, distribute, modify, create derivative works from, publicly display, or republish
                any content from the Site without our prior written consent.
              </p>
            </div>

            {/* 11. Indemnification */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">11. Indemnification</h2>
              <p className="mt-3">
                You agree to indemnify, defend, and hold harmless {SITE_NAME}, its owners, officers, employees,
                agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and
                expenses (including reasonable attorneys&apos; fees) arising out of or related to: (a) your use of the Site;
                (b) your violation of these Terms; (c) your violation of any third-party rights; or (d) any content you
                submit to the Site.
              </p>
            </div>

            {/* 12. Governing Law */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">12. Governing Law and Dispute Resolution</h2>
              <p className="mt-3">
                These Terms shall be governed by and construed in accordance with the laws of the State of New York, without
                regard to its conflict of law provisions. Any dispute arising out of or relating to these Terms or your use
                of the Site shall be resolved exclusively in the state or federal courts located in New York County, New York,
                and you consent to the personal jurisdiction of such courts.
              </p>
              <p className="mt-3">
                Before initiating any legal proceeding, you agree to first attempt to resolve the dispute informally by
                contacting us at{" "}
                <a href={`mailto:${EMAIL}`} className="text-green-600 underline hover:text-green-700">
                  {EMAIL}
                </a>
                . We will attempt to resolve the dispute within 30 days of receiving your notice.
              </p>
            </div>

            {/* 13. Termination */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">13. Termination</h2>
              <p className="mt-3">
                We reserve the right to suspend or terminate your access to the Site at any time, for any reason, without
                notice. Upon termination, your right to use the Site ceases immediately. Sections 7, 8, 10, 11, and 12
                of these Terms shall survive any termination.
              </p>
            </div>

            {/* 14. Severability */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">14. Severability</h2>
              <p className="mt-3">
                If any provision of these Terms is found to be unlawful, void, or unenforceable, that provision shall be
                deemed severable and shall not affect the validity and enforceability of the remaining provisions.
              </p>
            </div>

            {/* 15. Entire Agreement */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">15. Entire Agreement</h2>
              <p className="mt-3">
                These Terms, together with our{" "}
                <Link href="/privacy-policy" className="text-green-600 underline hover:text-green-700">
                  Privacy Policy
                </Link>
                , constitute the entire agreement between you and {SITE_NAME} regarding your use of the Site
                and supersede all prior or contemporaneous agreements, communications, and proposals, whether oral or
                written. Separate Service Agreements govern the provision of landscaping services.
              </p>
            </div>

            {/* 16. Contact Us */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">16. Contact Us</h2>
              <p className="mt-3">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-2">
                <p><strong>{SITE_NAME}</strong></p>
                <p>{ADDRESS}</p>
                <p>
                  Email:{" "}
                  <a href={`mailto:${EMAIL}`} className="text-green-600 underline hover:text-green-700">
                    {EMAIL}
                  </a>
                </p>
                <p>Phone: {PHONE}</p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
