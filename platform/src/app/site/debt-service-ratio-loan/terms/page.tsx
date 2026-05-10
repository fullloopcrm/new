// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, breadcrumbSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";

export const metadata: Metadata = {
  title: "Terms of Service — DebtServiceRatioLoan.com",
  description: "Terms and conditions governing use of DebtServiceRatioLoan.com, including disclaimers, licensing, and user responsibilities.",
  alternates: { canonical: "https://www.debtserviceratioloan.com/terms" },
};

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.debtserviceratioloan.com" },
          { name: "Terms of Service", url: "https://www.debtserviceratioloan.com/terms" },
        ])}
      />

      <section className="pt-36 pb-16 sm:pt-44">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-400">Effective Date: March 25, 2026 | Last Updated: March 25, 2026</p>

          <div className="mt-10 space-y-10 text-base leading-relaxed text-slate-600">

            {/* ── 1. Acceptance of Terms ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">1. Acceptance of Terms</h2>
              <p className="mt-3">
                By accessing or using DebtServiceRatioLoan.com (the &quot;Site&quot;), you agree to be bound by these Terms of
                Service (&quot;Terms&quot;). If you do not agree to all of these Terms, you must not access or use the Site.
                These Terms constitute a legally binding agreement between you (&quot;you&quot; or &quot;user&quot;) and
                DebtServiceRatioLoan.com (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
              </p>
              <p className="mt-3">
                We reserve the right to update or modify these Terms at any time. Changes become effective immediately upon
                posting. Your continued use of the Site after any modifications constitutes acceptance of the revised Terms.
                We encourage you to review this page periodically.
              </p>
            </div>

            {/* ── 2. About the Site ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">2. About the Site</h2>
              <p className="mt-3">
                DebtServiceRatioLoan.com is an educational resource and information platform focused on DSCR (Debt Service
                Coverage Ratio) loans and investment property financing. The Site provides guides, calculators, city-specific
                market data, service descriptions, and tools designed to help real estate investors understand DSCR loan
                products.
              </p>
              <p className="mt-3">
                The Site may also facilitate connections between users and third-party loan officers, mortgage brokers, or
                lending institutions. We are not a lender, mortgage broker, or financial advisor. We do not originate,
                underwrite, fund, or service any loans.
              </p>
            </div>

            {/* ── 3. Not Financial or Legal Advice ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">3. Not Financial, Legal, or Tax Advice</h2>
              <p className="mt-3">
                All content on DebtServiceRatioLoan.com — including articles, guides, calculators, rates, requirements,
                and market information — is provided for general educational and informational purposes only. Nothing on
                this Site constitutes financial advice, legal advice, tax advice, or a recommendation to buy, sell,
                refinance, or hold any real estate investment.
              </p>
              <p className="mt-3">
                DSCR loan rates, requirements, terms, and availability vary by lender, market, borrower profile, and
                property type. The information presented on this Site may not reflect the most current rates or guidelines
                from any specific lender. Always consult with a licensed mortgage professional, financial advisor, attorney,
                or tax advisor before making investment or financing decisions.
              </p>
              <p className="mt-3">
                Calculator results, DSCR ratio estimates, and any projections on this Site are approximations based on the
                inputs you provide. They are not guarantees of loan eligibility, approval, or pricing. Actual loan terms
                are determined by individual lenders based on their underwriting criteria.
              </p>
            </div>

            {/* ── 4. User Responsibilities ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">4. User Responsibilities</h2>
              <p className="mt-3">When using the Site, you agree to:</p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>Provide accurate and truthful information in any forms or communications</li>
                <li>Use the Site only for lawful purposes related to real estate investment education</li>
                <li>Not attempt to gain unauthorized access to any portion of the Site, its servers, or databases</li>
                <li>Not use automated tools (bots, scrapers, crawlers) to extract data from the Site without written permission</li>
                <li>Not post or transmit any content that is defamatory, obscene, fraudulent, or that infringes on the rights of others</li>
                <li>Not interfere with or disrupt the Site&apos;s infrastructure, security features, or other users&apos; access</li>
                <li>Not use the Site to send unsolicited commercial messages (spam)</li>
                <li>Comply with all applicable federal, state, and local laws and regulations</li>
              </ul>
            </div>

            {/* ── 5. Third-Party Lender Referrals ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">5. Third-Party Lender Referrals and Connections</h2>
              <p className="mt-3">
                When you submit a consultation request or contact form, we may share your information with third-party loan
                officers, mortgage brokers, or lending institutions who may be able to assist you with DSCR loan products.
                By submitting such a request, you consent to being contacted by one or more of these third parties via phone,
                email, or text message regarding your inquiry.
              </p>
              <p className="mt-3">
                We do not guarantee the quality, reliability, or suitability of any third-party lender or loan officer. We
                are not responsible for the actions, omissions, rates, terms, or conduct of any third party you are connected
                with through the Site. Any loan agreement you enter into is strictly between you and the lender. We strongly
                recommend comparing multiple offers and conducting your own due diligence before committing to any loan.
              </p>
              <p className="mt-3">
                We may receive compensation from lenders or loan officers for referrals made through the Site. This
                compensation does not affect the information or content we provide and does not increase the cost of any
                loan product to you.
              </p>
            </div>

            {/* ── 6. Intellectual Property ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">6. Intellectual Property</h2>
              <p className="mt-3">
                All content on the Site — including text, graphics, logos, icons, images, data, software, calculators,
                guides, and the overall design and layout — is the property of DebtServiceRatioLoan.com or its content
                suppliers and is protected by United States and international copyright, trademark, and intellectual
                property laws.
              </p>
              <p className="mt-3">
                You may access, view, and print content from the Site for your personal, non-commercial use. You may not
                reproduce, distribute, modify, create derivative works from, publicly display, publicly perform, republish,
                download, store, or transmit any content from the Site without our prior written consent, except as
                permitted by applicable law.
              </p>
              <p className="mt-3">
                The DebtServiceRatioLoan.com name, logo, and all related names, logos, product and service names, designs,
                and slogans are trademarks of DebtServiceRatioLoan.com. You may not use these marks without our prior
                written permission.
              </p>
            </div>

            {/* ── 7. DSCR Calculator and Tools ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">7. DSCR Calculator and Tools</h2>
              <p className="mt-3">
                The DSCR calculator and other interactive tools on the Site are provided as educational aids only. Results
                are estimates based on the data you input and the assumptions built into the tool. They do not constitute
                a loan pre-qualification, pre-approval, or commitment from any lender.
              </p>
              <p className="mt-3">
                Actual DSCR ratios, loan eligibility, interest rates, and terms are determined by individual lenders based
                on their underwriting criteria, the property appraisal, credit review, and market conditions at the time
                of application. Calculator results should not be relied upon as a guarantee of any specific outcome.
              </p>
            </div>

            {/* ── 8. Accuracy of Information ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">8. Accuracy of Information</h2>
              <p className="mt-3">
                We make reasonable efforts to ensure the accuracy and timeliness of the information on the Site, including
                DSCR loan rates, requirements, property tax data, and state-specific market information. However, we do
                not warrant that all information is complete, accurate, current, or error-free.
              </p>
              <p className="mt-3">
                Interest rates, loan programs, lender guidelines, property tax rates, and regulatory requirements change
                frequently. The information on the Site may not reflect the most recent updates from lenders or government
                agencies. Always verify critical information directly with the relevant lender, tax authority, or
                regulatory body before making decisions.
              </p>
            </div>

            {/* ── 9. Limitation of Liability ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">9. Limitation of Liability</h2>
              <p className="mt-3">
                TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, DEBTSERVICERATIOLOAN.COM, ITS OWNERS, OFFICERS,
                EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
                OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SITE, INCLUDING BUT
                NOT LIMITED TO:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>Financial losses resulting from investment decisions influenced by Site content</li>
                <li>Losses arising from reliance on calculator results, rate estimates, or market data</li>
                <li>Damages resulting from interactions with third-party lenders or loan officers</li>
                <li>Loss of data, profits, goodwill, or other intangible losses</li>
                <li>Unauthorized access to or alteration of your transmissions or data</li>
              </ul>
              <p className="mt-3">
                IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE AMOUNT YOU PAID TO US (IF ANY) IN
                THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY, OR ONE HUNDRED DOLLARS ($100),
                WHICHEVER IS GREATER.
              </p>
            </div>

            {/* ── 10. Disclaimer of Warranties ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">10. Disclaimer of Warranties</h2>
              <p className="mt-3">
                THE SITE AND ALL CONTENT, TOOLS, AND SERVICES ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT
                WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY.
              </p>
              <p className="mt-3">
                WE DO NOT WARRANT THAT THE SITE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER
                HARMFUL COMPONENTS. WE DO NOT WARRANT THAT THE RESULTS OBTAINED FROM THE USE OF THE SITE OR ANY CALCULATOR
                WILL BE ACCURATE OR RELIABLE.
              </p>
            </div>

            {/* ── 11. Indemnification ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">11. Indemnification</h2>
              <p className="mt-3">
                You agree to indemnify, defend, and hold harmless DebtServiceRatioLoan.com, its owners, officers, employees,
                agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and
                expenses (including reasonable attorneys&apos; fees) arising out of or related to: (a) your use of the Site;
                (b) your violation of these Terms; (c) your violation of any third-party rights; or (d) any content you
                submit to the Site.
              </p>
            </div>

            {/* ── 12. Governing Law and Dispute Resolution ── */}
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
                <a href="mailto:legal@debtserviceratioloan.com" className="text-teal-600 underline hover:text-teal-700">
                  legal@debtserviceratioloan.com
                </a>
                . We will attempt to resolve the dispute within 30 days of receiving your notice.
              </p>
            </div>

            {/* ── 13. Termination ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">13. Termination</h2>
              <p className="mt-3">
                We reserve the right to suspend or terminate your access to the Site at any time, for any reason, without
                notice. Upon termination, your right to use the Site ceases immediately. Sections 3, 6, 9, 10, 11, and 12
                of these Terms shall survive any termination.
              </p>
            </div>

            {/* ── 14. Severability ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">14. Severability</h2>
              <p className="mt-3">
                If any provision of these Terms is found to be unlawful, void, or unenforceable, that provision shall be
                deemed severable and shall not affect the validity and enforceability of the remaining provisions.
              </p>
            </div>

            {/* ── 15. Entire Agreement ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">15. Entire Agreement</h2>
              <p className="mt-3">
                These Terms, together with our{" "}
                <Link href="/privacy-policy" className="text-teal-600 underline hover:text-teal-700">
                  Privacy Policy
                </Link>
                , constitute the entire agreement between you and DebtServiceRatioLoan.com regarding your use of the Site
                and supersede all prior or contemporaneous agreements, communications, and proposals, whether oral or
                written.
              </p>
            </div>

            {/* ── 16. Contact Us ── */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">16. Contact Us</h2>
              <p className="mt-3">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-2">
                <p><strong>DebtServiceRatioLoan.com</strong></p>
                <p>477 Madison Ave, New York, NY 10022</p>
                <p>
                  Email:{" "}
                  <a href="mailto:legal@debtserviceratioloan.com" className="text-teal-600 underline hover:text-teal-700">
                    legal@debtserviceratioloan.com
                  </a>
                </p>
                <p>Phone: (855) 300-3727</p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
