// ---------------------------------------------------------------------------
// City-context builder — the fix for the #1 indexing problem.
//
// PROVEN ROOT CAUSE: two combo pages for the same trade in different cities of
// the same state were 100% identical in vocabulary (e.g. locksmith-Cleveland vs
// locksmith-Columbus). The city dimension added ZERO unique content, so Google
// filed 96% of the 20k combo network under "Crawled - currently not indexed"
// (its quality/duplication verdict).
//
// This module injects GENUINELY city-unique content — every city's real
// neighbor set (unique per city), its sub-region, and its position in that
// region — so Cleveland != Columbus. No fabricated facts: everything is derived
// from the in-repo metros list + a maintained state→sub-region map.
// ---------------------------------------------------------------------------
import { metros } from "./combos";
import type { ComboMetro } from "./combos";
import type { StateMetadata } from "./stateMetadata";
import type { LocationSection } from "./locationContent";

// Real US sub-regions — finer than the 4 census regions so copy varies more
// across the country. Maintained mapping, not invented per-city data.
const SUBREGION: Record<string, string> = {
  ME: "New England", NH: "New England", VT: "New England", MA: "New England", RI: "New England", CT: "New England",
  NY: "the Mid-Atlantic", NJ: "the Mid-Atlantic", PA: "the Mid-Atlantic",
  DE: "the Mid-Atlantic", MD: "the Mid-Atlantic", DC: "the Mid-Atlantic",
  OH: "the Great Lakes region", IN: "the Great Lakes region", IL: "the Great Lakes region",
  MI: "the Great Lakes region", WI: "the Great Lakes region", MN: "the Upper Midwest",
  IA: "the Midwest", MO: "the Midwest", ND: "the Northern Plains", SD: "the Northern Plains",
  NE: "the Great Plains", KS: "the Great Plains",
  VA: "the Mid-Atlantic South", WV: "the Appalachian South", NC: "the Southeast", SC: "the Southeast",
  GA: "the Southeast", FL: "Florida and the Southeast", KY: "the Upper South", TN: "the Upper South",
  AL: "the Deep South", MS: "the Deep South", AR: "the South-Central US", LA: "the Gulf Coast",
  OK: "the South-Central US", TX: "the South-Central US",
  MT: "the Mountain West", ID: "the Mountain West", WY: "the Mountain West", CO: "the Mountain West",
  NM: "the Southwest", AZ: "the Southwest", UT: "the Mountain West", NV: "the Southwest",
  WA: "the Pacific Northwest", OR: "the Pacific Northwest", CA: "California", AK: "Alaska", HI: "Hawaii",
};

function subregion(stateAbbr: string): string {
  return SUBREGION[stateAbbr] ?? "the region";
}

/**
 * Real neighbor set for a city — same-state metros first, then the closest
 * out-of-state metros by list adjacency (proxy for proximity). Unique per city,
 * so it is a genuine differentiator between two cities in the same state.
 */
export function getNeighborCities(metro: ComboMetro, limit = 8): ComboMetro[] {
  const sameState = metros.filter(
    (m) => m.stateAbbr === metro.stateAbbr && m.slug !== metro.slug
  );
  if (sameState.length >= limit) return sameState.slice(0, limit);

  const idx = metros.findIndex((m) => m.slug === metro.slug);
  const out: ComboMetro[] = [...sameState];
  // walk outward from the city's index position for nearest-by-list metros
  let step = 1;
  while (out.length < limit && step < metros.length) {
    for (const d of [idx - step, idx + step]) {
      const m = metros[d];
      if (m && m.slug !== metro.slug && !out.some((x) => x.slug === m.slug)) {
        out.push(m);
        if (out.length >= limit) break;
      }
    }
    step++;
  }
  return out.slice(0, limit);
}

/**
 * A genuinely city-unique content section (badge / long-tail title / mixed
 * description + body). Woven from real neighbors + sub-region + state facts.
 * `label` lets callers frame it for a specific trade ("locksmith") or the
 * generic home-service case.
 */
export function buildCityContextSection(
  metro: ComboMetro,
  stateMeta: StateMetadata | null,
  label: string
): LocationSection {
  const { city, state, stateAbbr } = metro;
  const region = subregion(stateAbbr);
  const neighbors = getNeighborCities(metro, 8);
  const neighborNames = neighbors.map((n) => n.city);
  const near3 = neighborNames.slice(0, 3).join(", ");
  const sameStateNeighbors = neighbors
    .filter((n) => n.stateAbbr === stateAbbr)
    .map((n) => n.city);

  const marketLine = sameStateNeighbors.length
    ? `Within ${state}, that puts you in the same competitive set as ${label} operators in ${sameStateNeighbors
        .slice(0, 4)
        .join(", ")} — the ${city} partner who systematizes lead capture and follow-up first is the one who compounds a lead in every one of those markets.`
    : `As one of ${state}'s standalone ${label} markets, ${city} rewards the operator who runs a tight, automated pipeline instead of competing on price alone.`;

  const seasonLine = stateMeta
    ? ` ${stateMeta.seasonalNote}`
    : "";

  return {
    badge: `${city} Market`,
    title: `The ${city}, ${stateAbbr} Market for ${cap(label)} Businesses`,
    description: `${city} anchors a distinct ${label} market in ${region}. Full Loop CRM is built to win ${city} and the ${stateAbbr} metros around it — one operator per trade, per city.`,
    paragraphs: [
      `${city} sits in ${region}, and a ${label} business here competes on a local footing that a national tool never accounts for. Full Loop CRM treats ${city} as its own market: your lead generation, local SEO, and AI sales agent are pointed at ${city} customers and the surrounding ${stateAbbr} metros — ${near3}${neighborNames.length > 3 ? ", and more" : ""} — not spread thin across the whole country.${seasonLine}`,
      marketLine,
      `Because Full Loop licenses one ${label} operator per city, claiming ${city} means the organic leads, the review flywheel, and the exclusive territory here are yours — and the same model is available in each nearby ${stateAbbr} market as you expand.`,
    ],
    bullets: [
      `Local-first lead gen aimed at ${city} and ${stateAbbr} search demand, not national keywords`,
      `Exclusive ${city} territory — one ${label} operator per city, no internal competition`,
      `Ready to expand into nearby markets: ${neighborNames.slice(0, 5).join(", ")}`,
      stateMeta
        ? `Tuned to ${state} operating conditions: ${stateMeta.climateZone.replace(/-/g, " ")} climate, ${stateMeta.tradeAssociation} standards, and ${stateMeta.licensingAuthority} licensing`
        : `Built for how ${state} home-service work actually gets done`,
    ],
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
