// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";
import GeneralContactForm from "@/app/site/the-nyc-seo/_components/GeneralContactForm";

export const metadata: Metadata = {
  title: "Contact Us | General Inquiry | The NYC SEO",
  description:
    "Have a question about SEO, AI search optimization, or our services? Send us a message. The NYC SEO — powered by Consortium NYC.",
  openGraph: {
    title: "Contact Us | General Inquiry | The NYC SEO",
    description: "Send us a message. We'll get back to you.",
    url: `${SITE_URL}/contact-form`,
  },
  alternates: {
    canonical: `${SITE_URL}/contact-form`,
  },
};

export default function ContactFormPage() {
  return (
    <div className="text-white">
      {/* Hero — grey */}
      <section className="bg-[#2A2A2A] pb-20 pt-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Contact", url: "/contact-form" }]} />

          <div className="mt-10">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Send Us a Message
            </h1>
            <p className="mt-4 text-lg text-zinc-300">
              Have a question about{" "}
              <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                our SEO and AI search services
              </Link>
              , want to learn more about how we work, or just want to say hello? Drop us
              a line and we&apos;ll get back to you.
            </p>
          </div>

          <div className="mt-10 rounded-xl border border-zinc-700 bg-[#363636] p-6 sm:p-8">
            <div className="[&_input]:border-zinc-600 [&_input]:bg-[#2A2A2A] [&_input]:text-white [&_input]:placeholder:text-zinc-500 [&_label]:text-zinc-300 [&_textarea]:border-zinc-600 [&_textarea]:bg-[#2A2A2A] [&_textarea]:text-white [&_textarea]:placeholder:text-zinc-500">
              <GeneralContactForm />
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-400">
              Or call us at{" "}
              <a
                href={`tel:${PHONE.replace(/-/g, "")}`}
                className="font-semibold text-[#0080FE] hover:text-blue-300"
              >
                {PHONE}
              </a>
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Looking for an{" "}
              <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                SEO partnership
              </Link>
              ?{" "}
              <Link href="/partnership-request-form" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                Start here instead &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
