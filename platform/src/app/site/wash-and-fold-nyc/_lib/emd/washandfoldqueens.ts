import type { WashFoldMicrositeConfig } from './types'

export const washAndFoldQueensConfig: WashFoldMicrositeConfig = {
  domain: 'washandfoldqueens.com',
  slug: 'washandfoldqueens',
  brandName: 'Wash & Fold Queens',
  areaName: 'Queens',
  borough: 'Queens',
  metaTitle: 'Wash & Fold Queens | $3/lb Laundry Pickup & Delivery — Astoria to Forest Hills',
  metaDescription: 'Queens laundry pickup and delivery — $3/lb, $39 minimum, free pickup & delivery, 24–48hr turnaround. Astoria, LIC, Forest Hills, Flushing & 67 more neighborhoods. Part of Wash and Fold NYC. Call/text (917) 970-6002.',
  geo: { lat: '40.7282', lng: '-73.7949' },
  introParagraphs: [
    "Wash & Fold Queens is the Queens laundry pickup and delivery team behind Wash and Fold NYC, built around New York City's most residential borough — Long Island City high-rises, Astoria walk-ups, Forest Hills Tudor homes, and Flushing multi-family houses all share the same problem: almost nobody has an in-unit washer and dryer. Search 'Queens wash and fold' or 'Queens laundry pickup' and you land on the same $3/lb rate, the same twelve-step process, and the same free pickup and delivery that back every Wash and Fold NYC order — just organized specifically around Queens.",
    "Queens is the largest borough by land area, and its housing stock reflects it — waterfront condos near Gantry Plaza State Park in Long Island City, two-family homes near Steinway Street in Astoria, and garden apartments in the Forest Hills Gardens section all have different laundry problems, but the same solution: a driver at your door instead of a trip to a shared machine or a laundromat.",
    "Whether you're commuting into Manhattan from the N/W line in Astoria, the 7 or E/F/M/R from LIC or Forest Hills, or the LIRR from Flushing, Wash & Fold Queens picks up from your door, lobby, or doorman and delivers back clean, hand-folded, and organized in 24–48 hours — same rate across the whole borough, no distance surcharges.",
  ],
  areaChallenges: [
    { title: 'Waterfront High-Rise Volume', body: "Long Island City's luxury high-rises and converted industrial lofts near Gantry Plaza State Park often have a single shared laundry room serving hundreds of residents. We coordinate directly with front desks and concierge so residents skip the wait for a machine entirely." },
    { title: 'Two-Family & Walk-Up Buildings', body: "Astoria's stock of two-family homes and walk-ups rarely has an in-unit hookup, and older buildings near Steinway Street often have no shared laundry room at all. Our drivers come directly to your floor or door — no trip to a laundromat required." },
    { title: 'Tudor Home & Co-op Logistics', body: "Forest Hills Gardens' Tudor-style homes and the co-ops surrounding Austin Street were built well before shared laundry rooms were standard. We pick up from the door of these standalone and semi-attached homes on a schedule that works around Forest Hills Stadium event traffic when relevant." },
    { title: 'Multi-Family & New Development Density', body: "Flushing's mix of multi-family homes and new development towers near Flushing Meadows Park means laundry demand is high and machine availability is inconsistent, especially on weekends. Weekly subscribers in Flushing get a fixed pickup day and the same driver every time, so availability is never a question." },
  ],
  localFaqs: [
    { question: 'Do you pick up from Queens two-family and semi-attached homes?', answer: 'Yes — for two-family homes, semi-attached houses, and buildings without a doorman, our driver comes directly to your door or a designated spot at your scheduled pickup window.' },
    { question: 'Is the rate different in Long Island City than in Flushing?', answer: 'No. It’s $3/lb everywhere in Queens — no distance surcharges, no neighborhood zones, no different pricing whether you’re near Gantry Plaza or Flushing Meadows Park.' },
    { question: 'Do you serve Queens restaurants and businesses?', answer: 'Yes — commercial laundry for restaurants, salons, gyms, and Airbnb hosts across Queens runs $1–$2/lb depending on volume, with daily or weekly pickup and invoice billing.' },
  ],
  landmarks: ['Astoria Park', 'Gantry Plaza State Park', 'Forest Hills Stadium', 'Flushing Meadows Park', 'MoMA PS1', 'Queens Botanical Garden'],
  featuredNeighborhoods: [
    'Astoria', 'Ditmars Steinway', 'Long Island City', 'Hunters Point', 'Sunnyside', 'Woodside',
    'Jackson Heights', 'Elmhurst', 'Rego Park', 'Forest Hills', 'Kew Gardens', 'Middle Village',
    'Ridgewood', 'Maspeth', 'Flushing', 'Whitestone', 'Bayside', 'Fresh Meadows', 'Douglaston',
    'Jamaica', 'Rockaway Beach', 'Far Rockaway',
  ],
}
