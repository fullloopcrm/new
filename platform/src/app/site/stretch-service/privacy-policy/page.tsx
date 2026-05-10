// @ts-nocheck
import Logo from "@/app/site/stretch-service/_components/Logo";
import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-service/_lib/schema";

const pageTitle = "Privacy Policy | Stretch Service Stretch Service";
const pageDescription =
  "Privacy policy for Stretch Service mobile stretch service. How we collect, use, and protect your data. HIPAA-aware practices.";
const pageUrl = `${SITE_URL}/privacy-policy`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema(pageTitle, pageDescription, pageUrl, [
            { name: "Home", url: SITE_URL },
            { name: "Legal", url: `${SITE_URL}/legal` },
            { name: "Privacy Policy", url: pageUrl },
          ]),
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Legal", url: `${SITE_URL}/legal` },
            { name: "Privacy Policy", url: pageUrl },
          ]),
        ]}
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-teal-600 to-teal-800 text-white py-14 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-teal-100">
            Last updated: April 11, 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 prose prose-gray prose-lg max-w-none">
          <p>
            Stretch Service (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy and
            is committed to protecting the personal information you share with us. This Privacy Policy
            explains how we collect, use, and safeguard your information when you visit our website
            (stretchservice.com) or use our mobile assisted stretching services.
          </p>

          <h2 className="font-heading">1. Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <h3 className="font-heading">Personal Information You Provide</h3>
          <ul>
            <li>Name, email address, and phone number (when booking or contacting us)</li>
            <li>Service address or session location</li>
            <li>Payment information (processed securely through third-party providers)</li>
            <li>Health information you voluntarily disclose for session customization (injuries, medical conditions, physical limitations)</li>
          </ul>
          <h3 className="font-heading">Automatically Collected Information</h3>
          <ul>
            <li>Browser type, device type, and operating system</li>
            <li>IP address and approximate geographic location</li>
            <li>Pages visited, time spent, and navigation patterns on our website</li>
            <li>Referring website or search terms</li>
          </ul>

          <h2 className="font-heading">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Schedule and deliver stretching sessions</li>
            <li>Communicate with you about appointments, promotions, and service updates</li>
            <li>Process payments securely</li>
            <li>Customize sessions based on your physical needs and goals</li>
            <li>Improve our website, services, and customer experience</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2 className="font-heading">3. How We Share Your Information</h2>
          <p>
            We do <strong>not</strong> sell, rent, or trade your personal information to third
            parties. We may share your information only in the following circumstances:
          </p>
          <ul>
            <li>
              <strong>Service Providers:</strong> With trusted third-party providers who assist us
              with payment processing, website hosting, analytics, and communication tools. These
              providers are contractually obligated to protect your data.
            </li>
            <li>
              <strong>Therapists:</strong> Your name, session location, and relevant health
              information are shared with your assigned stretch therapist to deliver your session.
            </li>
            <li>
              <strong>Legal Requirements:</strong> When required by law, regulation, or legal process.
            </li>
          </ul>

          <h2 className="font-heading">4. Cookies &amp; Tracking</h2>
          <p>
            Our website uses cookies and similar technologies to improve your browsing experience and
            analyze site traffic. You can control cookie preferences through your browser settings.
            We may use:
          </p>
          <ul>
            <li>
              <strong>Essential Cookies:</strong> Required for basic website functionality.
            </li>
            <li>
              <strong>Analytics Cookies:</strong> Help us understand how visitors use our site
              (e.g., Google Analytics).
            </li>
            <li>
              <strong>Marketing Cookies:</strong> Used to deliver relevant advertisements and measure
              campaign effectiveness.
            </li>
          </ul>

          <h2 className="font-heading">5. Data Security</h2>
          <p>
            We implement reasonable administrative, technical, and physical safeguards to protect your
            personal information from unauthorized access, disclosure, alteration, or destruction.
            However, no method of transmission over the internet is 100% secure, and we cannot
            guarantee absolute security.
          </p>

          <h2 className="font-heading">6. Data Retention</h2>
          <p>
            We retain your personal information only as long as necessary to fulfill the purposes for
            which it was collected, comply with legal obligations, resolve disputes, and enforce our
            agreements. Booking and session records are typically retained for up to 3 years.
          </p>

          <h2 className="font-heading">7. Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your personal information</li>
            <li>Opt out of marketing communications</li>
            <li>Request a copy of your data in a portable format</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:hello@stretchservice.com" className="text-teal-600 hover:underline">
              hello@stretchservice.com
            </a>{" "}
            or call{" "}
            <a href={SITE_SMS_LINK} className="text-teal-600 hover:underline">
              {SITE_PHONE}
            </a>
            .
          </p>

          <h2 className="font-heading">8. Children&apos;s Privacy</h2>
          <p>
            Our services are not directed to individuals under 18 without parental or guardian
            consent. We do not knowingly collect personal information from children under 13. If you
            believe we have collected information from a child under 13, please contact us
            immediately.
          </p>

          <h2 className="font-heading">9. Third-Party Links</h2>
          <p>
            Our website may contain links to third-party websites. We are not responsible for the
            privacy practices or content of those sites. We encourage you to review their privacy
            policies before providing any personal information.
          </p>

          <h2 className="font-heading">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page
            with an updated &quot;Last updated&quot; date. Your continued use of our website and
            services after any changes constitutes acceptance of the revised policy.
          </p>

          <h2 className="font-heading">11. Contact Us</h2>
          <p>
            If you have questions or concerns about this Privacy Policy, please contact us:
          </p>
          <ul>
            <li>
              Phone/Text:{" "}
              <a href={SITE_SMS_LINK} className="text-teal-600 hover:underline">
                {SITE_PHONE}
              </a>
            </li>
            <li>
              Email:{" "}
              <a href="mailto:hello@stretchservice.com" className="text-teal-600 hover:underline">
                hello@stretchservice.com
              </a>
            </li>
            <li>Address: 150 W 47th St, Nationwide</li>
          </ul>
        </div>
      </section>
      <section className="bg-section-teal py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold text-slate-500 mb-4">Explore Our Assisted Stretch Service</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/services" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Services</Link>
            <Link href="/locations" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Locations</Link>
            <Link href="/parks" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Parks</Link>
            <Link href="/pricing" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Pricing</Link>
            <Link href="/stretching-101" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Stretching 101</Link>
            <Link href="/faq" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">FAQ</Link>
            <Link href="/contact" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Contact</Link>
          </div>
        </div>
      </section>

    </>
  );
}
