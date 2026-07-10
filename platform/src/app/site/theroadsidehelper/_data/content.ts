export const PHONE = "(888) 944-3001";
export const PHONE_HREF = "tel:+18889443001";
export const SMS_HREF = "sms:+18889443001";
export const EMAIL = "hello@theroadsidehelper.com";
export const HOURS = "24/7 — Day or Night";
export const RATING = "5.0";
export const REVIEW_COUNT = "200+";
export const CITY_COUNT = "900+";
export const STATE_COUNT = "50";

// Services are defined in @/app/site/theroadsidehelper/_data/services.ts
// Re-export for backward compat
export { SERVICES } from "./services";

export const PRICING = {
  solo: {
    label: "Book Online — Save $25",
    price: "$124",
    unit: "first hour (online only)",
    popular: true,
    features: ["$25 off first hour when you book online", "$149 / hour after first hour", "Fastest way to get a truck — priority online dispatch", "1 hour minimum, all equipment included", "Licensed & insured", "No trip fee, no fuel surcharge"],
  },
  standard: {
    label: "Standard Hourly",
    price: "$149",
    unit: "per hour",
    features: ["Same $149 / hour for every service", "Tow, recovery, jump, tire, lockout, fuel", "1 hour minimum", "Flatbed or wheel-lift", "Available 24/7", "Phone rate — no online discount"],
  },
  emergency: {
    label: "After-Hours Emergency",
    price: "$149",
    unit: "per hour",
    features: ["No premium after-hours rate", "Guaranteed callback within 5 minutes", "Priority dispatch", "Overnight & weekend service", "Holidays included", "Same flat rate, every hour of every day"],
  },
};

export const TESTIMONIALS = [
  { name: "Sarah M.", location: "Austin, TX", text: "Dead battery on a freezing morning before work. Technician was there in 38 minutes, jumped the car, and ran a quick test to confirm my alternator was fine. $149 flat — way cheaper than a tow.", rating: 5 },
  { name: "David R.", location: "Brooklyn, NY", text: "Locked my keys in the trunk on a Sunday night. The tech showed up in 25 minutes, popped the door without a scratch, and was professional the whole time. No after-hours surcharge.", rating: 5 },
  { name: "Jennifer K.", location: "Denver, CO", text: "Slid off the road in a snowstorm. Winch-out took 20 minutes. The technician walked me through what he was doing the whole time. Charged the 1-hour minimum, didn't try to upsell me on anything.", rating: 5 },
  { name: "Marcus T.", location: "Atlanta, GA", text: "Ran out of gas on the interstate, embarrassing but it happens. They delivered 3 gallons at pump price plus the service rate. Total was exactly what the dispatcher quoted on the phone.", rating: 5 },
  { name: "Lisa P.", location: "Seattle, WA", text: "Flat tire on the way to a job. They got there fast, swapped to my spare, properly torqued the lugs, and even checked the spare's pressure. Honest, professional, no weird fees.", rating: 5 },
  { name: "Robert H.", location: "Chicago, IL", text: "Battery wouldn't take a jump — I needed a new one. The technician had one on the truck, installed it in 20 minutes, recycled the old one. One flat rate. No 'emergency battery' markup.", rating: 5 },
];

export const FAQ = [
  { q: "How does your pricing work?", a: "Simple — $149 per hour with a 1-hour minimum. No trip fees, no after-hours surcharges, no equipment up-charges. The rate is the same at 2pm on a Tuesday or 2am on Christmas." },
  { q: "How fast can you get to me?", a: "Most calls are reached in 30–60 minutes. Highway breakdowns get priority dispatch. When you call, our dispatcher gives you a real ETA based on the nearest technician's current location." },
  { q: "What services do you provide?", a: "Jump-starts, flat-tire changes, car lockouts, fuel delivery, local towing, winch-outs and recovery, on-site battery replacement, key fob battery replacement, and motorcycle/RV/diesel-specific roadside support." },
  { q: "Do I need a membership?", a: "No. We're pay-as-you-go. No annual fees, no contracts, no auto-renewals. You pay only when you actually need help. For most drivers, that's far cheaper than years of unused club membership dues." },
  { q: "Are you available 24/7?", a: "Yes — 24 hours a day, 365 days a year. Same flat rate overnight, weekends, and holidays. No after-hours surcharges." },
  { q: "What if my problem turns out to be bigger than expected?", a: "The technician will tell you on the spot and quote any additional time before continuing. You're never billed for time we didn't quote you for. If we can't fix it roadside, we'll get you towed to a shop." },
  { q: "Are you licensed and insured?", a: "Yes. Fully licensed, bonded, and insured in every market we serve. If your vehicle is damaged during a service call, our liability insurance covers repair at no cost to you." },
  { q: "How do I pay?", a: "All major credit and debit cards, Apple Pay, Google Pay, Venmo, Zelle, CashApp, or cash. Payment is collected on completion, and a receipt is emailed automatically." },
];

export const TOP_CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Miami", "Atlanta", "Denver", "Seattle", "Boston", "Nashville", "Portland", "Las Vegas", "Austin", "Charlotte", "Tampa"];

export const STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];