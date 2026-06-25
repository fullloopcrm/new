import Link from "next/link";

const platform = [
  { label: "Features", href: "/full-loop-crm-service-features" },
  { label: "AI Sales", href: "/full-loop-crm-service-features" },
  { label: "Join Waitlist", href: "/waitlist" },
  { label: "Industries", href: "/full-loop-crm-service-business-industries" },
  { label: "CRM 101", href: "/full-loop-crm-101-educational-tips" },
];

const company = [
  { label: "About", href: "/about-full-loop-crm" },
  { label: "Why Full Loop", href: "/why-you-should-choose-full-loop-crm-for-your-business" },
  { label: "Partners", href: "/partner-with-full-loop-crm" },
  { label: "FAQ", href: "/full-loop-crm-frequently-asked-questions" },
  { label: "See Transparent Terms", href: "/agreement" },
];

const topLocations = [
  { label: "New York, NY", href: "/location/home-service-crm-in-nyc" },
  { label: "Los Angeles, CA", href: "/location/home-service-crm-in-la" },
  { label: "Chicago, IL", href: "/location/home-service-crm-in-chicago" },
  { label: "Houston, TX", href: "/location/home-service-crm-in-houston" },
  { label: "Phoenix, AZ", href: "/location/home-service-crm-in-phoenix" },
  { label: "Dallas, TX", href: "/location/home-service-crm-in-dallas" },
  { label: "Miami, FL", href: "/location/home-service-crm-in-miami" },
  { label: "Atlanta, GA", href: "/location/home-service-crm-in-atlanta" },
  { label: "Denver, CO", href: "/location/home-service-crm-in-denver" },
  { label: "San Diego, CA", href: "/location/home-service-crm-in-san-diego" },
  { label: "Austin, TX", href: "/location/home-service-crm-in-austin" },
  { label: "Philadelphia, PA", href: "/location/home-service-crm-in-philly" },
  { label: "Nashville, TN", href: "/location/home-service-crm-in-nashville" },
  { label: "Charlotte, NC", href: "/location/home-service-crm-in-charlotte" },
  { label: "Seattle, WA", href: "/location/home-service-crm-in-seattle" },
  { label: "All 400 Locations", href: "/full-loop-crm-service-business-industries" },
];

const topIndustries = [
  { label: "Cleaning Services", href: "/industry/crm-for-cleaning-service-businesses" },
  { label: "HVAC", href: "/industry/crm-for-hvac-businesses" },
  { label: "Plumbing", href: "/industry/crm-for-plumbing-businesses" },
  { label: "Landscaping", href: "/industry/crm-for-landscaping-businesses" },
  { label: "Pest Control", href: "/industry/crm-for-pest-control-businesses" },
  { label: "Electrical", href: "/industry/crm-for-electrical-businesses" },
  { label: "Roofing", href: "/industry/crm-for-roofing-businesses" },
  { label: "Painting", href: "/industry/crm-for-painting-businesses" },
  { label: "Handyman", href: "/industry/crm-for-handyman-service-businesses" },
  { label: "Lawn Care", href: "/industry/crm-for-lawn-care-businesses" },
  { label: "Junk Removal", href: "/industry/crm-for-junk-removal-businesses" },
  { label: "Pool Cleaning", href: "/industry/crm-for-pool-cleaning-businesses" },
  { label: "All 51 Industries", href: "/full-loop-crm-service-business-industries" },
];

const topCombos = [
  { label: "Cleaning CRM in NYC", href: "/crm-for-cleaning-businesses-in-nyc" },
  { label: "HVAC CRM in Dallas", href: "/crm-for-hvac-businesses-in-dallas" },
  { label: "Plumbing CRM in Houston", href: "/crm-for-plumbing-businesses-in-houston" },
  { label: "Landscaping CRM in LA", href: "/crm-for-landscaping-businesses-in-la" },
  { label: "Pest Control CRM in Miami", href: "/crm-for-pest-control-businesses-in-miami" },
  { label: "Roofing CRM in Denver", href: "/crm-for-roofing-businesses-in-denver" },
  { label: "Painting CRM in Atlanta", href: "/crm-for-painting-businesses-in-atlanta" },
  { label: "Electrical CRM in Phoenix", href: "/crm-for-electrical-businesses-in-phoenix" },
  { label: "Lawn Care CRM in Austin", href: "/crm-for-lawn-care-businesses-in-austin" },
  { label: "Handyman CRM in Chicago", href: "/crm-for-handyman-businesses-in-chicago" },
];

const linkClass = "text-sm text-slate-300 transition-colors hover:text-teal-400";
const linkClassXs = "text-xs text-slate-400 transition-colors hover:text-teal-300";

export default function Footer() {
  return (
    <footer className="relative bg-slate-900">
      {/* Gradient top line */}
      <div className="h-px w-full bg-gradient-to-r from-teal-500 to-cyan-500" />

      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        {/* Top Section: 4-Column Grid */}
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 0: Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-0.5">
              <span className="text-xl font-bold tracking-widest text-white">
                FULL LOOP
              </span>
              <span className="text-xl font-bold tracking-widest text-teal-400">
                {" "}
                CRM
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              The first full-cycle CRM for home service businesses. From lead
              generation to five-star reviews &mdash; one platform, zero gaps.
            </p>
          </div>

          {/* Column 1: Platform */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal-400">
              Platform
            </h3>
            <ul className="flex flex-col gap-2.5">
              {platform.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Company */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal-400">
              Company
            </h3>
            <ul className="flex flex-col gap-2.5">
              {company.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://consortiumnyc.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  Built by Consortium NYC
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal-400">
              Contact
            </h3>
            <ul className="flex flex-col gap-3 text-sm text-slate-300">
              <li>
                <a
                  href="sms:+12122029220"
                  className="transition-colors hover:text-teal-400"
                >
                  Text Us: (212) 202-9220
                </a>
              </li>
              <li>
                <a
                  href="tel:+12122029220"
                  className="transition-colors hover:text-teal-400"
                >
                  Call Us: (212) 202-9220
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@homeservicesbusinesscrm.com"
                  className="transition-colors hover:text-teal-400"
                >
                  hello@homeservicesbusinesscrm.com
                </a>
              </li>
              <li className="leading-relaxed">
                150 W 47th St, New York, NY 10036
              </li>
            </ul>
          </div>
        </div>

        {/* SEO Link Sections */}
        <div className="mt-14 border-t border-slate-800 pt-10">
          {/* Top Locations */}
          <div className="mb-8">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-teal-400">
              Top Locations
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {topLocations.map((item) => (
                <Link key={item.href} href={item.href} className={linkClassXs}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Top Industries */}
          <div className="mb-8">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-teal-400">
              Top Industries
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {topIndustries.map((item) => (
                <Link key={item.href} href={item.href} className={linkClassXs}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Popular CRM + Location Combos */}
          <div className="mb-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-teal-400">
              Popular
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {topCombos.map((item) => (
                <Link key={item.href} href={item.href} className={linkClassXs}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Legal Links */}
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1.5">
          <Link href="/privacy-policy" className={linkClassXs}>Privacy Policy</Link>
          <Link href="/terms" className={linkClassXs}>Terms of Service</Link>
          <Link href="/accessibility" className={linkClassXs}>Accessibility</Link>
          <Link href="/contact" className={linkClassXs}>Contact</Link>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 rounded-lg bg-slate-800 px-6 py-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-slate-400">
              &copy; 2026 Full Loop CRM. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a
                href="https://consortiumnyc.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 transition-colors hover:text-white"
              >
                Built by Consortium NYC
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
