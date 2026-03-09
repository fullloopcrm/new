import Link from "next/link";

const platform = [
  { label: "Features", href: "/full-loop-crm-service-features" },
  { label: "AI Sales", href: "/full-loop-crm-service-features" },
  { label: "Pricing", href: "/full-loop-crm-pricing" },
  { label: "Industries", href: "/full-loop-crm-service-business-industries" },
  { label: "CRM 101", href: "/full-loop-crm-101-educational-tips" },
];

const company = [
  { label: "About", href: "/about-full-loop-crm" },
  { label: "Why Full Loop", href: "/why-you-should-choose-full-loop-crm-for-your-business" },
  { label: "Partners", href: "/partner-with-full-loop-crm" },
  { label: "FAQ", href: "/full-loop-crm-frequently-asked-questions" },
];

export default function Footer() {
  return (
    <footer className="relative bg-slate-900">
      {/* Gradient top line */}
      <div className="h-px w-full bg-gradient-to-r from-teal-500 to-cyan-500" />

      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        {/* 4-Column Grid */}
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
                  <Link
                    href={item.href}
                    className="text-sm text-slate-300 transition-colors hover:text-teal-400"
                  >
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
                  <Link
                    href={item.href}
                    className="text-sm text-slate-300 transition-colors hover:text-teal-400"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://consortiumnyc.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-300 transition-colors hover:text-teal-400"
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
                  href="mailto:hello@fullloopcrm.com"
                  className="transition-colors hover:text-teal-400"
                >
                  hello@fullloopcrm.com
                </a>
              </li>
              <li className="leading-relaxed">
                150 W 47th St, New York, NY 10036
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 rounded-lg bg-slate-800 px-6 py-4">
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
