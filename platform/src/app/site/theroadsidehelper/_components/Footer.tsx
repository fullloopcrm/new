// @ts-nocheck
import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF, EMAIL, HOURS } from "@/app/site/theroadsidehelper/_data/content";
import { SERVICES } from "@/app/site/theroadsidehelper/_data/services";
import { STATES } from "@/app/site/theroadsidehelper/_data/cities";

const TOP_CITY_LINKS = [
  { name: "New York", state: "new-york", city: "new-york-city" },
  { name: "Los Angeles", state: "california", city: "los-angeles" },
  { name: "Chicago", state: "illinois", city: "chicago" },
  { name: "Houston", state: "texas", city: "houston" },
  { name: "Phoenix", state: "arizona", city: "phoenix" },
  { name: "Philadelphia", state: "pennsylvania", city: "philadelphia" },
  { name: "Dallas", state: "texas", city: "dallas" },
  { name: "Miami", state: "florida", city: "miami" },
  { name: "Atlanta", state: "georgia", city: "atlanta" },
  { name: "Denver", state: "colorado", city: "denver" },
];

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <h3 className="text-xl font-bold tracking-widest font-heading mb-4">
              THE ROADSIDE<span className="text-amber-300">HELPER</span>
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              24/7 roadside assistance — jump-starts, flat tires, lockouts, fuel, towing, winch-outs. Flat $149/hr, no membership, no surcharges.
            </p>
            <div className="space-y-1.5 text-sm">
              <p><a href={PHONE_HREF} className="text-amber-300 font-semibold hover:text-amber-200 font-cta">Call {PHONE}</a></p>
              <p><a href={SMS_HREF} className="text-amber-300 font-semibold hover:text-amber-200 font-cta">Text {PHONE}</a></p>
              <p><a href={`mailto:${EMAIL}`} className="text-slate-400 hover:text-white">{EMAIL}</a></p>
              <p className="text-slate-500">{HOURS}</p>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 font-cta">Services</h4>
            <ul className="space-y-2 text-sm">
              {SERVICES.slice(0, 8).map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="text-slate-400 hover:text-white transition-colors">{s.title}</Link>
                </li>
              ))}
              <li>
                <Link href="/services" className="text-amber-300 hover:text-amber-200 font-semibold transition-colors font-cta">All {SERVICES.length} Services →</Link>
              </li>
            </ul>
          </div>

          {/* Top Cities — linking to actual city pages */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 font-cta">Top Cities</h4>
            <ul className="space-y-2 text-sm">
              {TOP_CITY_LINKS.map((c) => (
                <li key={c.city}>
                  <Link href={`/locations/${c.state}/${c.city}`} className="text-slate-400 hover:text-white transition-colors">
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/locations" className="text-amber-300 hover:text-amber-200 font-semibold transition-colors font-cta">All Locations →</Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 font-cta">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-slate-400 hover:text-white transition-colors">About</Link></li>
              <li><Link href="/pricing" className="text-slate-400 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/faq" className="text-slate-400 hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/commercial" className="text-slate-400 hover:text-white transition-colors">Fleet & Commercial</Link></li>
              <li><Link href="/locations" className="text-slate-400 hover:text-white transition-colors">Locations</Link></li>
              <li><Link href="/blog" className="text-slate-400 hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="text-slate-400 hover:text-white transition-colors">Driver Jobs</Link></li>
              <li><Link href="/franchise" className="text-slate-400 hover:text-white transition-colors">Fleet Partners</Link></li>
            </ul>
          </div>

          {/* Actions */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 font-cta">Get Help</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/book-roadside-help-now" className="text-amber-300 hover:text-amber-200 font-semibold transition-colors font-cta">Get Help Now</Link></li>
              <li><Link href="/contact-the-roadside-helper" className="text-slate-400 hover:text-white transition-colors">Contact Us</Link></li>
              <li><a href={PHONE_HREF} className="text-slate-400 hover:text-white transition-colors">Call Us 24/7</a></li>
              <li><a href={SMS_HREF} className="text-slate-400 hover:text-white transition-colors">Text Us</a></li>
            </ul>

            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-6 mb-4 font-cta">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {STATES.slice(0, 5).map((s) => (
                <li key={s.slug}>
                  <Link href={`/locations/${s.slug}`} className="text-slate-400 hover:text-white transition-colors">{s.name}</Link>
                </li>
              ))}
              <li><Link href="/locations" className="text-amber-300 hover:text-amber-200 font-semibold transition-colors font-cta">All 50 States →</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} The Roadside Helper. All rights reserved.</p>
          <p>Licensed, Bonded &amp; Insured in All 50 States</p>
        </div>
      </div>
    </footer>
  );
}