import type { WashFoldMicrositeConfig } from './types'

// Domain is registered as "washandfoldupperweastside.com" (note: "weast",
// not "west") — treated as the Upper West Side site per Jeff's original
// domain list; flagged as a likely typo when this was built, not silently
// corrected since the domain itself can't be changed here.
export const washAndFoldUpperWestSideConfig: WashFoldMicrositeConfig = {
  domain: 'washandfoldupperweastside.com',
  slug: 'washandfoldupperweastside',
  brandName: 'Wash & Fold Upper West Side',
  areaName: 'the Upper West Side',
  borough: 'Manhattan',
  metaTitle: 'Wash & Fold Upper West Side | $3/lb Laundry Pickup & Delivery NYC',
  metaDescription: 'Upper West Side laundry pickup and delivery — $3/lb, $39 minimum, free pickup & delivery, 24–48hr turnaround. Lincoln Square, Manhattan Valley, Morningside Heights. Part of Wash and Fold NYC. Call/text (917) 970-6002.',
  geo: { lat: '40.7870', lng: '-73.9754' },
  introParagraphs: [
    "Wash & Fold Upper West Side is the Upper West Side laundry pickup and delivery team behind Wash and Fold NYC, built around a neighborhood of pre-war apartments, brownstones, luxury condos, and classic six layouts stretching from Central Park West to Riverside Drive. Search 'Upper West Side wash and fold' or 'UWS laundry pickup' and you land on the same $3/lb rate, the same twelve-step process, and the same free pickup and delivery that back every Wash and Fold NYC order — just focused specifically on the Upper West Side.",
    "The Upper West Side's building stock — prewar co-ops near Lincoln Center, brownstones off Riverside Park, and classic six apartments near Central Park West — almost never comes with an in-unit washer and dryer. What residents get instead is a shared basement laundry room, or a walk to the nearest laundromat with a bag over their shoulder.",
    "Whether you're in a prewar building near the American Museum of Natural History, a brownstone in Manhattan Valley, or a classic six near Lincoln Center, Wash & Fold Upper West Side coordinates pickup directly with your doorman or building staff and delivers back clean, hand-folded, and organized within 24–48 hours.",
  ],
  areaChallenges: [
    { title: 'Prewar Co-op & Doorman Coordination', body: "Most Upper West Side buildings near Central Park West run pickup through a doorman, not a resident's own hands. We coordinate every pickup and delivery directly with building staff, so residents never need to be home." },
    { title: 'Classic Six & Family Apartment Volume', body: "Classic six layouts near Lincoln Center and Riverside Park typically house families generating far more laundry than a studio or one-bedroom — towels, sheets, and kids' clothes on top of everyday wardrobes. We handle any volume without a surcharge." },
    { title: 'Brownstone Access in Manhattan Valley', body: "Manhattan Valley's brownstones were built well before shared laundry rooms were standard. We pick up directly from the stoop or door on a schedule that works for the household, no trip to a basement machine required." },
    { title: 'Riverside Park-Adjacent Walk-Ups', body: "Walk-up buildings near Riverside Park often have no laundry room at all. Our drivers come directly to your floor — no carrying bags down multiple flights to a laundromat on Broadway or Amsterdam." },
  ],
  localFaqs: [
    { question: 'Do you coordinate pickup with Upper West Side doormen?', answer: 'Yes — most of our UWS pickups go straight through the doorman or concierge desk. We confirm the arrangement with your building the first time we service your address, then it stays consistent every pickup after.' },
    { question: 'Do you serve Lincoln Square, Manhattan Valley, and Morningside Heights specifically?', answer: 'Yes — Wash & Fold Upper West Side covers the entire UWS, including Lincoln Square, Manhattan Valley, Morningside Heights, and Columbus Circle, at the same $3/lb rate.' },
    { question: 'Can you handle a large family\'s laundry on the Upper West Side?', answer: 'Yes — families on the weekly 20 lb plan or a custom volume plan are common on the UWS. Text us your typical weekly weight and we\'ll recommend the right plan.' },
  ],
  landmarks: ['Lincoln Center', 'American Museum of Natural History', 'Riverside Park', 'Central Park West'],
  featuredNeighborhoods: ['Upper West Side', 'Lincoln Square', 'Manhattan Valley', 'Morningside Heights', 'Columbus Circle', 'Central Park South'],
}
