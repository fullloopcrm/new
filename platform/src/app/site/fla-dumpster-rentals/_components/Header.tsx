"use client";

import { useState } from "react";
import Link from "next/link";
import { PHONE } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import { getRegions, getNeighborhoodsByRegion, getAllServices } from "@/app/site/fla-dumpster-rentals/_lib/data";
import MegaMenu from "./MegaMenu";
import MobileMenuOverlay from "./MobileMenuOverlay";

const regions = getRegions();
const regionCounts = Object.fromEntries(
  Object.entries(getNeighborhoodsByRegion()).map(([r, ns]) => [r, ns.length])
);
const services = getAllServices().map((s) => ({
  slug: s.slug,
  name: s.name,
  category: s.category,
}));

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl backdrop-saturate-150 shadow-sm">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-zinc-900">
              FLA<span className="text-orange-600">Dumpster</span>Rentals
            </span>
          </Link>

          <MegaMenu
            regions={regions}
            regionCounts={regionCounts}
            phone={PHONE}
            services={services}
            onMobileToggle={() => setMobileOpen((v) => !v)}
            mobileOpen={mobileOpen}
          />
        </div>
      </header>

      {mobileOpen && (
        <MobileMenuOverlay
          regions={regions}
          regionCounts={regionCounts}
          phone={PHONE}
          services={services}
          onClose={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
