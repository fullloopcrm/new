// @ts-nocheck
import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/nycroadsideemergencyassistance/_data/content";

/** Standard CTA buttons — order: Book (yellow) → Text (white) → Call (clear). */
export function CtaButtons({ variant = "dark" }: { variant?: "dark" | "light" }) {
  if (variant === "dark") {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link href="/book-towing-service-today">
          <span className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-8 py-3.5 text-base font-bold text-slate-900 shadow-lg transition-colors hover:bg-yellow-300 font-cta">
            Book Online — Save $25
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-yellow-300">$124 1st hr</span>
          </span>
        </Link>
        <a href={SMS_HREF}>
          <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
            Text {PHONE}
          </span>
        </a>
        <a href={PHONE_HREF}>
          <span className="inline-block rounded-lg border-2 border-white/40 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/80 font-cta">
            Call {PHONE}
          </span>
        </a>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <Link href="/book-towing-service-today">
        <span className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-8 py-3.5 text-base font-bold text-slate-900 shadow-lg transition-colors hover:bg-yellow-300 font-cta">
          Book Online — Save $25
          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-yellow-300">$124 1st hr</span>
        </span>
      </Link>
      <a href={SMS_HREF}>
        <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta ring-1 ring-teal-700">
          Text {PHONE}
        </span>
      </a>
      <a href={PHONE_HREF}>
        <span className="inline-block rounded-lg border-2 border-teal-700 px-8 py-3.5 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
          Call {PHONE}
        </span>
      </a>
    </div>
  );
}