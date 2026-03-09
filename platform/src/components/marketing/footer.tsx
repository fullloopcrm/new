import Link from 'next/link'

const platform = [
  { label: 'Features', href: '/full-loop-crm-service-features' },
  { label: 'Pricing', href: '/full-loop-crm-pricing' },
  { label: 'Industries', href: '/full-loop-crm-service-business-industries' },
  { label: 'Why Full Loop?', href: '/why-you-should-choose-full-loop-crm-for-your-business' },
  { label: 'CRM 101', href: '/full-loop-crm-101-educational-tips' },
  { label: 'FAQ', href: '/full-loop-crm-frequently-asked-questions' },
]

const company = [
  { label: 'About', href: '/about-full-loop-crm' },
  { label: 'Partners', href: '/partner-with-full-loop-crm' },
  { label: 'Apply for Partnership', href: '/crm-partnership-request-form' },
  { label: 'Feedback', href: '/feedback' },
]

const topIndustries = [
  { label: 'Cleaning Services CRM', href: '/industry/crm-for-cleaning-service-businesses' },
  { label: 'HVAC CRM', href: '/industry/crm-for-hvac-businesses' },
  { label: 'Plumbing CRM', href: '/industry/crm-for-plumbing-businesses' },
  { label: 'Landscaping CRM', href: '/industry/crm-for-landscaping-businesses' },
  { label: 'Pest Control CRM', href: '/industry/crm-for-pest-control-businesses' },
  { label: 'Electrical CRM', href: '/industry/crm-for-electrical-businesses' },
  { label: 'Painting CRM', href: '/industry/crm-for-painting-businesses' },
  { label: 'Roofing CRM', href: '/industry/crm-for-roofing-businesses' },
]

const topLocations = [
  { label: 'CRM in NYC', href: '/location/home-service-crm-in-nyc' },
  { label: 'CRM in LA', href: '/location/home-service-crm-in-la' },
  { label: 'CRM in Chicago', href: '/location/home-service-crm-in-chicago' },
  { label: 'CRM in Houston', href: '/location/home-service-crm-in-houston' },
  { label: 'CRM in Dallas', href: '/location/home-service-crm-in-dallas' },
  { label: 'CRM in Miami', href: '/location/home-service-crm-in-miami' },
  { label: 'CRM in Atlanta', href: '/location/home-service-crm-in-atl' },
  { label: 'CRM in Phoenix', href: '/location/home-service-crm-in-phoenix' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative bg-slate-900">
      {/* Gradient top line */}
      <div className="h-px w-full bg-gradient-to-r from-green-500 to-emerald-500" />

      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        {/* 6-Column Grid */}
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-6">
          {/* Column 1: Company Info */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-0.5">
              <span className="text-xl font-bold tracking-widest text-white">
                FULL LOOP
              </span>
              <span className="text-xl font-bold tracking-widest text-green-400">
                CRM
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              The first full-cycle CRM for home service businesses. From lead generation to 5-star reviews — one platform, zero gaps.
            </p>
            <div className="mt-6 flex flex-col gap-1.5">
              <a
                href="https://consortiumnyc.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
              >
                Web Design by Consortium NYC
              </a>
              <a
                href="https://thenycseo.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
              >
                SEO &amp; Lead Gen by The NYC SEO
              </a>
            </div>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-green-400">
              Platform
            </h3>
            <ul className="flex flex-col gap-2.5">
              {platform.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-300 transition-colors hover:text-green-400"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-green-400">
              Company
            </h3>
            <ul className="flex flex-col gap-2.5">
              {company.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-300 transition-colors hover:text-green-400"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Contact info */}
            <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-green-400">
              Contact
            </h3>
            <ul className="flex flex-col gap-2.5 text-sm text-slate-300">
              <li>
                <a href="mailto:hello@fullloopcrm.com" className="transition-colors hover:text-green-400">
                  hello@fullloopcrm.com
                </a>
              </li>
              <li>
                <a href="tel:+12122029220" className="transition-colors hover:text-green-400">
                  (212) 202-9220
                </a>
              </li>
              <li>
                <a href="sms:+12122029220" className="transition-colors hover:text-green-400">
                  Text Us
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Top Industries */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-green-400">
              Top Industries
            </h3>
            <ul className="flex flex-col gap-2.5">
              {topIndustries.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-300 transition-colors hover:text-green-400"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/full-loop-crm-service-business-industries"
                  className="text-sm text-green-400 font-medium transition-colors hover:text-green-300"
                >
                  All Industries &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Top Locations */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-green-400">
              Top Locations
            </h3>
            <ul className="flex flex-col gap-2.5">
              {topLocations.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-300 transition-colors hover:text-green-400"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="mt-14 rounded-xl bg-gradient-to-r from-teal-600 to-green-600 px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-white font-bold text-lg font-heading">
              Ready to lock your territory?
            </p>
            <p className="text-teal-100 text-sm">
              One partner per trade per metro. First come, first served.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="tel:+12122029220"
              className="text-white text-sm font-medium underline underline-offset-2 hover:text-teal-100 font-cta"
            >
              Call Now
            </a>
            <Link
              href="/crm-partnership-request-form"
              className="inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-teal-700 hover:bg-teal-50 transition-colors font-cta whitespace-nowrap"
            >
              Apply for Partnership
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 rounded-lg bg-slate-800 px-6 py-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-slate-400">
              &copy; {year} Full Loop CRM. All rights reserved.
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
          <div className="mt-3 flex items-center justify-center gap-4">
            <a
              href="https://consortiumnyc.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-500 transition-colors hover:text-green-400"
            >
              Web Design by Consortium NYC
            </a>
            <span className="text-[11px] text-slate-600">&middot;</span>
            <a
              href="https://thenycseo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-500 transition-colors hover:text-green-400"
            >
              SEO by The NYC SEO
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
