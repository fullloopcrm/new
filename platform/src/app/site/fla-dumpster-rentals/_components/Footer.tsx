// @ts-nocheck
import Link from "next/link";
import { PHONE, SITE_NAME, EMAIL, ADDRESS } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import { getRegions } from "@/app/site/fla-dumpster-rentals/_lib/data";

export default function Footer() {
  const regions = getRegions();

  return (
    <footer className="border-t border-stone-800 bg-stone-950 text-stone-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <span className="text-xl font-bold text-white">
              FLA<span className="text-orange-400">Dumpster</span>Rentals
            </span>
            <p className="mt-3 text-sm leading-6">
              We serve homeowners, contractors, and businesses across Florida by
              evaluating disposal needs and coordinating waste removal services,
              including providing 10, 20 &amp; 30 yard{" "}
              <Link href="/dumpster-sizes" className="text-orange-400 hover:text-orange-300">roll-off dumpster</Link>{" "}
              equipment for{" "}
              <Link href="/construction-dumpster-rental" className="text-orange-400 hover:text-orange-300">construction</Link>,{" "}
              <Link href="/junk-removal-dumpster-rental" className="text-orange-400 hover:text-orange-300">junk removal</Link>,{" "}
              <Link href="/residential-dumpster-rental" className="text-orange-400 hover:text-orange-300">cleanouts</Link> &amp; more.
            </p>
            <a
              href={`tel:${PHONE.replace(/-/g, "")}`}
              className="mt-3 inline-block text-lg font-semibold text-orange-400 hover:text-orange-300"
            >
              {PHONE}
            </a>
            <p className="mt-2 text-sm">{EMAIL}</p>
            <p className="mt-1 text-sm">{ADDRESS}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-300">
              Services
            </h3>
            <ul className="mt-4 space-y-2">
              {[
                { name: "Construction Dumpster Rental", href: "/construction-dumpster-rental" },
                { name: "Residential Dumpster Rental", href: "/residential-dumpster-rental" },
                { name: "Commercial Dumpster Rental", href: "/commercial-dumpster-rental" },
                { name: "Roofing Dumpster Rental", href: "/roofing-dumpster-rental" },
                { name: "Renovation Dumpster Rental", href: "/renovation-dumpster-rental" },
                { name: "Junk Removal Dumpster Rental", href: "/junk-removal-dumpster-rental" },
                { name: "Storm Debris Dumpster Rental", href: "/storm-debris-dumpster-rental" },
                { name: "Landscaping Dumpster Rental", href: "/landscaping-dumpster-rental" },
              ].map((svc) => (
                <li key={svc.href}>
                  <Link href={svc.href} className="text-sm hover:text-white">
                    {svc.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-300">
              Service Areas
            </h3>
            <ul className="mt-4 space-y-2">
              {regions.map((region) => (
                <li key={region}>
                  <Link
                    href={`/areas#${region.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm hover:text-white"
                  >
                    {region}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-300">
              Company
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/about" className="text-sm hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/dumpster-sizes" className="text-sm hover:text-white">
                  Dumpster Sizes
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-sm hover:text-white">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/broker-service" className="text-sm hover:text-white">
                  Broker Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm hover:text-white">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-stone-700 pt-8 text-sm space-y-4">
          <p className="mx-auto max-w-4xl text-center leading-6 text-stone-400">
            We serve homeowners, contractors, and businesses by evaluating their
            disposal needs and coordinating waste removal services, including
            providing the necessary dumpster equipment.{" "}
            <Link href="/dumpster-sizes" className="text-orange-400 hover:text-orange-300">Dumpster sizes</Link>{" "}
            include 10, 20 &amp; 30 yard roll-off containers for{" "}
            <Link href="/construction-dumpster-rental" className="text-orange-400 hover:text-orange-300">construction</Link>,{" "}
            <Link href="/roofing-dumpster-rental" className="text-orange-400 hover:text-orange-300">roofing</Link>,{" "}
            <Link href="/renovation-dumpster-rental" className="text-orange-400 hover:text-orange-300">renovation</Link>,{" "}
            <Link href="/junk-removal-dumpster-rental" className="text-orange-400 hover:text-orange-300">junk removal</Link>,{" "}
            <Link href="/storm-debris-dumpster-rental" className="text-orange-400 hover:text-orange-300">storm debris</Link>,{" "}
            <Link href="/landscaping-dumpster-rental" className="text-orange-400 hover:text-orange-300">landscaping</Link>,{" "}
            and <Link href="/residential-dumpster-rental" className="text-orange-400 hover:text-orange-300">residential cleanouts</Link>.{" "}
            View our <Link href="/pricing" className="text-orange-400 hover:text-orange-300">flat-rate pricing</Link>,{" "}
            learn <Link href="/how-it-works" className="text-orange-400 hover:text-orange-300">how it works</Link>,{" "}
            or <Link href="/schedule-dumpster-rental-form" className="text-orange-400 hover:text-orange-300">book your dumpster online</Link>.{" "}
            Same-day delivery available across <Link href="/areas" className="text-orange-400 hover:text-orange-300">436+ Florida service areas</Link>.
          </p>
          <p className="text-center text-stone-400">
            &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
            {" "}&middot;{" "}
            Web design &amp; digital marketing by{" "}
            <a
              href="https://www.consortiumnyc.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-white"
            >
              Destin Digital Marketing Agency
            </a>
            . SEO managed by{" "}
            <a
              href="https://www.thenycseo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-white"
            >
              The NYC SEO
            </a>
            .
          </p>
          <p className="mt-2 text-center text-[11px] text-stone-500">
            Built and managed by{" "}
            <a
              href="https://www.fullloopcrm.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-white"
            >
              Full Loop CRM
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
