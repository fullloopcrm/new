// @ts-nocheck
import Link from "next/link";

const serviceLinks = [
  { label: "All Design Services", href: "/services" },
  { label: "Full Home Interior Design", href: "/services/full-home-interior-design" },
  { label: "Kitchen Design", href: "/services/kitchen-design" },
  { label: "Bathroom Design", href: "/services/bathroom-design" },
  { label: "Living Room Design", href: "/services/living-room-design" },
  { label: "Commercial Interior Design", href: "/services/commercial-interior-design" },
  { label: "Space Planning", href: "/services/space-planning" },
];

const constructionLinks = [
  { label: "All Construction", href: "/services" },
  { label: "Kitchen Renovation", href: "/services/kitchen-renovation" },
  { label: "Bathroom Renovation", href: "/services/bathroom-renovation" },
  { label: "General Contracting", href: "/services/general-contracting" },
  { label: "Painting & Finishing", href: "/services/painting-services" },
  { label: "Flooring Installation", href: "/services/flooring-installation" },
  { label: "Electrical Services", href: "/services/electrical-services" },
];

const resourceLinks = [
  { label: "All Areas", href: "/areas" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];


export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-slate-900">
      {/* Gradient top line */}
      <div className="h-px w-full bg-blue-500" />

      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        {/* 5-Column Grid */}
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-5">
          {/* Column 1: Company Info */}
          <div>
            <Link href="/" className="inline-flex items-center gap-1">
              <span className="text-xl font-bold tracking-widest text-white">
                THE NYC
              </span>
              <span className="text-xl font-bold tracking-widest text-blue-400">
                INTERIOR DESIGNER
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Professional NYC interior design services — full home design,
              kitchen and bathroom remodels, space planning, and commercial
              interiors for residential and commercial properties across all
              five boroughs and beyond.
            </p>
          </div>

          {/* Column 2: Design Services */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-400">
              Design Services
            </h3>
            <ul className="flex flex-col gap-2.5">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-blue-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Construction */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-400">
              Construction
            </h3>
            <ul className="flex flex-col gap-2.5">
              {constructionLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-blue-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Resources */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-400">
              Resources
            </h3>
            <ul className="flex flex-col gap-2.5">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-blue-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-400">
              Contact
            </h3>
            <ul className="flex flex-col gap-3 text-sm text-slate-300">
              <li>
                <a
                  href="tel:+19174732013"
                  className="transition-colors hover:text-blue-400"
                >
                  (917) 473-2013
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@thenycinteriordesigner.com"
                  className="transition-colors hover:text-blue-400"
                >
                  hello@thenycinteriordesigner.com
                </a>
              </li>
              <li className="leading-relaxed">
                <a href="https://maps.google.com/?q=150+W+47th+St+New+York+NY+10036" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-blue-400">
                  150 W 47th St<br />
                  New York, NY 10036
                </a>
              </li>
            </ul>
            <Link
              href="/contact"
              className="mt-6 inline-block rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
            >
              Get a Free Consultation
            </Link>
          </div>
        </div>

        {/* Legal Disclaimers */}
        <div className="mt-14 border-t border-slate-700/60 pt-8 space-y-4">
          <p className="text-xs leading-relaxed text-slate-400">
            <strong className="text-slate-300">The NYC Interior Designer</strong> is a fully licensed and insured interior design firm serving the New York City metropolitan area. We carry full general liability insurance and workers&apos; compensation coverage for the protection of our clients and team. All work is performed in compliance with New York City building codes and local municipal regulations.
          </p>
          <p className="text-xs leading-relaxed text-slate-400">
            Project timelines, pricing, and scope of work are provided as estimates and may vary based on site conditions, permit requirements, material availability, and design complexity. Final pricing is confirmed in writing before any work begins. All projects are backed by our design satisfaction guarantee.
          </p>
          <p className="text-xs leading-relaxed text-slate-400">
            The information on this website is for general informational purposes only and does not constitute a binding contract or guarantee of services. Photos and renderings shown may represent completed projects or design concepts. Results may vary based on individual property conditions. By submitting your information, you consent to being contacted by our team by phone, email, or text message regarding your interior design inquiry. Consent is not required to receive services.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 rounded-lg bg-slate-800 px-6 py-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-slate-400">
              &copy; {year} The NYC Interior Designer. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link
                href="/privacy-policy"
                className="text-xs text-slate-400 transition-colors hover:text-white"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-xs text-slate-400 transition-colors hover:text-white"
              >
                Terms of Service
              </Link>
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
