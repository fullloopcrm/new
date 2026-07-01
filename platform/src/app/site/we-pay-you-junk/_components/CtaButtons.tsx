import Link from "next/link";
import { PHONE, SMS_HREF } from "@/app/site/we-pay-you-junk/_data/content";

/** Standard CTA buttons — Book Now (primary, dominant) + Text (secondary). No call CTA. Use on dark or light backgrounds. */
export function CtaButtons({ variant = "dark" }: { variant?: "dark" | "light" }) {
  if (variant === "dark") {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link href="/book-junk-removal-service-today">
          <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
            Book Now &amp; Save $10
          </span>
        </Link>
        <a href={SMS_HREF}>
          <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
            Text {PHONE}
          </span>
        </a>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <Link href="/book-junk-removal-service-today">
        <span className="inline-block rounded-lg bg-teal-700 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-teal-800 font-cta">
          Book Now &amp; Save $10
        </span>
      </Link>
      <a href={SMS_HREF}>
        <span className="inline-block rounded-lg border-2 border-teal-700 px-8 py-3.5 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
          Text {PHONE}
        </span>
      </a>
    </div>
  );
}
