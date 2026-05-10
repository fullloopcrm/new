// @ts-nocheck
import Logo from "@/app/site/stretch-ny/_components/Logo";
import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-ny/_lib/schema";

const pageTitle = "Refund Policy | Stretch NYC Stretch Service";
const pageDescription =
  "Refund and cancellation policy for Stretch NYC stretch service. 24hr notice for full refund. Case-by-case for late cancellations.";
const pageUrl = `${SITE_URL}/refund-policy`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
};

export default function RefundPolicyPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema(pageTitle, pageDescription, pageUrl, [
            { name: "Home", url: SITE_URL },
            { name: "Legal", url: `${SITE_URL}/legal` },
            { name: "Refund Policy", url: pageUrl },
          ]),
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Legal", url: `${SITE_URL}/legal` },
            { name: "Refund Policy", url: pageUrl },
          ]),
        ]}
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-teal-600 to-teal-800 text-white py-14 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Refund Policy
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
            At Stretch NYC, we want every client to have a positive experience. We understand that
            plans change, and we strive to be fair and transparent with our refund and cancellation
            policies.
          </p>

          <h2 className="font-heading">Cancellation Policy</h2>
          <p>
            We require a minimum of <strong>24 hours&apos; notice</strong> for all cancellations and
            rescheduling requests. This allows us to reassign the time slot to another client and
            ensures our therapists are compensated fairly for their scheduled availability.
          </p>

          <div className="bg-teal-50 border border-teal-100 rounded-xl p-6 not-prose mb-8">
            <h3 className="font-heading text-lg font-bold text-gray-900 mb-3">
              Cancellation Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-teal-600 font-bold text-lg">24h+</span>
                <div>
                  <p className="font-semibold text-gray-900">Full refund or free reschedule</p>
                  <p className="text-gray-600 text-sm">
                    Cancel or reschedule with 24 or more hours&apos; notice for a full refund or
                    complimentary reschedule at no charge.
                  </p>
                </div>
              </div>
              <div className="border-t border-teal-100" />
              <div className="flex items-start gap-3">
                <span className="text-amber-600 font-bold text-lg">&lt;24h</span>
                <div>
                  <p className="font-semibold text-gray-900">Case-by-case review</p>
                  <p className="text-gray-600 text-sm">
                    Late cancellations (less than 24 hours&apos; notice) are reviewed on a
                    case-by-case basis. We understand emergencies happen. Contact us and we will do
                    our best to accommodate you.
                  </p>
                </div>
              </div>
              <div className="border-t border-teal-100" />
              <div className="flex items-start gap-3">
                <span className="text-red-500 font-bold text-lg">No-show</span>
                <div>
                  <p className="font-semibold text-gray-900">Full session charge</p>
                  <p className="text-gray-600 text-sm">
                    If you are not available at the agreed-upon location and time without prior
                    notice, the full session fee will be charged. Our therapist has already traveled
                    to your location and reserved the time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <h2 className="font-heading">Refunds for Completed Sessions</h2>
          <p>
            Once a stretching session has been completed, refunds are generally not available. If you
            are unsatisfied with your session for any reason, please contact us within 24 hours and
            we will work with you to make it right. Your satisfaction is our priority.
          </p>

          <h2 className="font-heading">Rescheduling</h2>
          <p>
            We encourage rescheduling over cancellation. With 24 hours&apos; notice, you can
            reschedule your appointment to any available time slot at no additional cost. Same-day
            rescheduling may be available depending on therapist availability.
          </p>

          <h2 className="font-heading">Weekly Program Clients</h2>
          <p>
            Weekly program clients who need to cancel a session should provide 24 hours&apos; notice.
            Missed weekly sessions can typically be rescheduled within the same week, subject to
            therapist availability. There are no long-term contracts — you can pause or cancel your
            weekly program at any time.
          </p>

          <h2 className="font-heading">Emergencies &amp; Exceptions</h2>
          <p>
            We understand that life in New York City is unpredictable. Medical emergencies, severe
            weather, family emergencies, and similar circumstances are always handled with compassion.
            If something unexpected comes up, just reach out. We will work with you.
          </p>

          <h2 className="font-heading">How to Cancel or Reschedule</h2>
          <p>
            To cancel or reschedule your appointment, contact us as soon as possible through any of
            the following:
          </p>
          <ul>
            <li>
              Text or call:{" "}
              <a href={SITE_SMS_LINK} className="text-teal-600 hover:underline">
                {SITE_PHONE}
              </a>
            </li>
            <li>
              Email:{" "}
              <a href="mailto:hello@stretchny.com" className="text-teal-600 hover:underline">
                hello@stretchny.com
              </a>
            </li>
          </ul>
          <p>
            Please include your name, appointment date/time, and whether you&apos;d like to cancel or
            reschedule.
          </p>

          <h2 className="font-heading">Questions</h2>
          <p>
            If you have questions about our refund policy, don&apos;t hesitate to contact us. We&apos;re
            happy to help.
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
              <a href="mailto:hello@stretchny.com" className="text-teal-600 hover:underline">
                hello@stretchny.com
              </a>
            </li>
            <li>Address: 150 W 47th St, New York, NY 10036</li>
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
