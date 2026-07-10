export const PHONE = "(888) 831-3001";
export const PHONE_HREF = "tel:+18888313001";
export const SMS_HREF = "sms:+18888313001";
export const EMAIL = "hello@wepayyoujunkremoval.com";
export const HOURS = "7AM–8PM Daily";
export const RATING = "5.0";
export const REVIEW_COUNT = "200+";
export const CITY_COUNT = "900+";
export const STATE_COUNT = "50";

// Services are defined in @/app/site/we-pay-you-junk/_data/services.ts
// Re-export for backward compat
export { SERVICES } from "./services";

export const PRICING = {
  solo: {
    label: "1 Person Crew",
    price: "$200",
    unit: "per hour",
    features: ["1 hour minimum", "1 crew member", "Dump fees included (an industry first)", "Same-day available", "50% Resale Credit (when applicable)", "Ideal for small jobs", "Single items & light loads"],
  },
  standard: {
    label: "2 Person Crew",
    price: "$300",
    unit: "per hour",
    popular: true,
    features: ["1 hour minimum", "2 crew members", "Dump fees included (an industry first)", "Same-day available", "50% Resale Credit (when applicable)", "Most popular option", "Heavy items no problem", "Full cleanouts & estates"],
  },
  emergency: {
    label: "Each Additional Person",
    price: "+$100",
    unit: "per person / per hour",
    features: ["Scale the crew to any job", "Dump fees included (an industry first)", "Same-day available", "50% Resale Credit (when applicable)", "Priority dispatch", "Evenings & weekends", "Last-minute moves & deadlines"],
  },
};

export const TESTIMONIALS = [
  { name: "Sarah M.", location: "Austin, TX", text: "They cleared my garage in an hour and credited me $180 for an old workbench and some power tools I thought were worthless. My bill went from $200 to $20. Unreal.", rating: 5 },
  { name: "David R.", location: "Brooklyn, NY", text: "Estate cleanout after my mother passed. The crew was respectful and appraised everything carefully. The credits from her furniture actually covered the entire bill — they cut us a check for $140.", rating: 5 },
  { name: "Jennifer K.", location: "Denver, CO", text: "Other junk companies wanted $500+ to clear my basement. These guys charged starting at $200/hr, credited me for a vintage desk and some old speakers, and my total was $85. No brainer.", rating: 5 },
  { name: "Marcus T.", location: "Atlanta, GA", text: "I was going to sell my old furniture on Facebook Marketplace but didn't want the hassle. They hauled it all, gave me fair credit for the good pieces, and I basically broke even.", rating: 5 },
  { name: "Lisa P.", location: "Seattle, WA", text: "Office cleanout — they credited us for 12 Herman Miller chairs and a bunch of monitors. We actually got paid $300 after the job was done. Never heard of a junk company doing that.", rating: 5 },
  { name: "Robert H.", location: "Chicago, IL", text: "Honest, transparent pricing. starting at $200/hr, dump fees included, and they knocked $220 off my bill for items with resale value. Every other company just wanted a flat fee to take everything.", rating: 5 },
];

export const FAQ = [
  { q: "How does your pricing work?", a: "Simple — $200 per hour with a 1 hour minimum. Dump fees are baked into the price. No volume charges, no hidden fees. We send the right size crew for your job and the rate stays the same." },
  { q: "How does the item credit system work?", a: "As we load your items, we identify anything with resale value. We appraise it at fair market value and credit 50% of that amount toward your bill. If you have enough valuable items to cover your entire bill, we pay you the difference." },
  { q: "What counts as a 'valuable' item?", a: "Furniture in good condition, working appliances, electronics, tools, fitness equipment, musical instruments, designer goods — anything we can reasonably resell." },
  { q: "Can I really get PAID for a junk removal?", a: "Yes. If the total resale credits exceed your bill, we cut you a check right there. It happens more than you'd think on estate cleanouts and large office jobs." },
  { q: "Do you offer same-day junk removal?", a: "Yes! Call us before noon and we can typically have a crew at your location within 2-4 hours." },
  { q: "What items do you NOT take?", a: "Hazardous materials including asbestos, wet paint, chemicals, biological waste, or oil/fuel tanks. Everything else — we've got you covered." },
  { q: "Are you licensed and insured?", a: "Yes. Fully licensed, bonded, and insured in every market we serve." },
  { q: "Why don't other junk removal companies do this?", a: "Most junk companies treat every item the same — they charge you to take it and then resell the good stuff themselves, keeping 100% of the profit. We split the value with you because your stuff has value and you should benefit from it." },
];

export const TOP_CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Miami", "Atlanta", "Denver", "Seattle", "Boston", "Nashville", "Portland", "Las Vegas", "Austin", "Charlotte", "Tampa"];

export const STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];
