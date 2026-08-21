import type { WashFoldMicrositeConfig } from './types'

export const washAndFoldBrooklynConfig: WashFoldMicrositeConfig = {
  domain: 'washandfoldbrooklyn.com',
  slug: 'washandfoldbrooklyn',
  brandName: 'Wash & Fold Brooklyn',
  areaName: 'Brooklyn',
  borough: 'Brooklyn',
  metaTitle: 'Wash & Fold Brooklyn | $3/lb Laundry Pickup & Delivery — Williamsburg to Bay Ridge',
  metaDescription: 'Brooklyn laundry pickup and delivery — $3/lb, $39 minimum, free pickup & delivery, 24–48hr turnaround. Williamsburg, Park Slope, DUMBO, Bay Ridge & 59 more neighborhoods. Part of Wash and Fold NYC. Call/text (917) 970-6002.',
  geo: { lat: '40.6782', lng: '-73.9442' },
  introParagraphs: [
    "Wash & Fold Brooklyn is the Brooklyn laundry pickup and delivery team behind Wash and Fold NYC, built around a borough where almost nobody has an in-unit washer and dryer — converted DUMBO warehouse lofts, Park Slope brownstones, Williamsburg walk-ups, and Bay Ridge two-family houses all share the same problem. Search 'Brooklyn wash and fold' or 'Brooklyn laundry pickup' and you land on the same $3/lb rate, the same twelve-step process, and the same free pickup and delivery that back every Wash and Fold NYC order — just organized specifically around Brooklyn.",
    "Brooklyn's housing stock is some of the most varied in the city — Domino Park-adjacent luxury high-rises in Williamsburg, limestone townhouses off Grand Army Plaza in Park Slope, and pre-war walk-ups near Shore Road in Bay Ridge all have one thing in common: a shared basement laundry room with two overworked machines, or a walk to the nearest laundromat with a duffel bag over your shoulder.",
    "Whether you're in a converted loft near the Manhattan Bridge in DUMBO, a garden apartment near Prospect Park in Park Slope, or a co-op off 86th Street in Bay Ridge, Wash & Fold Brooklyn picks up from your door, lobby, or doorman and delivers back clean, hand-folded, and organized in 24–48 hours — same rate everywhere in the borough, no distance surcharges.",
  ],
  areaChallenges: [
    { title: 'Converted Loft & Warehouse Buildings', body: "DUMBO's converted warehouse lofts and Williamsburg's industrial-chic conversions were built for freight, not for shared laundry rooms — most units have zero in-unit hookup, and building laundry rooms in these conversions are often undersized for the number of residents. We coordinate pickup with building staff and package rooms in these buildings every week." },
    { title: 'Brownstone & Townhouse Logistics', body: "Park Slope and Bay Ridge's brownstones, limestone townhouses, and semi-attached homes are beautiful and almost never have laundry hookups above the garden level. Carrying bags up and down stoops to a basement machine — if there is one — is exactly the kind of trip our pickup replaces." },
    { title: 'High-Density Walk-Up Buildings', body: "Williamsburg and the surrounding neighborhoods have a huge stock of walk-up buildings with no elevator and no laundry room at all. Our drivers come to your specific floor — no trip to a laundromat required, no carrying bags down four flights." },
    { title: 'New High-Rise Volume', body: "Brooklyn's new luxury high-rises near the waterfront in Williamsburg and Long Island City-adjacent DUMBO often have a single shared laundry room serving hundreds of units, which means long waits during peak hours. We coordinate directly with front desks and concierge in these buildings so residents skip the wait entirely." },
  ],
  localFaqs: [
    { question: 'Do you pick up from Brooklyn brownstones without a doorman?', answer: 'Yes — for walk-ups, brownstones, and buildings without a doorman, our driver comes directly to your door or a designated spot (stoop, vestibule, or a specific floor) at your scheduled pickup window.' },
    { question: 'Is the rate different in Williamsburg than in Bay Ridge?', answer: 'No. It’s $3/lb everywhere in Brooklyn — no distance surcharges, no neighborhood zones, no different pricing whether you’re near the Williamsburg Bridge or Shore Road.' },
    { question: 'Do you handle laundry for Brooklyn Airbnb hosts and short-term rentals?', answer: 'Yes — we turn over sheets, towels, and bath mats between guests, with same-day turnaround available when scheduled in advance. Popular with hosts in DUMBO, Williamsburg, and Park Slope.' },
  ],
  landmarks: ['Prospect Park', 'Domino Park', 'Brooklyn Bridge Park', 'Grand Army Plaza', 'Bedford Avenue', 'Shore Road Park'],
  featuredNeighborhoods: [
    'Williamsburg', 'Greenpoint', 'DUMBO', 'Brooklyn Heights', 'Fort Greene', 'Park Slope',
    'Prospect Heights', 'Crown Heights', 'Bedford-Stuyvesant', 'Cobble Hill', 'Carroll Gardens',
    'Sunset Park', 'Bay Ridge', 'Bushwick', 'Gowanus', 'Windsor Terrace', 'Flatbush', 'Ditmas Park',
    'Dyker Heights', 'Bensonhurst', 'Coney Island', 'Sheepshead Bay', 'Canarsie', 'East New York',
  ],
}
