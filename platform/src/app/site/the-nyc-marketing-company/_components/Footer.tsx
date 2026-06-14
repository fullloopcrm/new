// @ts-nocheck
import Link from "next/link";
import { BrandLink } from "@/app/site/the-nyc-marketing-company/_lib/brand";

const services = [
  { label: "SEO", slug: "seo" },
  { label: "Web Design", slug: "web-design" },
  { label: "Branding", slug: "branding" },
  { label: "Digital Strategy", slug: "digital-strategy" },
  { label: "Business Development", slug: "business-development" },
  { label: "Automation", slug: "automation" },
];

const areas = [
  { label: "Manhattan", slug: "manhattan" },
  { label: "Brooklyn", slug: "brooklyn" },
  { label: "Queens", slug: "queens" },
  { label: "Bronx", slug: "bronx" },
  { label: "Staten Island", slug: "staten-island" },
  { label: "Long Island", slug: "long-island" },
  { label: "Westchester", slug: "westchester" },
];

const socials = [
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "Instagram", href: "https://instagram.com" },
  { label: "Facebook", href: "https://facebook.com" },
  { label: "Twitter", href: "https://twitter.com" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-slate-900">
      {/* Gradient top line */}
      <div className="h-px w-full bg-gradient-to-r from-teal-500 to-cyan-500" />

      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        {/* 4-Column Grid */}
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Company Info */}
          <div>
            <Link href="/" className="inline-flex items-center gap-0.5">
              <span className="text-lg font-bold tracking-widest text-white leading-tight">
                CONSORTIUM NYC<br />
                <span className="text-xs font-semibold tracking-wide text-white/80">
                  w/ THE NYC MARKETING CO
                </span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              A NYC marketing company helping brands dominate the
              digital landscape across New York City and beyond.
            </p>
            {/* Social Links */}
            <div className="mt-6 flex flex-wrap gap-4">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Services */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal-400">
              Services
            </h3>
            <ul className="flex flex-col gap-2.5">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="text-sm text-slate-300 transition-colors hover:text-teal-400"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Areas */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal-400">
              Areas We Serve
            </h3>
            <ul className="flex flex-col gap-2.5">
              {areas.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/services-areas-we-offer-marketing-services-in/${a.slug}`}
                    className="text-sm text-slate-300 transition-colors hover:text-teal-400"
                  >
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal-400">
              Contact
            </h3>
            <ul className="flex flex-col gap-3 text-sm text-slate-300">
              <li>
                <a
                  href="mailto:hello@consortiumnyc.com"
                  className="transition-colors hover:text-teal-400"
                >
                  hello@consortiumnyc.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+12122029220"
                  className="transition-colors hover:text-teal-400"
                >
                  (212) 202-9220
                </a>
              </li>
              <li className="leading-relaxed">
                New York, NY
              </li>
            </ul>
            <Link
              href="https://www.thenycmarketingcompany.com/contact"
              className="mt-6 inline-block rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Get in Touch
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 rounded-lg bg-slate-800 px-6 py-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-slate-400">
              &copy; {year} <BrandLink />. All rights reserved.
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
              <Link
                href="/accessibility"
                className="text-xs text-slate-400 transition-colors hover:text-white"
              >
                Accessibility
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