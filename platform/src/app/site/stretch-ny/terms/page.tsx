// @ts-nocheck
import Logo from "@/app/site/stretch-ny/_components/Logo";
import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-ny/_lib/schema";

const pageTitle = "Terms & Conditions | Stretch NYC Stretch Service";
const pageDescription =
  "Terms and conditions for Stretch NYC mobile stretch service. Booking, cancellation, payment, and service policies. $99/hr, 24hr cancellation notice.";
const pageUrl = `${SITE_URL}/terms`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
};

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema(pageTitle, pageDescription, pageUrl, [
            { name: "Home", url: SITE_URL },
            { name: "Legal", url: `${SITE_URL}/legal` },
            { name: "Terms & Conditions", url: pageUrl },
          ]),
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Legal", url: `${SITE_URL}/legal` },
            { name: "Terms & Conditions", url: pageUrl },
          ]),
        ]}
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-teal-600 to-teal-800 text-white py-14 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Terms &amp; Conditions
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
            Welcome to Stretch NYC. By booking, purchasing, or using any of our services, you agree to
            be bound by the following terms and conditions. Please read them carefully.
          </p>

          <h2 className="font-heading">1. Services</h2>
          <p>
            Stretch NYC provides professional mobile assisted stretching services throughout New York
            City. Our certified stretch therapists travel to your home, office, hotel, park, or other
            agreed-upon location to deliver one-on-one stretching sessions.
          </p>

          <h2 className="font-heading">2. Booking &amp; Appointments</h2>
          <p>
            Appointments can be booked by texting or calling{" "}
            <a href={SITE_SMS_LINK} className="text-teal-600 hover:underline">
              {SITE_PHONE}
            </a>{" "}
            or through our website. By booking an appointment, you confirm that:
          </p>
          <ul>
            <li>You are at least 18 years old, or have parental/guardian consent.</li>
            <li>The information you provide (name, address, contact details) is accurate.</li>
            <li>You will be available at the agreed-upon location and time.</li>
            <li>
              You have disclosed any relevant medical conditions, injuries, or physical limitations
              that may affect your session.
            </li>
          </ul>

          <h2 className="font-heading">3. Cancellation Policy</h2>
          <p>
            We require a minimum of <strong>24 hours&apos; notice</strong> for cancellations or
            rescheduling. Cancellations made with less than 24 hours&apos; notice may be subject to a
            cancellation fee equal to the full session price. See our{" "}
            <Link href="/refund-policy" className="text-teal-600 hover:underline">
              Refund Policy
            </Link>{" "}
            for full details.
          </p>

          <h2 className="font-heading">4. Payment</h2>
          <p>
            Payment is due at the time of service unless other arrangements have been made in advance.
            We accept major credit cards, debit cards, Venmo, Zelle, and cash. All prices are listed
            in US dollars and are subject to change with notice.
          </p>

          <h2 className="font-heading">5. Health &amp; Safety</h2>
          <p>
            Assisted stretching is a physical service. By booking a session, you acknowledge and agree
            that:
          </p>
          <ul>
            <li>
              You are in good health and physically able to participate in stretching activities, or
              have received clearance from your physician.
            </li>
            <li>
              You will inform your therapist of any pain, discomfort, injuries, surgeries, or medical
              conditions before and during your session.
            </li>
            <li>
              Stretch NYC therapists are certified stretch professionals but are not medical doctors,
              physical therapists, or licensed massage therapists. Our services are not a substitute
              for medical treatment.
            </li>
            <li>
              You participate in stretching sessions at your own risk. While our therapists follow
              professional protocols, some discomfort or soreness may occur.
            </li>
          </ul>

          <h2 className="font-heading">6. Liability</h2>
          <p>
            To the fullest extent permitted by law, Stretch NYC, its owners, employees, and
            independent contractors shall not be liable for any injury, damage, loss, or claim arising
            from or related to:
          </p>
          <ul>
            <li>Participation in stretching sessions.</li>
            <li>Failure to disclose medical conditions or physical limitations.</li>
            <li>Actions taken based on information provided during sessions.</li>
            <li>Any pre-existing condition exacerbated during a session.</li>
          </ul>

          <h2 className="font-heading">7. Session Location</h2>
          <p>
            Stretch NYC provides mobile services at your chosen location. You are responsible for
            ensuring a safe, clean, and adequate space for the session (approximately 8x8 feet of
            clear floor space). Outdoor sessions are subject to weather conditions and may need to be
            rescheduled.
          </p>

          <h2 className="font-heading">8. Intellectual Property</h2>
          <p>
            All content on the Stretch NYC website, including text, images, logos, graphics, and
            design, is the property of Stretch NYC and is protected by copyright and trademark laws.
            You may not reproduce, distribute, or use any content without written permission.
          </p>

          <h2 className="font-heading">9. Privacy</h2>
          <p>
            Your personal information is handled in accordance with our{" "}
            <Link href="/privacy-policy" className="text-teal-600 hover:underline">
              Privacy Policy
            </Link>
            . By using our services, you consent to the collection and use of your information as
            described therein.
          </p>

          <h2 className="font-heading">10. Changes to Terms</h2>
          <p>
            Stretch NYC reserves the right to update or modify these terms at any time. Changes will
            be posted on this page with an updated date. Continued use of our services after changes
            constitutes acceptance of the revised terms.
          </p>

          <h2 className="font-heading">11. Governing Law</h2>
          <p>
            These terms shall be governed by and construed in accordance with the laws of the State
            of New York. Any disputes arising from these terms or our services shall be resolved in
            the courts of New York County, New York.
          </p>

          <h2 className="font-heading">12. Contact</h2>
          <p>
            If you have questions about these terms, please contact us:
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
    </>
  );
}
