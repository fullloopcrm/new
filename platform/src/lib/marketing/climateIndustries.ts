import type { StateMetadata } from "./stateMetadata";

// 2026-08-19: which of the 51 industry slugs (see combos.ts) are genuinely
// more relevant to a given climate zone — real regional demand signal, not
// decoration. Used to pick which trades a location page features first,
// instead of a slug-hash that ignores whether the trade even makes sense in
// that climate (snow removal in Miami, pool cleaning in Fairbanks).
type ClimateZone = StateMetadata["climateZone"];

export const CLIMATE_RELEVANT_INDUSTRIES: Record<ClimateZone, string[]> = {
  "very-cold": ["snow-removal", "hvac", "chimney-sweep", "insulation", "roofing", "gutter-cleaning"],
  "cold": ["snow-removal", "hvac", "gutter-cleaning", "chimney-sweep", "roofing", "insulation"],
  "hot-humid": ["pool-cleaning", "pest-control", "mold-remediation", "water-damage-restoration", "irrigation", "roofing"],
  "hot-dry": ["pool-cleaning", "irrigation", "pest-control", "solar-panel-cleaning", "landscaping", "stucco-repair"],
  "mixed-humid": ["pest-control", "gutter-cleaning", "mold-remediation", "roofing", "landscaping", "lawn-care"],
  "marine": ["mold-remediation", "gutter-cleaning", "roofing", "pressure-washing", "window-cleaning", "power-washing"],
};

/**
 * Regionally-relevant industries first, deterministically filled out with
 * the rest of the catalog so every city still gets variety, not just the
 * same 5-6 climate-relevant trades repeated across every same-zone city.
 */
export function climateAwareFeaturedIndustries<T extends { slug: string }>(
  allIndustries: T[],
  climateZone: ClimateZone | undefined,
  citySlugForSeed: string,
  count: number
): T[] {
  const relevantSlugs = climateZone ? CLIMATE_RELEVANT_INDUSTRIES[climateZone] : [];
  const bySlug = new Map(allIndustries.map((i) => [i.slug, i]));

  const relevant = relevantSlugs
    .map((slug) => bySlug.get(slug))
    .filter((i): i is T => Boolean(i));

  const start = citySlugForSeed.charCodeAt(0) % allIndustries.length;
  const seen = new Set(relevant.map((i) => i.slug));
  const fill: T[] = [];
  for (let i = 0; fill.length < count && i < allIndustries.length; i++) {
    const candidate = allIndustries[(start + i * 7) % allIndustries.length];
    if (!seen.has(candidate.slug)) {
      seen.add(candidate.slug);
      fill.push(candidate);
    }
  }

  return [...relevant, ...fill].slice(0, count);
}
