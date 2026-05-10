// @ts-nocheck
import Link from "next/link";

const serviceLinks = [
  { label: "All Services", href: "/services" },
  { label: "DSCR Loans", href: "/services/dscr-loans" },
  { label: "Short-Term Rentals", href: "/services/dscr-loans-short-term-rentals" },
  { label: "Multi-Family", href: "/services/dscr-loans-multi-family" },
  { label: "Cash-Out Refinance", href: "/services/dscr-cash-out-refinance" },
  { label: "BRRRR / Fix & Rent", href: "/services/dscr-loans-fix-and-rent-brrrr" },
  { label: "Foreign Nationals", href: "/services/dscr-loans-foreign-nationals" },
];

const resourceLinks = [
  { label: "All Locations", href: "/locations" },
  { label: "Calculator", href: "/calculator" },
  { label: "FAQ", href: "/faq" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
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
            <Link href="/" className="inline-flex items-center gap-1">
              <span className="text-xl font-bold tracking-widest text-white">
                DSCR
              </span>
              <span className="text-xl font-bold tracking-widest text-teal-400">
                LOANS
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Your complete guide to DSCR loans — debt service coverage ratio
              knowledge, tips, and lender connections for real estate investors
              across 600+ cities nationwide.
            </p>
          </div>

          {/* Column 2: Services */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal-400">
              Services
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

          {/* Column 4: Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-teal-400">
              Contact
            </h3>
            <ul className="flex flex-col gap-3 text-sm text-slate-300">
              <li>
                <a
                  href="sms:+18553003727"
                  className="transition-colors hover:text-teal-400"
                >
                  (855) 300-DSCR (3727) | Text
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@debtserviceratioloan.com"
                  className="transition-colors hover:text-teal-400"
                >
                  hello@debtserviceratioloan.com
                </a>
              </li>
              <li className="leading-relaxed">
                <a href="https://maps.google.com/?q=477+Madison+Ave+New+York+NY+10022" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-teal-400">
                  477 Madison Ave<br />
                  New York, NY 10022
                </a>
              </li>
              <li className="leading-relaxed">
                <a href="https://maps.google.com/?q=5901+NW+183rd+St+Miami+Gardens+FL+33015" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-teal-400">
                  5901 NW 183rd St<br />
                  Miami Gardens, FL 33015
                </a>
              </li>
              <li className="leading-relaxed">
                <a href="https://maps.google.com/?q=1100+Poydras+St+New+Orleans+LA+70163" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-teal-400">
                  1100 Poydras St Building<br />
                  New Orleans, LA 70163
                </a>
              </li>
              <li className="leading-relaxed">
                <a href="https://maps.google.com/?q=7457+Harwin+Dr+Houston+TX+77036" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-teal-400">
                  7457 Harwin Dr<br />
                  Houston, TX 77036
                </a>
              </li>
              <li className="leading-relaxed">
                <a href="https://maps.google.com/?q=801+S+Figueroa+St+Los+Angeles+CA+90017" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-teal-400">
                  801 S Figueroa St<br />
                  Los Angeles, CA 90017
                </a>
              </li>
              <li className="leading-relaxed">
                <a href="https://maps.google.com/?q=254+Commercial+St+Portland+ME+04101" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-teal-400">
                  254 Commercial St<br />
                  Portland, ME 04101
                </a>
              </li>
            </ul>
            <Link
              href="/contact"
              className="mt-6 inline-block rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Get in Touch
            </Link>
          </div>
        </div>

        {/* Legal Disclaimers */}
        <div className="mt-14 border-t border-slate-700/60 pt-8 space-y-4">
          <p className="text-xs leading-relaxed text-slate-400">
            <strong className="text-slate-300">DebtServiceRatioLoan.com</strong> is a marketing platform and is not a lender, bank, or mortgage broker. We do not make loans, issue pre-approvals, lock rates, or make credit decisions. Our role is limited to connecting consumers with independently licensed mortgage professionals who specialize in DSCR (Debt Service Coverage Ratio) loans and investment property financing. All loan applications are subject to credit approval by the participating lender. Not all applicants will qualify. Loan terms, rates, and product availability vary by lender and by state and are subject to change without notice.
          </p>
          <p className="text-xs leading-relaxed text-slate-400">
            This website is not registered with the Nationwide Multistate Licensing System (NMLS). All mortgage lending and brokerage services are provided by licensed professionals who maintain their own NMLS registrations. Verify any mortgage professional&apos;s license at{" "}
            <a href="https://www.nmlsconsumeraccess.org" target="_blank" rel="noopener noreferrer" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">nmlsconsumeraccess.org</a>.
          </p>
          <p className="text-xs leading-relaxed text-slate-400">
            The information on this website is for general informational and marketing purposes only and does not constitute financial advice, an offer to lend, or a solicitation. Any loan scenarios, examples, or estimates are hypothetical and for illustrative purposes only. By submitting your information, you consent to being contacted by licensed mortgage professionals by phone, email, or text message, including through automated means. Consent is not required to purchase any service. Message and data rates may apply.
          </p>
          <p className="text-xs leading-relaxed text-slate-400">
            <strong className="text-slate-300">Equal Housing Opportunity.</strong> All participating lenders are Equal Housing Lenders and do not discriminate on the basis of race, color, religion, national origin, sex, familial status, disability, or any other class protected by applicable federal, state, or local law.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 rounded-lg bg-slate-800 px-6 py-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-slate-400">
              &copy; {year} DebtServiceRatioLoan.com. All rights reserved.
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
              href="https://www.fullloopcrm.com/"
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
