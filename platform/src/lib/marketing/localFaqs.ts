import type { ComboIndustry, ComboMetro } from "./combos";
import type { StateMetadata } from "./stateMetadata";

export interface LocalFaq {
  q: string;
  a: string;
}

// City/industry-specific FAQ built only from real fields already in the
// codebase (state licensing/tax/climate data, territory exclusivity model)
// — no invented statistics about a specific city or business count.
export function buildLocalFaqs(
  industry: ComboIndustry,
  metro: ComboMetro,
  stateMeta: StateMetadata | null
): LocalFaq[] {
  const trade = industry.name.toLowerCase();
  const faqs: LocalFaq[] = [
    {
      q: `Is the ${industry.name} CRM license still available in ${metro.city}, ${metro.stateAbbr}?`,
      a: `Full Loop CRM licenses one ${trade} operator per city. Check the live territory status at the top of this page — it updates in real time as cities are claimed.`,
    },
    {
      q: `What does it cost to run Full Loop CRM for a ${trade} business in ${metro.city}?`,
      a: `Pricing is the same nationwide regardless of city — see the full breakdown on the pricing page. What changes by city is exclusivity: only one ${trade} operator per market gets the license.`,
    },
  ];

  if (stateMeta) {
    faqs.push({
      q: `Do I need a state license to run a ${trade} business in ${metro.state}?`,
      a: `${stateMeta.permitNote} The relevant authority is the ${stateMeta.licensingAuthority}. Full Loop CRM doesn't replace state licensing requirements — it runs the business once you're licensed.`,
    });
    faqs.push({
      q: `How does the ${metro.state} season affect ${trade} demand in ${metro.city}?`,
      a: stateMeta.seasonalNote,
    });
    faqs.push({
      q: `Are there sales tax rules I should know about for ${trade} services in ${metro.state}?`,
      a: stateMeta.taxNote,
    });
  }

  return faqs;
}

// City-only variant (no specific industry) for the /locations/{state}/{city} hub.
export function buildLocationFaqs(metro: ComboMetro, stateMeta: StateMetadata | null): LocalFaq[] {
  const faqs: LocalFaq[] = [
    {
      q: `What industries are available in ${metro.city}, ${metro.stateAbbr}?`,
      a: `Full Loop CRM licenses one operator per trade per city. See the full list of available industries in ${metro.city} above — territory status updates in real time.`,
    },
  ];

  if (stateMeta) {
    faqs.push({
      q: `What's the licensing authority for home service businesses in ${metro.state}?`,
      a: `${stateMeta.licensingAuthority}. ${stateMeta.permitNote}`,
    });
    faqs.push({
      q: `How does ${metro.state}'s climate affect home service demand in ${metro.city}?`,
      a: stateMeta.seasonalNote,
    });
  }

  return faqs;
}
