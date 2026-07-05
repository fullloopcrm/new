import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";
import { SITE_NAME, SITE_DOMAIN, PHONE, PHONE_HREF, SMS_HREF, EMAIL, ADDRESS } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: `Contact ${SITE_NAME} — Free Consultations & Questions`,
  description: `Reach the ${SITE_NAME} team for interior design questions, free consultations, or project inquiries. Call ${PHONE} or use our contact form.`,
  alternates: { canonical: `${SITE_DOMAIN}/contact` },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Contact", `Get in touch with ${SITE_NAME}.`, `${SITE_DOMAIN}/contact`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_DOMAIN },
        { name: "Contact", url: `${SITE_DOMAIN}/contact` },
      ])} />

      <section className="relative overflow-hidden bg-gray-700 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Contact Our <span className="text-blue-200">Design Experts</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Questions about interior design? Ready for a free consultation? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-heading">Get in Touch</h2>
              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-600">Phone</h3>
                  <a href={PHONE_HREF} className="mt-1 block text-lg font-semibold text-slate-900 hover:text-blue-600">
                    {PHONE}
                  </a>
                  <a href={SMS_HREF} className="mt-1 block text-sm font-medium text-slate-600 hover:text-blue-600">
                    Text Us
                  </a>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-600">Email</h3>
                  <a href={`mailto:${EMAIL}`} className="mt-1 block text-lg font-semibold text-slate-900 hover:text-blue-600">
                    {EMAIL}
                  </a>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-600">Studio</h3>
                  <p className="mt-1 text-base text-slate-600">
                    {ADDRESS}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-600">Service Area</h3>
                  <p className="mt-1 text-base text-slate-600">
                    All five boroughs of New York City — Manhattan, Brooklyn, Queens, The Bronx, and Staten Island — plus Long Island, Westchester, and New Jersey.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-600">Hours</h3>
                  <p className="mt-1 text-base text-slate-600">
                    Mon&ndash;Fri: 9am&ndash;6pm<br />
                    Sat: 10am&ndash;4pm<br />
                    Sun: By appointment
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
