// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, breadcrumbSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";
import { SITE_NAME, SITE_DOMAIN, PHONE, EMAIL, ADDRESS } from "@/app/site/the-nyc-interior-designer/_lib/siteData";

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
          <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-400">Effective Date: April 2, 2026 | Last Updated: April 2, 2026</p>

          <div className="mt-10 space-y-10 text-base leading-relaxed text-slate-600">

            {/* 1. Acceptance of Terms */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
              <p className="mt-3">
                By accessing or using thenycinteriordesigner.com (the &quot;Site&quot;), you agree to be bound by these Terms of
                Service (&quot;Terms&quot;). If you do not agree to all of these Terms, you must not access or use the Site.
                These Terms constitute a legally binding agreement between you (&quot;you&quot; or &quot;user&quot;) and{" "}
                {SITE_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
              </p>
              <p className="mt-3">
                We reserve the right to update or modify these Terms at any time. Changes become effective immediately upon
                posting. Your continued use of the Site after any modifications constitutes acceptance of the revised Terms.
              </p>
            </div>

            {/* 2. About the Site */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">2. About the Site</h2>
              <p className="mt-3">
                {SITE_NAME} is a professional interior design company serving New York City and surrounding areas including
                Long Island, Westchester, and New Jersey. The Site provides information about our services, service areas,
                cost estimates, educational guides, and tools designed to help property owners plan and manage interior design
                projects.
              </p>
              <p className="mt-3">
                The Site also facilitates contact between users and our team for consultations, proposals, and project inquiries.
                All interior design services are subject to separate service agreements executed between you and {SITE_NAME}.
              </p>
            </div>

            {/* 3. Service Agreements */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">3. Service Agreements</h2>
              <p className="mt-3">
                All interior design services performed by {SITE_NAME} are governed by a separate written service agreement
                (&quot;Service Agreement&quot;) that will be provided to you before any work begins. The Service Agreement will include:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>Detailed scope of design work, including deliverables and milestones</li>
                <li>Project timeline with estimated start and completion dates</li>
                <li>Design fees and payment schedule</li>
                <li>Material and furniture procurement terms</li>
                <li>Revision policy and change order procedures</li>
                <li>Cancellation and termination provisions</li>
                <li>Intellectual property and design ownership terms</li>
              </ul>
              <p className="mt-3">
                No work will commence until both parties have signed the Service Agreement and any required deposits have been
                received. The Service Agreement supersedes any verbal discussions, estimates, or representations made prior to signing.
              </p>
            </div>

            {/* 4. Payment Terms */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">4. Payment Terms</h2>
              <p className="mt-3">
                Payment terms are specified in each Service Agreement. Our standard payment structure is:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li><strong>Design Deposit:</strong> 50% of design fees, due upon signing the Service Agreement</li>
                <li><strong>Design Balance:</strong> 50% due upon presentation of final design concept</li>
                <li><strong>Procurement:</strong> Full payment required before ordering furniture and materials</li>
                <li><strong>Installation:</strong> Balance due upon project completion and final styling</li>
              </ul>
              <p className="mt-3">
                For renovation projects, payment follows the contractor&apos;s schedule (typically 30/40/30). We accept all major
                credit cards, checks, ACH transfers, and wire transfers. Late payments are subject to a 1.5% monthly interest
                charge after 15 days past due.
              </p>
            </div>

            {/* 5. Cancellation Policy */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">5. Cancellation Policy</h2>
              <p className="mt-3">
                You may cancel a Service Agreement at any time, subject to the following terms:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li><strong>Before design work begins:</strong> Full deposit refund minus any non-refundable expenses already incurred</li>
                <li><strong>After design work has started:</strong> Payment due for all completed design hours and work product delivered</li>
                <li><strong>After procurement begins:</strong> Payment due for all ordered items (orders cannot be cancelled once placed with vendors)</li>
                <li><strong>Design retainer agreements:</strong> May be cancelled with 30 days written notice</li>
              </ul>
              <p className="mt-3">
                We reserve the right to cancel or suspend a project if: (a) payment terms are not met, (b) access to the
                property is unreasonably restricted, or (c) the client&apos;s requests are outside the agreed scope without
                corresponding change orders.
              </p>
            </div>

            {/* 6. Warranties */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">6. Warranties</h2>
              <p className="mt-3">
                {SITE_NAME} provides the following warranties on completed work:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li><strong>Design Work:</strong> We warrant that our design work will be performed with professional skill and care consistent with industry standards.</li>
                <li><strong>Procurement:</strong> All furniture and materials carry their respective manufacturer warranties. We do not provide additional warranties on third-party products beyond what the manufacturer offers.</li>
                <li><strong>Installation:</strong> 1-year warranty on installation workmanship. This covers defects in how items are installed, not normal wear and tear.</li>
                <li><strong>Custom Millwork:</strong> 2-year warranty on custom cabinetry and built-in woodwork against defects in materials and craftsmanship.</li>
              </ul>
              <p className="mt-3">
                Warranties are void if items are modified by other parties, damaged through misuse, or affected by conditions
                outside our control (water damage, fire, structural movement).
              </p>
            </div>

            {/* 7. Limitation of Liability */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">7. Limitation of Liability</h2>
              <p className="mt-3">
                TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, {SITE_NAME.toUpperCase()}, ITS OWNERS, OFFICERS,
                EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
                OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SITE OR OUR SERVICES, INCLUDING BUT
                NOT LIMITED TO:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>Losses arising from reliance on cost estimator results or informational content</li>
                <li>Damage to property not caused by our direct negligence</li>
                <li>Delays caused by building management, co-op boards, permit processing, vendor lead times, or other factors beyond our control</li>
                <li>Variations between design renderings and completed installations due to material availability or site conditions</li>
                <li>Loss of data, profits, goodwill, or other intangible losses</li>
              </ul>
              <p className="mt-3">
                IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE TOTAL AMOUNT PAID BY YOU UNDER THE
                APPLICABLE SERVICE AGREEMENT, OR ONE THOUSAND DOLLARS ($1,000), WHICHEVER IS GREATER.
              </p>
            </div>

            {/* 8. Disclaimer of Warranties (Website) */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">8. Disclaimer of Warranties (Website)</h2>
              <p className="mt-3">
                THE SITE AND ALL CONTENT, TOOLS, COST ESTIMATORS, AND INFORMATIONAL RESOURCES ARE PROVIDED ON AN &quot;AS IS&quot;
                AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED.
              </p>
              <p className="mt-3">
                Cost estimator results are approximations based on typical NYC pricing and the inputs you provide. They
                are not guarantees of actual project costs. Actual pricing requires an in-person consultation and written proposal.
              </p>
            </div>

            {/* 9. User Responsibilities */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">9. User Responsibilities</h2>
              <p className="mt-3">When using the Site, you agree to:</p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>Provide accurate and truthful information in any forms or communications</li>
                <li>Use the Site only for lawful purposes</li>
                <li>Not attempt to gain unauthorized access to any portion of the Site</li>
                <li>Not use automated tools to extract data from the Site without written permission</li>
                <li>Not interfere with or disrupt the Site&apos;s infrastructure</li>
                <li>Comply with all applicable federal, state, and local laws and regulations</li>
              </ul>
            </div>

            {/* 10. Intellectual Property */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">10. Intellectual Property</h2>
              <p className="mt-3">
                All content on the Site — including text, graphics, logos, icons, images, data, software, tools,
                guides, and the overall design and layout — is the property of {SITE_NAME} or its content
                suppliers and is protected by United States and international copyright, trademark, and intellectual
                property laws.
              </p>
              <p className="mt-3">
                Design concepts, renderings, floor plans, and specifications created for your project remain the intellectual
                property of {SITE_NAME} until the project is fully paid. Upon full payment, you receive a license to use
                the design for its intended purpose.
              </p>
            </div>

            {/* 11. Indemnification */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">11. Indemnification</h2>
              <p className="mt-3">
                You agree to indemnify, defend, and hold harmless {SITE_NAME}, its owners, officers, employees,
                agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and
                expenses arising out of or related to: (a) your use of the Site; (b) your violation of these Terms;
                (c) your violation of any third-party rights; or (d) any content you submit to the Site.
              </p>
            </div>

            {/* 12. Governing Law */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">12. Governing Law and Dispute Resolution</h2>
              <p className="mt-3">
                These Terms shall be governed by and construed in accordance with the laws of the State of New York, without
                regard to its conflict of law provisions. Any dispute arising out of or relating to these Terms shall be resolved
                exclusively in the state or federal courts located in New York County, New York.
              </p>
              <p className="mt-3">
                Before initiating any legal proceeding, you agree to first attempt to resolve the dispute informally by
                contacting us at{" "}
                <a href={`mailto:${EMAIL}`} className="text-blue-600 underline hover:text-blue-700">
                  {EMAIL}
                </a>
                . We will attempt to resolve the dispute within 30 days.
              </p>
            </div>

            {/* 13. Termination */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">13. Termination</h2>
              <p className="mt-3">
                We reserve the right to suspend or terminate your access to the Site at any time, for any reason, without
                notice. Upon termination, your right to use the Site ceases immediately. Sections 7, 8, 10, 11, and 12
                shall survive any termination.
              </p>
            </div>

            {/* 14. Severability */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">14. Severability</h2>
              <p className="mt-3">
                If any provision of these Terms is found to be unlawful, void, or unenforceable, that provision shall be
                deemed severable and shall not affect the validity and enforceability of the remaining provisions.
              </p>
            </div>

            {/* 15. Entire Agreement */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">15. Entire Agreement</h2>
              <p className="mt-3">
                These Terms, together with our{" "}
                <Link href="/privacy-policy" className="text-blue-600 underline hover:text-blue-700">
                  Privacy Policy
                </Link>
                , constitute the entire agreement between you and {SITE_NAME} regarding your use of the Site
                and supersede all prior or contemporaneous agreements. Separate Service Agreements govern the provision of
                interior design services.
              </p>
            </div>

            {/* 16. Contact Us */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">16. Contact Us</h2>
              <p className="mt-3">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-2">
                <p><strong>{SITE_NAME}</strong></p>
                <p>{ADDRESS}</p>
                <p>
                  Email:{" "}
                  <a href={`mailto:${EMAIL}`} className="text-blue-600 underline hover:text-blue-700">
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
