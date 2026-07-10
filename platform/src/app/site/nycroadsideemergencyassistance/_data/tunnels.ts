import type { Roadway } from "./roadways";

/**
 * NYC vehicle tunnels — Holland, Lincoln, Queens-Midtown, and Hugh L. Carey
 * (formerly Brooklyn-Battery). These are the calls we get most often from
 * inside or right at the mouth of a tunnel, where there's no shoulder and
 * MTA / Port Authority tow protocols dictate how quickly a private wrecker
 * can get on scene.
 */
export const TUNNELS: Roadway[] = [
  {
    slug: "holland-tunnel",
    name: "Holland Tunnel",
    kind: "tunnel",
    subType: "Underwater Tunnel (Hudson River)",
    boroughs: ["manhattan"],
    segment: "Connects Canal Street in Lower Manhattan to Jersey City, NJ. Carries I-78. Port Authority-tolled. Restricted height: 12 ft 6 in.",
    hazards: [
      "Strict height limit catches U-Haul and box trucks every weekend — Port Authority issues fines and requires the truck to be backed out.",
      "Inside-tunnel breakdowns require Port Authority tow protocol before a private wrecker can enter — we coordinate with PAPD.",
      "Canal Street approach stacks daily — multi-hour delays during peak times.",
      "Carbon-monoxide ventilation means even a brief stall feels dangerous to drivers — calls come in panicked.",
      "Heavy commercial truck volume in the right lane.",
    ],
    commonCalls: ["accident-recovery", "flatbed-towing", "flat-tire-change", "jump-start", "heavy-duty-towing"],
    lanes: "4 lanes total (2 tubes, 2 lanes each)",
    length: "8,558 ft",
    relatedNeighborhoods: [
      { state: "manhattan", city: "tribeca" },
      { state: "manhattan", city: "soho" },
      { state: "manhattan", city: "hudson-square" },
    ],
    geo: { lat: 40.7270, lon: -74.0119 },
  },
  {
    slug: "lincoln-tunnel",
    name: "Lincoln Tunnel",
    kind: "tunnel",
    subType: "Underwater Tunnel (Hudson River)",
    boroughs: ["manhattan"],
    segment: "Connects Midtown Manhattan (30th-42nd Street corridor) to Weehawken, NJ. Three tubes. Carries NJ-495 / NY-495. Port Authority-tolled. Restricted height: 13 ft.",
    hazards: [
      "Strict height limit catches U-Haul trucks every weekend — PA requires the truck to be backed out.",
      "Inside-tunnel breakdowns require Port Authority tow protocol — we coordinate with PAPD.",
      "Manhattan approach via Dyer Avenue stacks every weekday afternoon — multi-hour delays.",
      "XBL (exclusive bus lane) eastbound mornings means non-bus traffic in two tubes only.",
      "Bus traffic volume (Port Authority Bus Terminal feed) is the highest in the world.",
    ],
    commonCalls: ["accident-recovery", "flatbed-towing", "flat-tire-change", "jump-start", "heavy-duty-towing"],
    lanes: "6 lanes total (3 tubes, 2 lanes each)",
    length: "8,216 ft (center tube)",
    relatedNeighborhoods: [
      { state: "manhattan", city: "hells-kitchen" },
      { state: "manhattan", city: "hudson-yards" },
      { state: "manhattan", city: "midtown" },
    ],
    geo: { lat: 40.7613, lon: -74.0035 },
  },
  {
    slug: "queens-midtown-tunnel",
    name: "Queens-Midtown Tunnel",
    kind: "tunnel",
    subType: "Underwater Tunnel (East River)",
    boroughs: ["manhattan", "queens"],
    segment: "Connects Midtown Manhattan (East 36th Street) to Long Island City via the Long Island Expressway. MTA-tolled. Restricted height: 12 ft 1 in.",
    hazards: [
      "Strict height limit catches box trucks and large SUVs with rooftop cargo regularly.",
      "Inside-tunnel breakdowns require MTA tow protocol — we coordinate with MTA Bridges & Tunnels.",
      "LIE approach in Queens stacks every weekday — multi-hour delays during peak rush.",
      "FDR Drive approach on the Manhattan side generates merge incidents.",
      "Heavy commercial truck volume in the right lane.",
    ],
    commonCalls: ["accident-recovery", "flatbed-towing", "flat-tire-change", "jump-start", "heavy-duty-towing"],
    lanes: "4 lanes total (2 tubes, 2 lanes each)",
    length: "6,272 ft",
    relatedNeighborhoods: [
      { state: "manhattan", city: "murray-hill" },
      { state: "manhattan", city: "midtown-east" },
      { state: "queens", city: "long-island-city" },
    ],
    geo: { lat: 40.7434, lon: -73.9690 },
  },
  {
    slug: "hugh-l-carey-tunnel",
    name: "Hugh L. Carey Tunnel (Brooklyn-Battery Tunnel)",
    shortName: "Battery Tunnel",
    kind: "tunnel",
    subType: "Underwater Tunnel (East River / Upper Bay)",
    boroughs: ["manhattan", "brooklyn"],
    segment: "Connects the Battery in Lower Manhattan to the Gowanus Expressway / BQE at Hamilton Avenue in Red Hook, Brooklyn. MTA-tolled. Restricted height: 12 ft 1 in.",
    hazards: [
      "Strict height limit catches U-Haul trucks and tall vans regularly.",
      "Inside-tunnel breakdowns require MTA tow protocol — we coordinate with MTA Bridges & Tunnels.",
      "Manhattan-bound traffic stacks every weekday afternoon at the Hamilton Ave / Gowanus Expressway approach.",
      "FDR Drive merge on the Manhattan side generates merge incidents.",
      "Salt-water flooding at the Battery approach during nor'easters has closed the tunnel — Sandy-era flooding remains the worst case scenario.",
    ],
    commonCalls: ["accident-recovery", "flatbed-towing", "flat-tire-change", "jump-start", "heavy-duty-towing", "winch-out-recovery"],
    lanes: "4 lanes total (2 tubes, 2 lanes each)",
    length: "9,117 ft",
    relatedNeighborhoods: [
      { state: "manhattan", city: "financial-district" },
      { state: "manhattan", city: "battery-park-city" },
      { state: "brooklyn", city: "red-hook" },
      { state: "brooklyn", city: "carroll-gardens" },
    ],
    geo: { lat: 40.7008, lon: -74.0152 },
  },
];