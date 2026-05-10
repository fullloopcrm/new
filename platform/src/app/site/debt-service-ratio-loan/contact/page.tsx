// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/debt-service-ratio-loan/_lib/schema";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact DSCR Loan Experts — Questions & Partnerships",
  description: "Reach the DebtServiceRatioLoan.com team for DSCR loan questions, lender partnerships, or advertising. Call (855) 300-DSCR or use our contact form.",
  alternates: { canonical: "https://www.debtserviceratioloan.com/contact" },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Contact", "Get in touch with DebtServiceRatioLoan.com.", "https://www.debtserviceratioloan.com/contact")} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://www.debtserviceratioloan.com" },
        { name: "Contact", url: "https://www.debtserviceratioloan.com/contact" },
      ])} />

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Contact Our <span className="text-teal-200">DSCR Loan Experts</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Questions about DSCR loans? Partnerships? We&apos;d love to hear from you.
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
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600">Phone</h3>
                  <a href="sms:+18553003727" className="mt-1 block text-lg font-semibold text-slate-900 hover:text-teal-600">
                    (855) 300-DSCR (3727) | Text
                  </a>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600">Email</h3>
                  <a href="mailto:hello@debtserviceratioloan.com" className="mt-1 block text-lg font-semibold text-slate-900 hover:text-teal-600">
                    hello@debtserviceratioloan.com
                  </a>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600">New York Office</h3>
                  <p className="mt-1 text-base text-slate-600">
                    477 Madison Ave<br />
                    New York, NY 10022
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600">Miami Office</h3>
                  <p className="mt-1 text-base text-slate-600">
                    5901 NW 183rd St<br />
                    Miami Gardens, FL 33015
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600">New Orleans Office</h3>
                  <p className="mt-1 text-base text-slate-600">
                    1100 Poydras St Building<br />
                    New Orleans, LA 70163
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600">Houston Office</h3>
                  <p className="mt-1 text-base text-slate-600">
                    7457 Harwin Dr<br />
                    Houston, TX 77036
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600">Los Angeles Office</h3>
                  <p className="mt-1 text-base text-slate-600">
                    801 S Figueroa St<br />
                    Los Angeles, CA 90017
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-600">Portland Office</h3>
                  <p className="mt-1 text-base text-slate-600">
                    254 Commercial St<br />
                    Portland, ME 04101
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
