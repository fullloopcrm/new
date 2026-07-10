import Link from "next/link";
import { PHONE_HREF, SMS_HREF } from "@/app/site/nyc-tow/_data/content";

/**
 * Sticky mobile bottom bar — always-visible Call / Text / Book CTAs.
 * Emergency-use pattern: users on a dead battery on a bridge shoulder
 * should not have to scroll to find the phone number.
 */
export function MobileStickyBar() {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 shadow-2xl">
      <div className="grid grid-cols-3">
        <a
          href={PHONE_HREF}
          className="flex flex-col items-center justify-center py-3 text-yellow-400 hover:bg-slate-800 transition-colors"
          aria-label="Call dispatch"
        >
          <span className="text-lg font-bold">📞</span>
          <span className="text-[11px] font-bold uppercase tracking-wider font-cta">Call</span>
        </a>
        <a
          href={SMS_HREF}
          className="flex flex-col items-center justify-center py-3 text-white hover:bg-slate-800 transition-colors border-x border-slate-800"
          aria-label="Text dispatch"
        >
          <span className="text-lg font-bold">💬</span>
          <span className="text-[11px] font-bold uppercase tracking-wider font-cta">Text</span>
        </a>
        <Link
          href="/book-towing-service-today"
          className="flex flex-col items-center justify-center py-3 bg-accent text-white hover:bg-accent-dark transition-colors"
          aria-label="Request a tow"
        >
          <span className="text-lg font-bold">🚛</span>
          <span className="text-[11px] font-bold uppercase tracking-wider font-cta">Tow</span>
        </Link>
      </div>
    </div>
  );
}
