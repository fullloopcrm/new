import Link from "next/link";
import { PHONE } from "@/app/site/the-nyc-seo/_lib/seo";
import { getCategories, getRegions, getNeighborhoodsByRegion } from "@/app/site/the-nyc-seo/_lib/data";
import MegaMenu from "./MegaMenu";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-zinc-900">
            The<span className="text-blue-600">NYC</span>SEO
          </span>
        </Link>

        <MegaMenu
          categories={getCategories()}
          regions={getRegions()}
          regionCounts={Object.fromEntries(
            Object.entries(getNeighborhoodsByRegion()).map(([r, ns]) => [r, ns.length])
          )}
          phone={PHONE}
        />
      </div>
    </header>
  );
}
