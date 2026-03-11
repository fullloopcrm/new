import type { Metadata } from "next";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";

const breadcrumbs = [
  { name: "Home", url: "https://www.fullloopcrm.com" },
  { name: "Accessibility", url: "https://www.fullloopcrm.com/accessibility" },
];

export const metadata: Metadata = {
  title: "Accessibility | Full Loop CRM",
  description:
    "Full Loop CRM is committed to digital accessibility for all users. Learn about our accessibility standards and how to report issues.",
  keywords: "accessibility, WCAG, ADA compliance, Full Loop CRM, web accessibility, screen reader",
  alternates: { canonical: "https://www.fullloopcrm.com/accessibility" },
  openGraph: {
    title: "Accessibility | Full Loop CRM",
    description: "Our commitment to digital accessibility for all users.",
    url: "https://www.fullloopcrm.com/accessibility",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Accessibility | Full Loop CRM",
    description: "Our commitment to digital accessibility for all users.",
  },
};

export default function AccessibilityPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Accessibility | Full Loop CRM",
          "Full Loop CRM accessibility statement.",
          "https://www.fullloopcrm.com/accessibility",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold text-white font-heading mb-4">
            Accessibility Statement
          </h1>
          <p className="text-slate-300">
            Last updated: March 9, 2026
          </p>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="mx-auto max-w-3xl prose prose-slate prose-headings:font-heading">
          <h2>Our Commitment</h2>
          <p>
            Full Loop CRM is committed to ensuring digital accessibility for
            people of all abilities. We continually improve the user
            experience for everyone and apply relevant accessibility standards
            to our platform and marketing website.
          </p>

          <h2>Standards</h2>
          <p>
            We aim to conform to the Web Content Accessibility Guidelines
            (WCAG) 2.1 at Level AA. These guidelines explain how to make web
            content more accessible to people with disabilities, including:
          </p>
          <ul>
            <li>Visual impairments (blindness, low vision, color blindness)</li>
            <li>Hearing impairments</li>
            <li>Motor impairments</li>
            <li>Cognitive and learning disabilities</li>
          </ul>

          <h2>Measures We Take</h2>
          <ul>
            <li>Semantic HTML structure with proper heading hierarchy</li>
            <li>Descriptive link text and ARIA labels on interactive elements</li>
            <li>Sufficient color contrast ratios across all pages</li>
            <li>Keyboard-navigable interface</li>
            <li>Form labels and error messages for assistive technology</li>
            <li>Responsive design that works across devices and screen sizes</li>
            <li>Bilingual support (English and Spanish) in our team portal</li>
          </ul>

          <h2>Known Limitations</h2>
          <p>
            While we strive for full accessibility, some areas may have
            limitations:
          </p>
          <ul>
            <li>Third-party integrations (Tawk.to chat widget) may not fully meet WCAG standards</li>
            <li>Some dynamically generated content may have limited screen reader support</li>
          </ul>
          <p>
            We are actively working to address these limitations and improve
            accessibility across the entire platform.
          </p>

          <h2>Feedback &amp; Assistance</h2>
          <p>
            If you encounter an accessibility barrier or have suggestions for
            improvement, please contact us:
          </p>
          <ul>
            <li>Email: <a href="mailto:hello@fullloopcrm.com">hello@fullloopcrm.com</a></li>
            <li>Phone: <a href="tel:+12122029220">(212) 202-9220</a></li>
            <li>Text: <a href="sms:+12122029220">(212) 202-9220</a></li>
          </ul>
          <p>
            We aim to respond to accessibility feedback within 2 business
            days and to resolve issues as quickly as possible.
          </p>
        </div>
      </section>
    </>
  );
}
