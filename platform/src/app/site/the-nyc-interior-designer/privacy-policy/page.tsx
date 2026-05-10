// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, breadcrumbSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";
import { SITE_NAME, SITE_DOMAIN, PHONE, EMAIL, ADDRESS } from "@/app/site/the-nyc-interior-designer/_lib/siteData";

export const metadata: Metadata = {
  title: `Privacy Policy — ${SITE_NAME}`,
  description: `How ${SITE_NAME} collects, uses, and protects your personal information. CCPA and GDPR compliant.`,
  alternates: { canonical: `${SITE_DOMAIN}/privacy-policy` },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_DOMAIN },
          { name: "Privacy Policy", url: `${SITE_DOMAIN}/privacy-policy` },
        ])}
      />

      <section className="pt-36 pb-16 sm:pt-44">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-400">Effective Date: April 2, 2026 | Last Updated: April 2, 2026</p>

          <div className="mt-10 space-y-10 text-base leading-relaxed text-slate-600">

            {/* 1. Introduction */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">1. Introduction</h2>
              <p className="mt-3">
                {SITE_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting the privacy of every visitor
                who uses our website, tools, and services. This Privacy Policy explains what information we collect, how we
                use it, who we share it with, and the choices you have regarding your data.
              </p>
              <p className="mt-3">
                By accessing or using thenycinteriordesigner.com (the &quot;Site&quot;), you agree to the terms of this Privacy Policy.
                If you do not agree, please do not use the Site.
              </p>
            </div>

            {/* 2. Information We Collect */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">2. Information We Collect</h2>

              <h3 className="mt-4 text-base font-bold text-slate-800">2.1 Information You Provide Directly</h3>
              <p className="mt-2">
                When you fill out a contact form, request a free consultation, submit a job application, or otherwise communicate with
                us, you may provide:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Property address, neighborhood, or borough</li>
                <li>Project details (design type, property type, budget, timeline)</li>
                <li>Resume, portfolio, and professional information (for job applications)</li>
                <li>Any additional information you include in a message or form submission</li>
              </ul>

              <h3 className="mt-6 text-base font-bold text-slate-800">2.2 Information Collected Automatically</h3>
              <p className="mt-2">
                When you visit the Site, we automatically collect certain technical information through cookies, server logs,
                and similar technologies, including:
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>IP address and approximate geographic location</li>
                <li>Browser type, version, and language</li>
                <li>Device type, operating system, and screen resolution</li>
                <li>Referring URL, pages visited, time on page, and click behavior</li>
                <li>Date and time of each visit</li>
              </ul>

              <h3 className="mt-6 text-base font-bold text-slate-800">2.3 Cookies and Tracking Technologies</h3>
              <p className="mt-2">
                We use cookies and similar tracking technologies (pixels, local storage) to improve the user experience,
                analyze Site traffic, and deliver relevant content. You may adjust your browser settings to refuse cookies,
                but some features of the Site may not function properly without them.
              </p>
            </div>

            {/* 3. How We Use Your Information */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">3. How We Use Your Information</h2>
              <p className="mt-3">We use the information we collect to:</p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>Respond to your inquiries and consultation requests</li>
                <li>Schedule design consultations and provide proposals</li>
                <li>Process job applications and communicate with applicants</li>
                <li>Provide personalized content, guides, and cost estimator results</li>
                <li>Analyze and improve the performance, security, and usability of the Site</li>
                <li>Send transactional communications related to your inquiry</li>
                <li>Comply with legal obligations and enforce our Terms of Service</li>
                <li>Detect, prevent, and address fraud, abuse, or technical issues</li>
              </ul>
              <p className="mt-3">
                We do not sell your personal information. We do not use your information for automated decision-making or
                profiling that produces legal effects.
              </p>
            </div>

            {/* 4. How We Share Your Information */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">4. How We Share Your Information</h2>
              <p className="mt-3">We may share your information with the following categories of third parties:</p>
              <ul className="mt-3 list-disc pl-6 space-y-2">
                <li>
                  <strong>Service Providers:</strong> We use third-party services for hosting (Vercel), database management
                  (Supabase), analytics, and email delivery. These providers process data on our
                  behalf and are contractually obligated to protect your information.
                </li>
                <li>
                  <strong>Contractors & Vendors:</strong> For certain design and renovation projects, we may share relevant project
                  details with trusted contractors, vendors, and trade partners. We only share information necessary to
                  complete your project.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> We may disclose your information if required by law, subpoena, court
                  order, or government request, or if we believe disclosure is necessary to protect our rights, your safety,
                  or the safety of others.
                </li>
                <li>
                  <strong>Business Transfers:</strong> If {SITE_NAME} is acquired, merged, or undergoes a
                  reorganization, your information may be transferred as part of that transaction.
                </li>
              </ul>
            </div>

            {/* 5. Data Retention */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">5. Data Retention</h2>
              <p className="mt-3">
                We retain your personal information for as long as necessary to fulfill the purposes described in this
                Privacy Policy, unless a longer retention period is required or permitted by law. Contact form submissions
                and consultation requests are retained for up to 24 months after your last interaction with us. Job applications
                are retained for 12 months. You may request deletion of your data at any time (see Section 7).
              </p>
            </div>

            {/* 6. Data Security */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">6. Data Security</h2>
              <p className="mt-3">
                We implement industry-standard security measures to protect your personal information, including encrypted
                data transmission (TLS/SSL), secure database storage, access controls, and regular security audits. However,
                no method of electronic storage or transmission is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>

            {/* 7. Your Rights and Choices */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">7. Your Rights and Choices</h2>
              <p className="mt-3">Depending on your location, you may have the following rights regarding your personal data:</p>

              <h3 className="mt-4 text-base font-bold text-slate-800">7.1 All Users</h3>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>Request access to the personal information we hold about you</li>
                <li>Request correction of inaccurate or incomplete information</li>
                <li>Request deletion of your personal information</li>
                <li>Opt out of marketing communications at any time</li>
                <li>Disable cookies through your browser settings</li>
              </ul>

              <h3 className="mt-4 text-base font-bold text-slate-800">7.2 California Residents (CCPA/CPRA)</h3>
              <p className="mt-2">
                If you are a California resident, you have additional rights under the CCPA/CPRA, including the right to know,
                delete, correct, and opt out of the sale of personal information. We do not sell your data.
                To exercise your rights, contact us at{" "}
                <a href={`mailto:${EMAIL}`} className="text-blue-600 underline hover:text-blue-700">
                  {EMAIL}
                </a>{" "}
                or call {PHONE}. We will respond within 45 days.
              </p>

              <h3 className="mt-4 text-base font-bold text-slate-800">7.3 European Economic Area Residents (GDPR)</h3>
              <p className="mt-2">
                If you are located in the EEA, UK, or Switzerland, you have rights under the GDPR including access, rectification,
                erasure, restriction, portability, and the right to withdraw consent. Our legal basis for processing includes consent,
                legitimate interest, and contractual necessity.
              </p>
            </div>

            {/* 8. Third-Party Links */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">8. Third-Party Links</h2>
              <p className="mt-3">
                The Site may contain links to third-party websites. We are not responsible for the privacy practices or content of
                these external sites. We encourage you to review the privacy policies of any third-party sites you visit.
              </p>
            </div>

            {/* 9. Children's Privacy */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">9. Children&apos;s Privacy</h2>
              <p className="mt-3">
                {SITE_NAME} is not directed to individuals under the age of 18. We do not knowingly collect
                personal information from children. If we become aware that a child under 18 has provided us with personal
                information, we will take steps to delete it promptly.
              </p>
            </div>

            {/* 10. Do Not Track */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">10. Do Not Track Signals</h2>
              <p className="mt-3">
                Some browsers offer a &quot;Do Not Track&quot; (DNT) setting. There is currently no industry standard for how websites
                should respond to DNT signals. We do not currently respond to DNT signals but may update this policy as
                standards evolve.
              </p>
            </div>

            {/* 11. Changes to This Policy */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">11. Changes to This Privacy Policy</h2>
              <p className="mt-3">
                We may update this Privacy Policy from time to time. When we make material changes, we will update the
                &quot;Last Updated&quot; date at the top of this page. Your continued use of the Site after any changes constitutes
                acceptance of the updated Privacy Policy.
              </p>
            </div>

            {/* 12. Contact Us */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">12. Contact Us</h2>
              <p className="mt-3">
                If you have questions about this Privacy Policy, wish to exercise your data rights, or have a privacy
                concern, please contact us:
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
