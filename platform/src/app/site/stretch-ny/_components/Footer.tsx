import Link from "next/link";
import Image from "next/image";

const serviceLinks = [
  { label: "All Services", href: "/services" },
  { label: "Assisted Stretching", href: "/services/assisted-stretch-service-in-nyc" },
  { label: "PNF Stretching", href: "/services/pnf-stretch-service-in-nyc" },
  { label: "Myofascial Release", href: "/services/myofascial-release-stretch-service-in-nyc" },
  { label: "Recovery Stretching", href: "/services/recovery-stretch-service-in-nyc" },
  { label: "Gentle Stretch (Seniors)", href: "/services/gentle-stretch-service-in-nyc" },
  { label: "Dynamic Stretching", href: "/services/dynamic-stretch-service-in-nyc" },
];

const locationLinks = [
  { label: "All Locations", href: "/locations" },
  { label: "Manhattan", href: "/locations/manhattan" },
  { label: "Brooklyn", href: "/locations/brooklyn" },
  { label: "Queens", href: "/locations/queens" },
  { label: "Bronx", href: "/locations/bronx" },
  { label: "Staten Island", href: "/locations/staten-island" },
  { label: "Parks & Public Spaces", href: "/parks" },
];

const resourceLinks = [
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Discounts", href: "/discounts" },
  { label: "Corporate Wellness", href: "/corporate-wellness" },
  { label: "Hotel Stretching", href: "/hotel-stretching" },
  { label: "Join Our Team", href: "/careers" },
  { label: "Contact", href: "/contact" },
];

const serviceAreaLinks = [
  { label: "Upper East Side", href: "/locations/manhattan/upper-east-side" },
  { label: "Upper West Side", href: "/locations/manhattan/upper-west-side" },
  { label: "Midtown", href: "/locations/manhattan/midtown-east" },
  { label: "Chelsea", href: "/locations/manhattan/chelsea" },
  { label: "SoHo", href: "/locations/manhattan/soho" },
  { label: "TriBeCa", href: "/locations/manhattan/tribeca" },
  { label: "Financial District", href: "/locations/manhattan/financial-district" },
  { label: "Williamsburg", href: "/locations/brooklyn/williamsburg" },
  { label: "DUMBO", href: "/locations/brooklyn/dumbo" },
  { label: "Park Slope", href: "/locations/brooklyn/park-slope" },
  { label: "Astoria", href: "/locations/queens/astoria" },
  { label: "Long Island City", href: "/locations/queens/long-island-city" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-slate-900">
      {/* Gradient top line */}
      <div className="h-px w-full bg-gradient-to-r from-teal-500 to-cyan-500" />

      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        {/* Grid */}
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Company Info */}
          <div>
            <Link href="/" className="inline-flex items-center gap-1">
              <span className="text-xl font-bold tracking-widest text-white">
                STRETCH
              </span>
              <span className="text-xl font-bold tracking-widest text-teal-400">
                NYC
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              NYC&apos;s premier mobile assisted stretching service. Certified
              stretch therapists come to your home, office, hotel, or any
              location across Manhattan, Brooklyn, Queens, Bronx & Staten
              Island.
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-slate-300">
              <a href="sms:+12122027080" className="transition-colors hover:text-teal-400">
                Text: 212.202.7080
              </a>
              <a href="sms:+12122027080" className="transition-colors hover:text-teal-400">
                Call: 212.202.7080
              </a>
              <a href="mailto:hello@stretchny.com" className="transition-colors hover:text-teal-400">
                hello@stretchny.com
              </a>
              <p className="text-slate-400">150 W 47th St, NYC 10036</p>
              <p className="text-slate-400">7AM - 10PM Daily</p>
            </div>
          </div>

          {/* Column 2: Services */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal-400">
              Stretch Services
            </h3>
            <ul className="flex flex-col gap-2.5">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-teal-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="mb-4 mt-8 text-sm font-semibold uppercase tracking-wider text-teal-400">
              Locations
            </h3>
            <ul className="flex flex-col gap-2.5">
              {locationLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-teal-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal-400">
              Resources
            </h3>
            <ul className="flex flex-col gap-2.5">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-teal-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Service Areas */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal-400">
              Popular Service Areas
            </h3>
            <ul className="flex flex-col gap-2.5">
              {serviceAreaLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-teal-400"
                  >
                    {link.label} Stretching
                  </Link>
                </li>
              ))}
            </ul>
            <a
              href="sms:+12122027080"
              className="mt-6 inline-block rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Book Your Stretch
            </a>
          </div>
        </div>

        {/* Legal */}
        <div className="mt-14 border-t border-slate-700/60 pt-8 space-y-4">
          <p className="text-xs leading-relaxed text-slate-400">
            <strong className="text-slate-300">Stretch NYC</strong> is a professional mobile assisted stretching service operating in New York City. Our certified stretch therapists are trained in PNF, Active Isolated Stretching, myofascial release, and other evidence-based techniques. All sessions include professional equipment brought to your location. Results may vary by individual. Stretching is not a substitute for medical treatment — consult your physician if you have a medical condition before beginning any stretching program.
          </p>
          <p className="text-xs leading-relaxed text-slate-400">
            Pricing is subject to change. Weekly program rates require enrollment in recurring weekly sessions. Group and corporate rates are custom-quoted based on group size and frequency. All services are subject to availability. 24-hour cancellation notice required.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 rounded-lg bg-slate-800 px-6 py-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-slate-400">
              &copy; 2021-{year} Stretch NYC. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link href="/legal" className="text-xs text-slate-400 transition-colors hover:text-white">Legal</Link>
              <Link href="/terms" className="text-xs text-slate-400 transition-colors hover:text-white">Terms</Link>
              <Link href="/privacy-policy" className="text-xs text-slate-400 transition-colors hover:text-white">Privacy</Link>
              <Link href="/refund-policy" className="text-xs text-slate-400 transition-colors hover:text-white">Refund</Link>
            </div>
          </div>
        </div>

        <div className="mt-3 text-center">
          <p className="text-[11px] text-slate-500">
            Built and managed by{" "}
            <a
              href="https://homeservicesbusinesscrm.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white"
            >
              Full Loop CRM
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
