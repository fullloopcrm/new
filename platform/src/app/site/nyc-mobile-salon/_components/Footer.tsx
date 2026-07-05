import Link from "next/link";
import { mainNav, moreNav, neighborhoods, boroughNames } from "@/app/site/nyc-mobile-salon/_lib/constants";

export default function Footer() {
  return (
    <footer className="px-4 py-16" style={{ background: "linear-gradient(180deg, #1a1a1a 0%, #2d1f2f 100%)" }}>
      <div className="mx-auto max-w-6xl">
        {/* Top section */}
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link href="/" className="font-display text-xl font-semibold text-white">
              The NYC Mobile Salon
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Licensed beauty pros, delivered to your door across all 5 NYC boroughs. The future of beauty is mobile.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">Pages</h4>
            <ul className="space-y-2.5 text-sm">
              {mainNav.map((link) => (
                <li key={link.href}><Link href={link.href} className="text-white/80 transition-colors hover:text-blush">{link.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">More</h4>
            <ul className="space-y-2.5 text-sm">
              {moreNav.map((link) => (
                <li key={link.href}><Link href={link.href} className="text-white/80 transition-colors hover:text-blush">{link.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">Contact</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="tel:+12122029075" className="text-white/80 transition-colors hover:text-blush">212.202.9075</a></li>
              <li><a href="mailto:hey@thenycmobilesalon.com" className="text-white/80 transition-colors hover:text-blush">hey@thenycmobilesalon.com</a></li>
              <li className="text-white/80">150 W 47th St, New York, NY 10036</li>
              <li className="text-white/80">All 5 Boroughs, NYC</li>
            </ul>
          </div>
        </div>

        {/* Locations section */}
        <div className="mt-16 border-t border-white/15 pt-12">
          <h4 className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-white/50">Neighborhoods We Serve</h4>
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {Object.entries(neighborhoods).map(([boroughSlug, hoods]) => (
              <div key={boroughSlug}>
                <Link href={`/locations/${boroughSlug}`} className="mb-3 block text-sm font-semibold text-white transition-colors hover:text-blush">
                  {boroughNames[boroughSlug]}
                </Link>
                <ul className="space-y-1">
                  {hoods.map((hood) => (
                    <li key={hood.slug}>
                      <Link href={`/locations/${boroughSlug}/${hood.slug}`} className="text-xs text-white/50 transition-colors hover:text-blush">
                        {hood.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-white/15 pt-8 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} The NYC Mobile Salon. All rights reserved.
        </div>
        <div className="mt-3 text-center">
          <p className="text-[11px] text-white/30">
            Home Services CRM Provided By{" "}
            <a href="https://homeservicesbusinesscrm.com/" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white">
              Full Loop CRM
            </a>
            {" | "}
            <a href="https://homeservicesbusinesscrm.com/" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white">
              Learn More
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
