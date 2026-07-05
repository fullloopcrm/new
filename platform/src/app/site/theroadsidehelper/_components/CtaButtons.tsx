import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/theroadsidehelper/_data/content";

/** Standard CTA buttons — Text (primary), Call, Book Now. Use on dark or light backgrounds. */
export function CtaButtons({ variant = "dark" }: { variant?: "dark" | "light" }) {
  if (variant === "dark") {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <a href={PHONE_HREF}>
          <span className="inline-block rounded-lg bg-amber-400 px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg transition-colors hover:bg-amber-300 font-cta">
            Call {PHONE} — 24/7
          </span>
        </a>
        <a href={SMS_HREF}>
          <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
            Text {PHONE}
          </span>
        </a>
        <Link href="/book-roadside-help-now">
          <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
            Get Help Now
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <a href={PHONE_HREF}>
        <span className="inline-block rounded-lg bg-emerald-700 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-emerald-800 font-cta">
          Call {PHONE} — 24/7
        </span>
      </a>
      <a href={SMS_HREF}>
        <span className="inline-block rounded-lg border-2 border-emerald-700 px-8 py-3.5 text-base font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 font-cta">
          Text {PHONE}
        </span>
      </a>
      <Link href="/book-roadside-help-now">
        <span className="inline-block rounded-lg border-2 border-slate-300 px-8 py-3.5 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50 font-cta">
          Get Help Now
        </span>
      </Link>
    </div>
  );
}