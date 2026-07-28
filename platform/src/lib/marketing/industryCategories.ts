// Groups the 51 flat ComboIndustry entries (combos.ts) into real menu
// categories for the nav dropdown. combos.ts has no category field, so this
// is a slug->category lookup maintained by hand — keep in sync if industries
// are added/removed there.
import { industries, type ComboIndustry } from "./combos";

export interface IndustryCategory {
  name: string;
  industries: ComboIndustry[];
}

const CATEGORY_SLUGS: [string, string[]][] = [
  [
    "Cleaning & Maintenance",
    [
      "cleaning-services", "carpet-cleaning", "window-cleaning", "pressure-washing",
      "power-washing", "pool-cleaning", "gutter-cleaning", "chimney-sweep",
      "house-cleaning", "move-in-move-out-cleaning", "post-construction-cleaning",
      "air-duct-cleaning", "dryer-vent-cleaning", "solar-panel-cleaning", "upholstery-cleaning",
    ],
  ],
  [
    "Lawn & Outdoor",
    ["landscaping", "lawn-care", "tree-service", "fencing", "irrigation", "snow-removal"],
  ],
  [
    "Home Repair & Improvement",
    [
      "handyman-services", "painting", "flooring-installation", "drywall-repair",
      "concrete-masonry", "deck-building", "siding-installation", "insulation",
      "stucco-repair", "paving",
    ],
  ],
  [
    "Skilled Trades",
    ["hvac", "plumbing", "electrical", "garage-door-repair", "appliance-repair", "locksmith"],
  ],
  [
    "Restoration & Inspection",
    [
      "roofing", "pest-control", "mold-remediation", "water-damage-restoration",
      "fire-damage-restoration", "septic-services", "home-inspection",
    ],
  ],
  [
    "Removal & Mobile Services",
    [
      "junk-removal", "pet-waste-removal", "mobile-car-detailing", "mobile-pet-grooming",
      "mobile-salon-services", "hauling-services", "demolition",
    ],
  ],
];

export const INDUSTRY_CATEGORIES: IndustryCategory[] = CATEGORY_SLUGS.map(([name, slugs]) => ({
  name,
  industries: slugs
    .map((slug) => industries.find((i) => i.slug === slug))
    .filter((i): i is ComboIndustry => Boolean(i)),
}));

// Dev-time guard: every industry in combos.ts must appear in exactly one
// category, so the nav never silently drops a newly-added industry.
const categorized = new Set(INDUSTRY_CATEGORIES.flatMap((c) => c.industries.map((i) => i.slug)));
export const UNCATEGORIZED_INDUSTRIES = industries.filter((i) => !categorized.has(i.slug));
