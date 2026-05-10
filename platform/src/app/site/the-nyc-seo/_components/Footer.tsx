// @ts-nocheck
import Link from "next/link";
import { PHONE, SITE_NAME } from "@/app/site/the-nyc-seo/_lib/seo";
import { getCategories, getRegions } from "@/app/site/the-nyc-seo/_lib/data";

export default function Footer() {
  const categories = getCategories().slice(0, 8);
  const regions = getRegions();

  return (
    <footer className="border-t border-zinc-200 bg-zinc-900 text-zinc-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <span className="text-xl font-bold text-white">
              The<span className="text-blue-400">NYC</span>SEO
            </span>
            <p className="mt-3 text-sm leading-6">
              Full-service SEO agency helping local businesses rank on Google
              Maps, organic search, and AI platforms across NYC metro.
            </p>
            <a
              href={`tel:${PHONE.replace(/-/g, "")}`}
              className="mt-3 inline-block text-lg font-semibold text-blue-400 hover:text-blue-300"
            >
              {PHONE}
            </a>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Service Categories
            </h3>
            <ul className="mt-4 space-y-2">
              {categories.map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/services#${cat.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm hover:text-white"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
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
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Company
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/about" className="text-sm hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <a
                  href="https://www.consortiumnyc.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-white"
                >
                  Consortium NYC
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-700 pt-8 text-center text-sm">
          <p>
            &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
            A{" "}
            <a
              href="https://www.consortiumnyc.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              Consortium NYC
            </a>{" "}
            property.
          </p>
        </div>
        <div className="mt-3 text-center">
          <p className="text-[11px] text-zinc-600">
            Built and managed by{" "}
            <a
              href="https://www.fullloopcrm.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-white"
            >
              Full Loop CRM
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
