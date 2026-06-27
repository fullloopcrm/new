// @ts-nocheck
import Link from "next/link";
import { PHONE_HREF, SMS_HREF } from "@/app/site/nycroadsideemergencyassistance/_data/content";

/**
 * Sticky mobile bottom bar — always-visible Call / Text / Book CTAs.
 * Emergency-use pattern: users on a dead battery on a bridge shoulder
 * should not have to scroll to find the phone number.
 */
export function MobileStickyBar() {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 shadow-2xl">
      <div className="grid grid-cols-3">
        <Link
          href="/book-towing-service-today"
          className="flex flex-col items-center justify-center py-3 bg-yellow-400 text-slate-900 hover:bg-yellow-300 transition-colors"
          aria-label="Book online and save $25"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider font-cta">Save $25</span>
          <span className="text-[11px] font-extrabold uppercase tracking-wider font-cta">Book Online</span>
        </Link>
        <a
          href={SMS_HREF}
          className="flex flex-col items-center justify-center py-3 bg-white text-teal-700 hover:bg-teal-50 transition-colors border-x border-slate-700"
          aria-label="Text dispatch"
        >
          <span className="text-lg font-bold">💬</span>
          <span className="text-[11px] font-bold uppercase tracking-wider font-cta">Text</span>
        </a>
        <a
          href={PHONE_HREF}
          className="flex flex-col items-center justify-center py-3 text-white hover:bg-slate-800 transition-colors"
          aria-label="Call dispatch"
        >
          <span className="text-lg font-bold">📞</span>
          <span className="text-[11px] font-bold uppercase tracking-wider font-cta">Call</span>
        </a>
      </div>
    </div>
  );
}