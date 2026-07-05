import type { ReactNode } from "react";
import Link from "next/link";

import { SERVICES, type Service } from "./services";

/**
 * Known phrase → href map. The replacement walks a paragraph once left→right,
 * finds the earliest remaining phrase match, emits a <Link> for it, and then
 * continues with the rest of the paragraph.
 *
 * Phrases are matched case-insensitively as word-bounded hits. Each phrase is
 * capped at one <Link> per paragraph so we don't over-link.
 */
const PHRASE_LINKS: Array<[RegExp, string]> = [
  // Core services
  [/\b(flatbed towing|flatbed tow|flatbed)\b/i, "/services/flatbed-towing"],
  [/\b(heavy[- ]duty(?: towing)?)\b/i, "/services/heavy-duty-towing"],
  [/\b(light[- ]duty(?: towing)?)\b/i, "/services/light-duty-towing"],
  [/\bmotorcycle(?: towing)?\b/i, "/services/motorcycle-towing"],
  [/\b(accident recovery|collision tow)\b/i, "/services/accident-recovery"],
  [/\b(long[- ]distance towing|long[- ]distance)\b/i, "/services/long-distance-towing"],
  [/\b(RV|motorhome)\b/, "/services/rv-motorhome-towing"],
  [/\broadside assistance\b/i, "/services/roadside-assistance"],
  [/\b(jump[- ]start|jumpstart|dead battery)\b/i, "/services/jump-start"],
  [/\bbattery replacement\b/i, "/services/battery-replacement"],
  [/\bgas delivery\b/i, "/services/gas-delivery"],
  [/\b(flat tire(?: change)?|tire change)\b/i, "/services/flat-tire-change"],
  [/\blockout(?: service)?\b/i, "/services/lockout-service"],
  [/\b(winch[- ]out|winch-out recovery)\b/i, "/services/winch-out-recovery"],
  [/\b(winter|snow) extraction\b/i, "/services/winter-snow-extraction"],
  [/\bmobile mechanic\b/i, "/services/mobile-mechanic-on-site-repairs"],
  [/\bjunk car(?: removal)?\b/i, "/services/junk-car-removal"],
  [/\billegally parked\b/i, "/services/illegally-parked-towing"],
  [/\bimpound recovery\b/i, "/services/impound-recovery"],
  [/\babandoned vehicle\b/i, "/services/abandoned-vehicle-removal"],
  [/\b(EV|Tesla)\b/, "/services/ev-tesla-towing"],
  [/\b(luxury|exotic)\b/i, "/services/luxury-exotic-towing"],
  [/\binsurance claim\b/i, "/services/insurance-claim-towing"],
  [/\b(body shop|auto body|collision delivery)\b/i, "/services/auto-body-collision-delivery"],
  [/\bboat trailer\b/i, "/services/boat-trailer-towing"],
  [/\b(classic|antique) car\b/i, "/services/classic-antique-car-transport"],
  [/\bfleet(?: account| towing)?\b/i, "/services/fleet-towing"],
  [/\bcommercial(?: towing| vehicle)?\b/i, "/services/commercial-towing"],
  [/\b(24\/7|emergency) (tow|towing|dispatch)\b/i, "/services/emergency-247-towing"],
  [/\bdealer(?: auto)? transport\b/i, "/services/dealer-auto-transport"],

  // Boroughs
  [/\bManhattan\b/, "/locations/manhattan"],
  [/\bBrooklyn\b/, "/locations/brooklyn"],
  [/\bQueens\b/, "/locations/queens"],
  [/\bStaten Island\b/, "/locations/staten-island"],
  [/\bthe Bronx\b/, "/locations/bronx"],

  // Neighborhoods
  [/\bUpper East Side\b/, "/locations/manhattan/upper-east-side"],
  [/\bUpper West Side\b/, "/locations/manhattan/upper-west-side"],
  [/\bWest Village\b/, "/locations/manhattan/west-village"],
  [/\bEast Village\b/, "/locations/manhattan/east-village"],
  [/\bMidtown\b/, "/locations/manhattan/midtown"],
  [/\bTribeca\b/, "/locations/manhattan/tribeca"],
  [/\bSoHo\b/, "/locations/manhattan/soho"],
  [/\bHarlem\b/, "/locations/manhattan/harlem"],
  [/\bPark Slope\b/, "/locations/brooklyn/park-slope"],
  [/\bWilliamsburg\b/, "/locations/brooklyn/williamsburg"],
  [/\bBushwick\b/, "/locations/brooklyn/bushwick"],
  [/\bBay Ridge\b/, "/locations/brooklyn/bay-ridge"],
  [/\bDUMBO\b/, "/locations/brooklyn/dumbo"],
  [/\bBrooklyn Heights\b/, "/locations/brooklyn/brooklyn-heights"],
  [/\bRed Hook\b/, "/locations/brooklyn/red-hook"],
  [/\bGowanus\b/, "/locations/brooklyn/gowanus"],
  [/\bLong Island City\b/, "/locations/queens/long-island-city"],
  [/\bAstoria\b/, "/locations/queens/astoria"],
  [/\bFlushing\b/, "/locations/queens/flushing"],
  [/\bJamaica\b/, "/locations/queens/jamaica"],
  [/\bForest Hills\b/, "/locations/queens/forest-hills"],
  [/\bRiverdale\b/, "/locations/bronx/riverdale"],
  [/\bHunts Point\b/, "/locations/bronx/hunts-point"],
  [/\bMott Haven\b/, "/locations/bronx/mott-haven"],
  [/\bTodt Hill\b/, "/locations/staten-island/todt-hill"],

  // Top-level pages
  [/\bflat[- ]rate pricing\b/i, "/pricing"],
  [/\bpricing\b/i, "/pricing"],
  [/\b(book a tow|request a tow|request service)\b/i, "/book-towing-service-today"],
  [/\bdispatch\b/i, "/contact-nyc-towing-today"],
  [/\b(24\/7 dispatch|dispatch line)\b/i, "/services/emergency-247-towing"],
  [/\bfleet accounts?\b/i, "/commercial"],
];

