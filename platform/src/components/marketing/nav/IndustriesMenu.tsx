import Link from "next/link";
import { industryPath } from "@/lib/marketing/combos";
import { INDUSTRY_CATEGORIES } from "@/lib/marketing/industryCategories";

const HUB_URL = "/full-loop-crm-service-business-industries";

export function IndustriesDesktopPanel() {
  return (
    <div className="w-[760px] p-5">
      <div className="grid grid-cols-3 gap-x-8 gap-y-5">
        {INDUSTRY_CATEGORIES.map((category) => (
          <div key={category.name}>
            <div
              className="mb-2 text-[10px] font-mono uppercase tracking-[0.14em] pb-1.5 border-b"
              style={{ color: "#A8A8A4", borderColor: "#EDEDE8" }}
            >
              {category.name}
            </div>
            <div className="flex flex-col">
              {category.industries.map((industry) => (
                <Link
                  key={industry.slug}
                  href={industryPath(industry)}
                  className="rounded px-2 py-1.5 text-[13px] transition-colors hover:bg-[#FBFBF8]"
                  style={{ color: "#1C1C1C" }}
                >
                  {industry.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t" style={{ borderColor: "#EDEDE8" }}>
        <Link
          href={HUB_URL}
          className="inline-block px-2 text-[13px] font-semibold transition-colors hover:opacity-70"
          style={{ color: "#1C1C1C" }}
        >
          All 51 Industries &rarr;
        </Link>
      </div>
    </div>
  );
}

export function IndustriesMobileList({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="ml-4 flex flex-col gap-3 border-l-2 pl-3" style={{ borderColor: "#EDEDE8" }}>
      {INDUSTRY_CATEGORIES.map((category) => (
        <div key={category.name}>
          <div className="mb-1 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400">
            {category.name}
          </div>
          <div className="flex flex-col">
            {category.industries.map((industry) => (
              <Link
                key={industry.slug}
                href={industryPath(industry)}
                onClick={onNavigate}
                className="rounded-lg px-2 py-1.5 text-sm text-slate-600 transition-colors hover:text-teal-600"
              >
                {industry.name}
              </Link>
            ))}
          </div>
        </div>
      ))}
      <Link
        href={HUB_URL}
        onClick={onNavigate}
        className="rounded-lg px-2 py-2 text-sm font-semibold text-teal-600"
      >
        All 51 Industries &rarr;
      </Link>
    </div>
  );
}
