import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import { BrandLink } from "@/app/site/the-nyc-marketing-company/_lib/brand";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description:
    "Accessibility Statement for The NYC Marketing Company. Our commitment to making our website accessible to all users. Call (212) 202-9220 with questions.",
  alternates: { canonical: "https://www.thenycmarketingcompany.com/accessibility" },
  robots: { index: true, follow: true },
};

const UPDATED = "March 7, 2026";

export default function AccessibilityPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Accessibility Statement",
          "Accessibility Statement for The NYC Marketing Company. Our commitment to digital accessibility for all users.",
          "https://www.thenycmarketingcompany.com/accessibility"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.thenycmarketingcompany.com" },
          { name: "Accessibility", url: "https://www.thenycmarketingcompany.com/accessibility" },
        ])}
      />

      <article className="pt-32 pb-20 sm:pt-40 sm:pb-28 px-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-teal-600 text-sm font-semibold tracking-[0.15em] uppercase mb-3 font-cta">Legal</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight font-heading">Accessibility Statement</h1>
          <p className="mt-3 text-sm text-slate-400">Last updated: {UPDATED}</p>

          <div className="mt-12 prose-legal">
            <Section title="Our Commitment">
              <p>
                <BrandLink /> is committed to ensuring that our website is accessible to all people, including individuals with disabilities. We strive to meet or exceed the requirements of the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA.
              </p>
              <p>
                Accessibility is an ongoing effort. We continually improve the user experience for everyone and apply the relevant accessibility standards to achieve this.
              </p>
            </Section>

            <Section title="Measures We Take">
              <p>We take the following measures to ensure accessibility:</p>
              <ul>
                <li>Semantic HTML structure with proper heading hierarchy</li>
                <li>Sufficient color contrast ratios throughout the site</li>
                <li>Keyboard navigation support for all interactive elements</li>
                <li>Descriptive alt text for images and visual content</li>
                <li>ARIA labels and roles where appropriate</li>
                <li>Responsive design that works across devices and screen sizes</li>
                <li>Clear and consistent navigation</li>
                <li>Form labels and error messages for all input fields</li>
                <li>No content that flashes more than three times per second</li>
                <li>Text resizing support without loss of functionality</li>
              </ul>
            </Section>

            <Section title="Known Limitations">
              <p>
                While we strive for full accessibility, some areas of the site may have limitations:
              </p>
              <ul>
                <li>Some third-party content or embedded widgets may not be fully accessible</li>
                <li>Older PDF documents may not be fully screen-reader compatible</li>
                <li>Some animations may not be reduced when the user has the &quot;prefers-reduced-motion&quot; setting enabled (we are actively working on this)</li>
              </ul>
              <p>
                We are actively working to address these limitations and welcome feedback on how to improve.
              </p>
            </Section>

            <Section title="Assistive Technology Compatibility">
              <p>Our site is designed to be compatible with:</p>
              <ul>
                <li>Screen readers (NVDA, JAWS, VoiceOver)</li>
                <li>Screen magnification software</li>
                <li>Speech recognition software</li>
                <li>Keyboard-only navigation</li>
                <li>Modern web browsers (Chrome, Firefox, Safari, Edge)</li>
              </ul>
            </Section>

            <Section title="Feedback and Contact">
              <p>
                We welcome your feedback on the accessibility of our website. If you encounter any barriers or have suggestions for improvement, please contact us:
              </p>
              <ul>
                <li><strong>Email:</strong> <a href="mailto:hello@thenycmarketingcompany.com">hello@thenycmarketingcompany.com</a></li>
                <li><strong>Phone:</strong> <a href="tel:+12122029220">(212) 202-9220</a></li>
                <li><strong>Address:</strong> <BrandLink />, New York, NY 10001</li>
              </ul>
              <p>
                We aim to respond to accessibility feedback within 2 business days and to resolve issues as quickly as possible.
              </p>
            </Section>

            <Section title="Enforcement">
              <p>
                If you are not satisfied with our response, you may file a complaint with the U.S. Department of Justice, Civil Rights Division, or the relevant state agency. New York City residents may also contact the NYC Commission on Human Rights.
              </p>
            </Section>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <Link href="/privacy-policy" className="hover:text-teal-600 transition-colors">&larr; Privacy Policy</Link>
            <Link href="/terms" className="hover:text-teal-600 transition-colors">&larr; Terms of Service</Link>
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
      <div className="text-slate-600 leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-teal-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-teal-700">
        {children}
      </div>
    </section>
  );
}