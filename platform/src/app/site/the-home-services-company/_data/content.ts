export const SITE_URL = "https://www.thehomeservicescompany.com";
export const PHONE = "(888) 700-4001";
export const PHONE_HREF = "tel:+18887004001";
export const SMS_HREF = "sms:+18887004001";
export const EMAIL = "hello@thehomeservicescompany.com";
export const HOURS = "7AM–8PM Daily";
export const RATING = "5.0";
export const REVIEW_COUNT = "200+";
export const CITY_COUNT = "990";
export const STATE_COUNT = "50";

// Services are defined in @/app/site/the-home-services-company/_data/services.ts
// Re-export for backward compat
export { SERVICES } from "./services";

export const PRICING = {
  solo: {
    label: "Standard Service",
    price: "$99",
    unit: "per hour",
    features: ["Starting at $99/hour", "Licensed and insured technicians", "Upfront pricing — no surprises", "Same-day availability", "40 home services under one roof", "Weekend and holiday service at the same rate", "2-hour arrival windows"],
  },
  standard: {
    label: "Recurring Service",
    price: "$99",
    unit: "per hour",
    popular: true,
    features: ["Starting at $99/hour", "Priority scheduling", "Dedicated technician when possible", "Consistent quality across visits", "One account, one invoice, one vendor", "Ideal for property managers, HOAs, and busy households", "Licensed and insured"],
  },
  emergency: {
    label: "Emergency Same-Day",
    price: "$99",
    unit: "per hour + dispatch",
    features: ["Guaranteed same-day arrival before 8PM", "Priority dispatch across 990 cities", "Plumbing, electrical, HVAC, garage door, lockouts", "Licensed and insured", "Evenings and weekends included", "Starting at $99/hour", "Real technicians, not call-center scripts"],
  },
};

export const TESTIMONIALS = [
  { name: "Sarah M.", location: "Austin, TX", text: "Booked an HVAC service call on a Saturday morning — technician was at my house by noon. Diagnosed the problem, quoted the price before doing anything, and had cold air back on before dinner. This is how home services should work.", rating: 5 },
  { name: "David R.", location: "Brooklyn, NY", text: "I used them for painting, then for a plumbing issue a month later, and then for a dishwasher install. Same company, same quality, same honest pricing every time. That's rare.", rating: 5 },
  { name: "Jennifer K.", location: "Denver, CO", text: "They painted our entire interior, installed new flooring in two rooms, and handled a small electrical issue — all coordinated through one project manager. No hunting down three different contractors, no conflicting schedules.", rating: 5 },
  { name: "Marcus T.", location: "Atlanta, GA", text: "Called them for handyman work and ended up using their HVAC team two weeks later. Upfront pricing on both jobs, and the technicians actually explained what they were doing. I'll call them again.", rating: 5 },
  { name: "Lisa P.", location: "Seattle, WA", text: "Property manager for 30 units across the city — we use Home Services Co for tenant turnovers (cleaning, handyman, appliance repair). Dedicated account, consistent scheduling, one invoice per month. Saved me hours of vendor juggling.", rating: 5 },
  { name: "Robert H.", location: "Chicago, IL", text: "Hired them for gutter cleaning, asked about a drywall repair while they were there, and got it handled the same day. Starting at $99/hour, no games, just good work. This is my new go-to for anything home related.", rating: 5 },
];

export const FAQ = [
  { q: "How does your pricing work?", a: "Simple — starting at $99 per hour with upfront pricing on every job. Before any work begins, you approve a clear estimate. If the scope changes, we stop and get your approval before continuing. No mystery shop fees, no hidden charges." },
  { q: "What services do you offer?", a: "40 home services under one roof — HVAC, plumbing, electrical, painting, flooring, landscaping, cleaning, handyman work, remodeling, and more. See our full services page for the complete list." },
  { q: "Are you licensed and insured?", a: "Yes. Fully licensed, bonded, and insured in every market we serve. Certificates of insurance are available within 24 hours for property managers and commercial clients." },
  { q: "Do you offer same-day service?", a: "Yes. Call before noon and we can typically have a technician at your home the same day. For emergencies — active leaks, no heat, no AC, lockouts — we guarantee same-day arrival." },
  { q: "Are there surcharges for weekends or holidays?", a: "No. The rate is starting at $99/hour every single day of the year. No overtime charges, no weekend premiums, no holiday surcharges." },
  { q: "What cities do you serve?", a: "990 cities across all 50 states. Call us at (888) 700-4001 or check our locations page to confirm coverage in your area — chances are strong we have a local team ready to serve you today." },
  { q: "How do I pay?", a: "We accept credit cards, debit cards, checks, and digital transfers (Venmo, Zelle, CashApp). Payment is processed on completion of the job, and you get a detailed invoice that matches the estimate you approved." },
  { q: "What if I'm not satisfied with the work?", a: "We back every job with a satisfaction guarantee. If anything isn't right, we make it right on the spot — no arguing, no follow-up calls, no runaround. One call to (888) 700-4001 and we fix it." },
];

export const TOP_CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Miami", "Atlanta", "Denver", "Seattle", "Boston", "Nashville", "Portland", "Las Vegas", "Austin", "Charlotte", "Tampa"];

export const STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];
