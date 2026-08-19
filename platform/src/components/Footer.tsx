import Link from "next/link";

const platform = [
  { label: "Features", href: "/full-loop-crm-service-features" },
  { label: "AI Sales", href: "/full-loop-crm-service-features" },
  { label: "Join Waitlist", href: "/#lead-form" },
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
              Full Loop CRM is the{" "}
              <Link
                href="/"
                className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
              >
                home service business CRM
              </Link>{" "}
              that runs the full cycle &mdash; from lead generation to five-star
              reviews, one platform, zero gaps.
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
                  href="https://www.thenycmarketingcompany.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  Created by The NYC Marketing Company
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
                  href="sms:+18445667276"
                  className="transition-colors hover:text-teal-400"
                >
                  Text Us: 1-844-LOOP-CRM
                </a>
              </li>
              <li>
                <a
                  href="tel:+18445667276"
                  className="transition-colors hover:text-teal-400"
                >
                  Call Us: 1-844-LOOP-CRM
                </a>
              </li>
              <li>
                <a
                  href="tel:+18445667276"
                  className="transition-colors hover:text-teal-400"
                >
                  (844) 566-7276
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
                href="https://www.thenycmarketingcompany.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 transition-colors hover:text-white"
              >
                Created by The NYC Marketing Company
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
