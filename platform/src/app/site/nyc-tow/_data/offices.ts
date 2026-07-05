export interface Office {
  state: string;
  stateAbbr: string;
  stateSlug: string;
  city: string;
  address: string;
  zip: string;
  phone: string;
  phoneHref: string;
  email: string;
  directions: string;
  mapUrl: string;
}

// NYC dispatch hubs — one per borough.
// `state` fields reused as borough for compatibility with existing routes/components.
export const OFFICES: Office[] = [
  {
    state: "Manhattan",
    stateAbbr: "MAN",
    stateSlug: "manhattan",
    city: "Midtown",
    address: "350 5th Ave",
    zip: "10118",
    phone: "(212) 470-4068",
    phoneHref: "tel:+12124704068",
    email: "manhattan@thenyctowingservice.com",
    directions: "Dispatch at the Empire State Building, 5th Avenue and West 34th Street in Midtown. Trucks stage here for runs across Manhattan from the Battery to Inwood. Closest to the Lincoln and Holland Tunnel approaches for west-side calls and the Queensboro and Williamsburg bridges for east-side work.",
    mapUrl: "https://maps.apple.com/?address=350+5th+Ave,+New+York,+NY+10118",
  },
  {
    state: "Brooklyn",
    stateAbbr: "BRK",
    stateSlug: "brooklyn",
    city: "Downtown Brooklyn",
    address: "1 MetroTech Center",
    zip: "11201",
    phone: "(718) 586-5150",
    phoneHref: "tel:+17185865150",
    email: "brooklyn@thenyctowingservice.com",
    directions: "MetroTech Center in Downtown Brooklyn, steps from the Manhattan Bridge approach and the BQE. Fastest staging for calls across Williamsburg, Park Slope, Bay Ridge, and Coney Island. Heavy-duty flatbeds live here.",
    mapUrl: "https://maps.apple.com/?address=1+MetroTech+Center,+Brooklyn,+NY+11201",
  },
  {
    state: "Queens",
    stateAbbr: "QNS",
    stateSlug: "queens",
    city: "Long Island City",
    address: "1 Court Square",
    zip: "11101",
    phone: "(718) 586-5150",
    phoneHref: "tel:+17185865150",
    email: "queens@thenyctowingservice.com",
    directions: "One Court Square in LIC, next to the Queensboro Bridge. Covers Astoria, Flushing, Jamaica, Forest Hills, and the full stretch out to JFK and LaGuardia. On-site impound for vehicles held overnight.",
    mapUrl: "https://maps.apple.com/?address=1+Court+Square,+Long+Island+City,+NY+11101",
  },
  {
    state: "Bronx",
    stateAbbr: "BRX",
    stateSlug: "bronx",
    city: "Mott Haven",
    address: "560 Exterior St",
    zip: "10451",
    phone: "(212) 470-4068",
    phoneHref: "tel:+12124704068",
    email: "bronx@thenyctowingservice.com",
    directions: "BankNote Building on Exterior Street, next to the Major Deegan and the Third Avenue Bridge. Handles the entire Bronx from Riverdale to Throgs Neck, with fast access north on the Deegan and east on the Cross Bronx. Heavy-duty rigs positioned here for commercial truck recovery along I-95.",
    mapUrl: "https://maps.apple.com/?address=560+Exterior+St,+Bronx,+NY+10451",
  },
  {
    state: "Staten Island",
    stateAbbr: "SIN",
    stateSlug: "staten-island",
    city: "Bloomfield",
    address: "1110 South Ave",
    zip: "10314",
    phone: "(917) 277-0300",
    phoneHref: "tel:+19172770300",
    email: "statenisland@thenyctowingservice.com",
    directions: "Corporate Park of Staten Island on South Avenue, minutes from the Goethals and the West Shore Expressway. Fastest response across the island — St. George to Tottenville, Travis to Great Kills — and direct access to the Verrazzano for Brooklyn crossings and the Bayonne Bridge for Jersey recoveries.",
    mapUrl: "https://maps.apple.com/?address=1110+South+Ave,+Staten+Island,+NY+10314",
  },
];

export function getOfficeByState(stateSlug: string): Office | undefined {
  return OFFICES.find((o) => o.stateSlug === stateSlug);
}
