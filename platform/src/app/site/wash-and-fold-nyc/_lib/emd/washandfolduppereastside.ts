import type { WashFoldMicrositeConfig } from './types'

export const washAndFoldUpperEastSideConfig: WashFoldMicrositeConfig = {
  domain: 'washandfolduppereastside.com',
  slug: 'washandfolduppereastside',
  brandName: 'Wash & Fold Upper East Side',
  areaName: 'the Upper East Side',
  borough: 'Manhattan',
  metaTitle: 'Wash & Fold Upper East Side | $3/lb Laundry Pickup & Delivery NYC',
  metaDescription: 'Upper East Side laundry pickup and delivery — $3/lb, $39 minimum, free pickup & delivery, 24–48hr turnaround. Yorkville, Carnegie Hill, Lenox Hill. Part of Wash and Fold NYC. Call/text (917) 970-6002.',
  geo: { lat: '40.7736', lng: '-73.9566' },
  introParagraphs: [
    "Wash & Fold Upper East Side is the Upper East Side laundry pickup and delivery team behind Wash and Fold NYC, built around a neighborhood of luxury co-ops, pre-war apartments, brownstones, and penthouses stretching from Museum Mile to the East River. Search 'Upper East Side wash and fold' or 'UES laundry pickup' and you land on the same $3/lb rate, the same twelve-step process, and the same free pickup and delivery that back every Wash and Fold NYC order — just focused specifically on the Upper East Side.",
    "The Upper East Side's building stock — pre-war co-ops with strict service-entrance rules, doorman buildings up and down Park and Madison, and townhouses near Museum Mile — almost never comes with an in-unit washer and dryer. What residents get instead is a shared basement laundry room, or a walk to the nearest laundromat with a bag over their shoulder.",
    "Whether you're in a doorman building near the Metropolitan Museum of Art, a co-op in Carnegie Hill, or a walk-up in Yorkville near the 4/5/6 and Q lines, Wash & Fold Upper East Side coordinates pickup directly with your doorman or concierge and delivers back clean, hand-folded, and organized within 24–48 hours.",
  ],
  areaChallenges: [
    { title: 'Doorman & Concierge Coordination', body: "Most Upper East Side buildings run pickup and delivery through a doorman or concierge desk, not a resident's own hands. We coordinate every pickup and delivery directly with building staff, so residents never need to be home." },
    { title: 'Pre-War Co-op Service Rules', body: "Pre-war co-ops near Museum Mile often have specific service-entrance hours and package protocols. We work within each building's own rules rather than asking residents to make an exception for us." },
    { title: 'Penthouse & High-Floor Logistics', body: "Penthouses and high floors mean a longer trip for any resident carrying a laundry bag down to a basement machine. Our pickup removes that trip entirely — the bag never has to leave your door." },
    { title: 'Townhouse & Brownstone Access', body: "Townhouses and brownstones near Carnegie Hill and Lenox Hill were built well before shared laundry rooms were standard. We pick up directly from the stoop or door on a schedule that works for the household." },
  ],
  localFaqs: [
    { question: 'Do you coordinate pickup with Upper East Side doormen?', answer: 'Yes — most of our UES pickups go straight through the doorman or concierge desk. We confirm the arrangement with your building the first time we service your address, then it stays consistent every pickup after.' },
    { question: 'Do you serve Yorkville, Carnegie Hill, and Lenox Hill specifically?', answer: 'Yes — Wash & Fold Upper East Side covers the entire UES, including Yorkville, Carnegie Hill, Lenox Hill, Sutton Place, and Turtle Bay, at the same $3/lb rate.' },
    { question: 'Can I schedule pickup around a co-op\'s service-entrance hours?', answer: 'Yes — tell us your building\'s service-entrance window when you schedule and we\'ll route your pickup within it. This is standard for most pre-war co-ops on the Upper East Side.' },
  ],
  landmarks: ['Museum Mile', 'Central Park', 'Metropolitan Museum of Art', 'Guggenheim Museum'],
  featuredNeighborhoods: ['Upper East Side', 'Yorkville', 'Carnegie Hill', 'Lenox Hill', 'Sutton Place', 'Turtle Bay', 'Roosevelt Island'],
}
