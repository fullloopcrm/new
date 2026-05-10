// @ts-nocheck
import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/toll-trucks-near-me/_data/content";

/** Standard CTA buttons — Text (primary), Call, Book Now. Use on dark or light backgrounds. */
export function CtaButtons({ variant = "dark" }: { variant?: "dark" | "light" }) {
  if (variant === "dark") {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <a href={SMS_HREF}>
          <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
            Text {PHONE} — Most Popular
          </span>
        </a>
        <a href={PHONE_HREF}>
          <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
            Call {PHONE}
          </span>
        </a>
        <Link href="/book-tow-truck-now">
          <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
            Book Now
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <a href={SMS_HREF}>
        <span className="inline-block rounded-lg bg-teal-700 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-teal-800 font-cta">
          Text {PHONE} — Most Popular
        </span>
      </a>
      <a href={PHONE_HREF}>
        <span className="inline-block rounded-lg border-2 border-teal-700 px-8 py-3.5 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
          Call {PHONE}
        </span>
      </a>
      <Link href="/book-tow-truck-now">
        <span className="inline-block rounded-lg border-2 border-slate-300 px-8 py-3.5 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50 font-cta">
          Book Now
        </span>
      </Link>
    </div>
  );
}