/** Inject at most `maxLinks` <Link>s into a paragraph by finding the first N phrase hits. */
export function linkifyParagraph(text: string, keyPrefix: string, maxLinks = 2): ReactNode[] {
  const usedPhrases = new Set<string>();
  const out: ReactNode[] = [];
  let cursor = 0;
  let linkCount = 0;

  while (cursor < text.length && linkCount < maxLinks) {
    // Find the earliest match among all phrases we haven't used yet.
    let bestIdx = -1;
    let bestLen = 0;
    let bestHref = "";
    let bestMatched = "";

    for (const [regex, href] of PHRASE_LINKS) {
      if (usedPhrases.has(href)) continue;
      regex.lastIndex = 0;
      const re = new RegExp(regex.source, regex.flags.replace("g", ""));
      const m = re.exec(text.slice(cursor));
      if (m && m.index >= 0) {
        const abs = cursor + m.index;
        if (bestIdx === -1 || abs < bestIdx) {
          bestIdx = abs;
          bestLen = m[0].length;
          bestHref = href;
          bestMatched = m[0];
        }
      }
    }

    if (bestIdx === -1) break;

    // Push the pre-match text
    if (bestIdx > cursor) {
      out.push(text.slice(cursor, bestIdx));
    }
    out.push(
      <Link
        key={`${keyPrefix}-${linkCount}`}
        href={bestHref}
        className="text-teal-700 font-semibold hover:underline"
      >
        {bestMatched}
      </Link>,
    );
    usedPhrases.add(bestHref);
    cursor = bestIdx + bestLen;
    linkCount += 1;
  }

  if (cursor < text.length) {
    out.push(text.slice(cursor));
  }

  return out;
}

/**
 * Re-export of `getExtendedContent` output but with each paragraph
 * linkified into a `ReactNode[]`. Keeps the original text generator in
 * services.ts untouched.
 */
export function getLinkifiedExtendedContent(
  service: Service,
  paragraphs: string[],
): ReactNode[][] {
  return paragraphs.map((p, i) => linkifyParagraph(p, `para-${service.slug}-${i}`));
}

/** Picked up to drive related link injection for adjacent fields. */
export function sanityCheckSlugMap(): string[] {
  const missing: string[] = [];
  for (const [, href] of PHRASE_LINKS) {
    if (href.startsWith("/services/")) {
      const slug = href.replace("/services/", "");
      if (!SERVICES.some((s) => s.slug === slug)) missing.push(slug);
    }
  }
  return missing;
}
