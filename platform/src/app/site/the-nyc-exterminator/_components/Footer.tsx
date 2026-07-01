import Link from "next/link";
import { PHONE, SITE_NAME, EMAIL, ADDRESS } from "@/app/site/the-nyc-exterminator/_lib/seo";
import { getCategories, getRegions } from "@/app/site/the-nyc-exterminator/_lib/data";

export default function Footer() {
  const categories = getCategories().slice(0, 8);
  const regions = getRegions();

  return (
    <footer className="border-t border-white/[0.06] bg-[#050505]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <span className="text-xl font-bold text-white">
              The<span className="text-green-500">NYC</span>Exterminator
            </span>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Professional pest control and extermination services across NYC,
              NJ, Long Island & Westchester. Licensed, insured, and trusted
              by thousands of residential and commercial properties.
            </p>
            <div className="mt-4 space-y-1 text-sm">
              <a
                href={`sms:${PHONE.replace(/-/g, "")}`}
                className="block font-semibold text-green-400 hover:text-green-300"
              >
                Text {PHONE}
              </a>
              <a
                href={`mailto:${EMAIL}`}
                className="block text-zinc-500 hover:text-white"
              >
                {EMAIL}
              </a>
              <p className="text-zinc-600">
                {ADDRESS.street}, {ADDRESS.city}, {ADDRESS.state} {ADDRESS.zip}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Services
            </h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/cockroach-extermination" className="text-sm text-zinc-500 transition-colors hover:text-white">Cockroach Extermination</Link></li>
              <li><Link href="/bed-bug-treatment" className="text-sm text-zinc-500 transition-colors hover:text-white">Bed Bug Treatment</Link></li>
              <li><Link href="/rat-extermination" className="text-sm text-zinc-500 transition-colors hover:text-white">Rat Extermination</Link></li>
              <li><Link href="/mouse-extermination" className="text-sm text-zinc-500 transition-colors hover:text-white">Mouse Extermination</Link></li>
              <li><Link href="/termite-treatment" className="text-sm text-zinc-500 transition-colors hover:text-white">Termite Treatment</Link></li>
              <li><Link href="/general-pest-control" className="text-sm text-zinc-500 transition-colors hover:text-white">General Pest Control</Link></li>
              <li><Link href="/services" className="text-sm font-medium text-green-400 hover:text-green-300">All Services &rarr;</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Service Areas
            </h3>
            <ul className="mt-4 space-y-2">
              {regions.map((region) => (
                <li key={region}>
                  <Link
                    href={`/areas#${region.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm text-zinc-500 transition-colors hover:text-white"
                  >
                    {region}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Company
            </h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/about" className="text-sm text-zinc-500 transition-colors hover:text-white">About Us</Link></li>
              <li><Link href="/pricing" className="text-sm text-zinc-500 transition-colors hover:text-white">Pricing</Link></li>
              <li><Link href="/reviews" className="text-sm text-zinc-500 transition-colors hover:text-white">Reviews</Link></li>
              <li><Link href="/faq" className="text-sm text-zinc-500 transition-colors hover:text-white">FAQ</Link></li>
              <li><Link href="/careers" className="text-sm text-zinc-500 transition-colors hover:text-white">Careers</Link></li>
              <li><Link href="/contact" className="text-sm text-zinc-500 transition-colors hover:text-white">Contact</Link></li>
              <li><Link href="/book-exterminator-today" className="text-sm font-medium text-green-400 hover:text-green-300">Book &amp; Save $10 &rarr;</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/[0.06] pt-8 text-center text-sm text-zinc-600">
          <p>
            &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
            Licensed pest control serving NYC, NJ, Long Island &amp; Westchester.
          </p>
          <p className="mt-2 text-xs text-zinc-700">
            Branding &amp; Digital Marketing by{" "}
            <a
              href="https://www.consortiumnyc.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-white"
            >
              Consortium NYC
            </a>
            {" "}&middot;{" "}
            NYC SEO by{" "}
            <a
              href="https://www.thenycseo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-white"
            >
              The NYC SEO
            </a>
          </p>
          <p className="mt-2 text-[11px] text-zinc-700">
            Built and managed by{" "}
            <a
              href="https://homeservicesbusinesscrm.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-white"
            >
              Full Loop CRM
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
