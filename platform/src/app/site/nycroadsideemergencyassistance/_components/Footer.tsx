import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF, EMAIL, HOURS } from "@/app/site/nycroadsideemergencyassistance/_data/content";
import { SERVICES } from "@/app/site/nycroadsideemergencyassistance/_data/services";
import { STATES } from "@/app/site/nycroadsideemergencyassistance/_data/cities";
import { OFFICES } from "@/app/site/nycroadsideemergencyassistance/_data/offices";

// Building labels per borough, aligned to OFFICES order (Manhattan, Brooklyn,
// Queens, Bronx, Staten Island). Kept in the footer file so we don't widen
// the Office interface just for UI copy.
const OFFICE_BUILDING_NAMES: Record<string, string> = {
  manhattan: "Empire State Building",
  brooklyn: "MetroTech Center",
  queens: "One Court Square",
  bronx: "BankNote Building",
  "staten-island": "Corporate Park of Staten Island",
};

const TOP_CITY_LINKS = [
  { name: "Midtown", state: "manhattan", city: "midtown" },
  { name: "Upper East Side", state: "manhattan", city: "upper-east-side" },
  { name: "Williamsburg", state: "brooklyn", city: "williamsburg" },
  { name: "Park Slope", state: "brooklyn", city: "park-slope" },
  { name: "Long Island City", state: "queens", city: "long-island-city" },
  { name: "Astoria", state: "queens", city: "astoria" },
  { name: "Flushing", state: "queens", city: "flushing" },
  { name: "Riverdale", state: "bronx", city: "riverdale" },
  { name: "Mott Haven", state: "bronx", city: "mott-haven" },
  { name: "St. George", state: "staten-island", city: "st-george" },
];

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Dispatch hubs — 5 boroughs across on desktop, stack on mobile */}
        <div className="mb-14 pb-12 border-b border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6 font-cta">
            Dispatch Hubs — All Five Boroughs
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {OFFICES.map((office) => {
              const building = OFFICE_BUILDING_NAMES[office.stateSlug] ?? office.city;
              return (
                <div key={office.stateSlug} className="text-sm">
                  <p className="text-base font-bold text-white font-heading">{office.state}</p>
                  <p className="mt-1 text-sm font-semibold text-yellow-300 font-cta">{building}</p>
                  <p className="mt-2 text-slate-400">{office.address}</p>
                  <p className="text-slate-400">{office.city}, {office.stateAbbr} {office.zip}</p>
                  <p className="mt-2">
                    <a href={office.phoneHref} className="text-yellow-400 font-semibold hover:text-yellow-300 font-cta">
                      {office.phone}
                    </a>
                  </p>
                  <p className="text-xs font-semibold font-cta -mt-0.5">
                    <a href={`sms:${office.phoneHref.replace("tel:", "")}`} className="text-yellow-400 hover:text-yellow-300">Text</a>
                    <span className="text-slate-600 mx-1.5">|</span>
                    <a href={office.phoneHref} className="text-yellow-400 hover:text-yellow-300">Call</a>
                    <span className="text-slate-600 mx-1.5">|</span>
                    <Link href="/book-towing-service-today" className="text-yellow-400 hover:text-yellow-300">Book</Link>
                  </p>
                  <p className="leading-tight mt-2">
                    <a href={`mailto:${office.email}`} className="text-slate-400 hover:text-white transition-colors break-all">
                      <span className="block">{office.email.split("@")[0]}</span>
                      <span className="block">@{office.email.split("@")[1]}</span>
                    </a>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <h3 className="text-xl font-bold tracking-widest font-heading mb-4">
              NYC ROADSIDE<span className="text-yellow-200"> EMERGENCY ASSISTANCE</span>
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              24/7 roadside emergency help across all five NYC boroughs — jump starts, lockouts, flat tires, fuel delivery, accident recovery, winch-outs and full towing. Licensed, insured, flat-rate pricing, 20–40 min typical arrival.
            </p>
            <div className="space-y-1.5 text-sm">
              <p><a href={SMS_HREF} className="text-yellow-400 font-semibold hover:text-yellow-300 font-cta">Text {PHONE}</a></p>
              <p><a href={PHONE_HREF} className="text-yellow-400 font-semibold hover:text-yellow-300 font-cta">Call {PHONE}</a></p>
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
                <Link href="/services" className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors font-cta">All {SERVICES.length} Services →</Link>
              </li>
            </ul>
          </div>

          {/* Top Neighborhoods — linking to actual neighborhood pages */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 font-cta">Popular Neighborhoods</h4>
            <ul className="space-y-2 text-sm">
              {TOP_CITY_LINKS.map((c) => (
                <li key={c.city}>
                  <Link href={`/locations/${c.state}/${c.city}`} className="text-slate-400 hover:text-white transition-colors">
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/locations" className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors font-cta">All Coverage Areas →</Link>
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
              <li><Link href="/answers" className="text-slate-400 hover:text-white transition-colors">Answers (full Q&amp;A)</Link></li>
              <li><Link href="/commercial" className="text-slate-400 hover:text-white transition-colors">Fleet & Commercial</Link></li>
              <li><Link href="/locations" className="text-slate-400 hover:text-white transition-colors">Coverage Areas</Link></li>
              <li><Link href="/streets" className="text-slate-400 hover:text-white transition-colors">Streets We Cover</Link></li>
              <li><Link href="/highways" className="text-slate-400 hover:text-white transition-colors">Highways &amp; Parkways</Link></li>
              <li><Link href="/bridges" className="text-slate-400 hover:text-white transition-colors">Bridges</Link></li>
              <li><Link href="/tunnels" className="text-slate-400 hover:text-white transition-colors">Tunnels</Link></li>
              <li><Link href="/blog" className="text-slate-400 hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="text-slate-400 hover:text-white transition-colors">Drivers & Jobs</Link></li>
              <li><Link href="/franchise" className="text-slate-400 hover:text-white transition-colors">Join Our Fleet</Link></li>
            </ul>
          </div>

          {/* Actions */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 font-cta">Get Started</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/book-towing-service-today" className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors font-cta">Request Roadside Help</Link></li>
              <li><Link href="/contact-nyc-towing-today" className="text-slate-400 hover:text-white transition-colors">Contact Us</Link></li>
              <li><a href={SMS_HREF} className="text-slate-400 hover:text-white transition-colors">Text Us</a></li>
              <li><a href={PHONE_HREF} className="text-slate-400 hover:text-white transition-colors">Call Us</a></li>
            </ul>

            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-6 mb-4 font-cta">Boroughs</h4>
            <ul className="space-y-2 text-sm">
              {STATES.slice(0, 5).map((s) => (
                <li key={s.slug}>
                  <Link href={`/locations/${s.slug}`} className="text-slate-400 hover:text-white transition-colors">{s.name}</Link>
                </li>
              ))}
              <li><Link href="/locations" className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors font-cta">All 5 Boroughs →</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} NYC Roadside Emergency Assistance. All rights reserved.</p>
          <p>Licensed, Bonded &amp; Insured — NYC DCWP Licensed Tow Operator &amp; Roadside Service</p>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 text-center">
          <p>
            Website designed by{" "}
            <a href="https://www.thenycmarketingcompany.com/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors underline">
              The NYC Marketing Company
            </a>
          </p>
          <p>
            CRM by{" "}
            <a href="https://homeservicesbusinesscrm.com/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors underline">
              Full Loop CRM
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}