import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "Contact The NYC SEO | NYC SEO & AI Search Agency",
  description:
    "Get in touch with The NYC SEO. Request an SEO and AI search optimization partnership for your service business, or send us a general inquiry. Call 212-202-9220.",
  openGraph: {
    title: "Contact The NYC SEO | NYC SEO & AI Search Agency",
    description:
      "Request an SEO partnership or send a general inquiry. Call 212-202-9220.",
    url: `${SITE_URL}/contact`,
  },
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
};

export default function ContactPage() {
  return (
    <div className="text-white">
      {/* Hero — blue */}
      <section className="bg-[#0080FE] pb-20 pt-8">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Contact", url: "/contact" }]} />

          <h1 className="mt-10 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Let&apos;s Talk About Growing
            <br />
            <span className="text-blue-200">Your Business</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-100">
            Whether you&apos;re ready to build an{" "}
            <Link href="/services" className="text-white underline hover:text-blue-200">
              SEO and AI search platform
            </Link>{" "}
            or just have a question about how we work &mdash; we&apos;re here. No pressure. No pitch.
          </p>
        </div>
      </section>

      {/* Cards — dark */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <Link
              href="/partnership-request-form"
              className="group rounded-xl border border-zinc-800 bg-[#141414] p-8 transition-colors hover:border-[#0080FE]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/20 text-[#0080FE]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-white group-hover:text-[#0080FE]">
                Partnership Request
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Ready to grow your{" "}
                <span className="text-zinc-300">service business</span> with organic leads and{" "}
                <span className="text-zinc-300">AI search optimization</span>? Tell us about your
                business and we&apos;ll show you what we can build.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-[#0080FE]">
                Start your request &rarr;
              </span>
            </Link>

            <Link
              href="/contact-form"
              className="group rounded-xl border border-zinc-800 bg-[#141414] p-8 transition-colors hover:border-[#0080FE]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/20 text-[#0080FE]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-white group-hover:text-[#0080FE]">
                General Inquiry
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Have a question about our{" "}
                <span className="text-zinc-300">SEO services</span>, our{" "}
                <span className="text-zinc-300">AI search optimization</span>, or just
                curious about something? Send us a message.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-[#0080FE]">
                Send a message &rarr;
              </span>
            </Link>
          </div>

          <div className="mt-12 rounded-xl border border-zinc-800 bg-[#141414] p-8 text-center">
            <p className="text-lg font-semibold text-white">Or just call us</p>
            <a
              href={`tel:${PHONE.replace(/-/g, "")}`}
              className="mt-2 inline-block text-3xl font-bold text-[#0080FE] hover:text-blue-300"
            >
              {PHONE}
            </a>
            <p className="mt-2 text-sm text-zinc-500">
              No automated menus. A real person who knows{" "}
              <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                SEO and AI search
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
