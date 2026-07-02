import Link from "next/link";
import { PHONE } from "@/app/site/the-nyc-exterminator/_lib/seo";

type CTAVariant = "hero" | "mid" | "preFaq" | "final";

interface CTAGroupProps {
  variant: CTAVariant;
  title?: string;
  subtitle?: string;
}

const defaults: Record<CTAVariant, { title: string; subtitle: string }> = {
  hero: {
    title: "Ready When You Are.",
    subtitle: "Free inspection. Upfront pricing. Licensed pest control technicians on call.",
  },
  mid: {
    title: "Don\u2019t Let Pests Take Over Your Property.",
    subtitle: "Every day you wait, the infestation grows. Get a free pest control inspection and same-day treatment options.",
  },
  preFaq: {
    title: "Licensed. Insured. Trusted by Thousands of NYC Properties.",
    subtitle: "From studio apartments to commercial kitchens \u2014 we\u2019ve seen it all and eliminated it all.",
  },
  final: {
    title: "Your Pest Problem Ends Here.",
    subtitle: "Tell us what you\u2019re dealing with. We\u2019ll send a licensed exterminator to inspect, quote, and treat \u2014 often the same day.",
  },
};

const phonePlain = PHONE.replace(/-/g, "");

function SmsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 20.97v-3.17a4.202 4.202 0 0 1-1.092-3.09V8.603c0-2.726 1.877-5.058 4.005-5.945Z" />
      <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 0 0 1.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0 0 15.75 7.5Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
      <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
    </svg>
  );
}

export default function CTAGroup({ variant, title, subtitle }: CTAGroupProps) {
  const d = defaults[variant];
  const heading = title ?? d.title;
  const sub = subtitle ?? d.subtitle;

  if (variant === "hero") {
    return (
      <div className="mt-8">
        <div className="mb-5 space-y-1.5 text-sm text-zinc-400">
          <p>&#10003; <strong className="text-green-400">Self-book &amp; save $10</strong> &mdash; the fastest way to get service</p>
          <p>&#10003; <strong className="text-zinc-200">No money upfront</strong> &mdash; pay when the job is done</p>
          <p>&#10003; <strong className="text-zinc-200">2,847+</strong> five-star reviews</p>
          <p>&#10003; <strong className="text-zinc-200">Licensed &amp; insured</strong> NYS DEC exterminators</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/book-exterminator-today"
            data-cta="self-book"
            data-cta-location={`cta-${variant}`}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-green-600/25 transition-all hover:bg-green-500 hover:shadow-green-500/30 hover:-translate-y-0.5"
          >
            <CalendarIcon />
            Self-Book Online &mdash; Save $10
          </Link>
          <a
            href={`sms:${phonePlain}`}
            data-cta="text-us"
            data-cta-location={`cta-${variant}`}
            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-white/5 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition-all hover:border-zinc-500 hover:bg-white/10 hover:-translate-y-0.5"
          >
            <SmsIcon />
            Text Us With Questions
          </a>
        </div>
        <p className="mt-2.5 text-xs font-medium text-green-400">Self-booking is the fastest way to get service.</p>
      </div>
    );
  }

  const isLarge = variant === "final";

  return (
    <section className={`relative overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-emerald-700 ${isLarge ? "py-20" : "py-14"}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.06),transparent_70%)]" />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className={`font-bold text-white ${isLarge ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}>
          {heading}
        </h2>
        <p className={`mx-auto mt-3 max-w-2xl text-green-100 ${isLarge ? "text-lg" : "text-lg"}`}>
          {sub}
        </p>
        <div className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-green-100/80">
          <span>&#10003; Self-book &amp; save $10</span>
          <span>&#10003; No money upfront</span>
          <span>&#10003; 2,847+ five-star reviews</span>
          <span>&#10003; Licensed &amp; insured</span>
        </div>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/book-exterminator-today"
            data-cta="self-book"
            data-cta-location={`cta-${variant}`}
            className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-lg font-bold text-green-700 shadow-lg shadow-black/10 transition-all hover:bg-green-50 hover:-translate-y-0.5"
          >
            <CalendarIcon />
            Self-Book Online &mdash; Save $10
          </Link>
          <a
            href={`sms:${phonePlain}`}
            data-cta="text-us"
            data-cta-location={`cta-${variant}`}
            className="group inline-flex items-center gap-2 rounded-xl border-2 border-white px-7 py-3.5 text-lg font-bold text-white transition-all hover:bg-white/10 hover:-translate-y-0.5"
          >
            <SmsIcon />
            Text Us With Questions
          </a>
        </div>
        <p className="mt-4 text-sm font-medium text-green-100">Self-booking is the fastest way to get service.</p>
      </div>
    </section>
  );
}
