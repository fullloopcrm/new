// @ts-nocheck
export const PHONE = "(888) 831-3001";
export const PHONE_HREF = "tel:+18888313001";
export const SMS_HREF = "sms:+18888313001";
export const EMAIL = "dispatch@tolltrucksnearme.com";
export const HOURS = "24/7 Dispatch";
export const RATING = "5.0";
export const REVIEW_COUNT = "200+";
export const CITY_COUNT = "900+";
export const STATE_COUNT = "50";

// Services are defined in @/app/site/toll-trucks-near-me/_data/services.ts
// Re-export for backward compat
export { SERVICES } from "./services";

export const PRICING = {
  solo: {
    label: "Light-Duty Tow",
    price: "$95",
    unit: "hookup + $3.50/mi",
    features: ["Cars, SUVs, sedans", "Flatbed or wheel-lift", "First 5 miles included", "Upfront flat pricing", "Licensed & insured driver", "Standard 60-min arrival"],
  },
  standard: {
    label: "Medium-Duty Tow",
    price: "$150",
    unit: "hookup + $5/mi",
    popular: true,
    features: ["Trucks, vans, cargo vans", "Flatbed preferred", "First 5 miles included", "Upfront flat pricing", "Most popular option", "Commercial vehicles included", "Standard 60-min arrival"],
  },
  emergency: {
    label: "Emergency Priority",
    price: "+$50",
    unit: "30-min arrival guaranteed",
    features: ["30-Minute arrival guarantee or $50 off", "Crash & rollover recovery", "24/7 priority dispatch", "Storm & freeway closures", "Night & holiday coverage", "ETA texted to your phone"],
  },
};

export const TESTIMONIALS = [
  { name: "Sarah M.", location: "Austin, TX", text: "Blew a tire on I-35 at 11 PM. They had a flatbed to me in 22 minutes and my car at the shop by midnight. The price they quoted on the phone was exactly what I paid — no surprise fees.", rating: 5 },
  { name: "David R.", location: "Brooklyn, NY", text: "I called three other companies before finding these guys. Everyone else said 'at least 90 minutes.' Their driver pulled up in 28. Fair price, careful loading, texted me updates the whole time.", rating: 5 },
  { name: "Jennifer K.", location: "Denver, CO", text: "Locked my keys in the car with my dog inside on a 95-degree day. They had someone there in 15 minutes, popped the door, wouldn't even take a tip. These are the good ones.", rating: 5 },
  { name: "Marcus T.", location: "Atlanta, GA", text: "Broke down on 285 during rush hour. The dispatcher stayed on the phone with me until the driver arrived. Professional, fast, and the bill was lower than I expected.", rating: 5 },
  { name: "Lisa P.", location: "Seattle, WA", text: "We run a delivery fleet — 14 vans. These guys are our go-to for every breakdown. Fast response, commercial-grade equipment, and direct billing so my drivers never have to handle payment.", rating: 5 },
  { name: "Robert H.", location: "Chicago, IL", text: "Accident recovery after a bad snowstorm. They pulled my SUV out of a ditch with the winch in under an hour. Driver was calm, professional, and made a stressful situation way easier.", rating: 5 },
];

export const FAQ = [
  { q: "How fast can a tow truck get to me?", a: "Our standard arrival is under 60 minutes in every city we serve. Emergency Priority dispatch guarantees arrival within 30 minutes or we take $50 off your bill. You get a live ETA texted to your phone the second a driver is dispatched." },
  { q: "How much does a tow cost?", a: "Light-duty tows start at $95 hookup plus $3.50 per mile with the first 5 miles included. Medium-duty runs $150 + $5/mi. Heavy-duty (semis, RVs, buses) starts at $350 + $7/mi. Roadside assistance calls (jump, tire, fuel, lockout) are $75 flat. You'll always get a firm quote before the truck rolls — no surprise fees." },
  { q: "Do you tow 24/7?", a: "Yes. 24/7/365. Dispatchers answer the phone every hour of every day. Nights, weekends, holidays — same rates. No surcharges." },
  { q: "What's the 30-Minute Arrival Guarantee?", a: "Choose Emergency Priority and we guarantee a driver on-scene within 30 minutes of dispatch. If we're late, we take $50 off your bill automatically. Standard service targets 60 minutes; most arrivals are well under." },
  { q: "Do you do roadside assistance, not just towing?", a: "Yes. Jump-starts, tire changes, lockouts, fuel delivery, and on-the-spot battery replacement are all flat $75 calls. Most are resolved without needing a tow." },
  { q: "Will you accept my insurance or auto club?", a: "Yes. We bill AAA, Geico, State Farm, Progressive, Allstate, USAA, and every major carrier directly. We also work with most fleet programs including Element, Holman, and ARI. Show the driver your card and you're done." },
  { q: "Can you tow luxury, classic, or exotic cars?", a: "Absolutely — we use enclosed and soft-strap flatbeds specifically for low-clearance, AWD, and collector vehicles. Request the luxury/classic tier when you call and we dispatch the right equipment the first time." },
  { q: "Do you service fleets and commercial accounts?", a: "Yes. We set up net-30 commercial accounts with dedicated dispatch, flat-rate contracts, and detailed per-vehicle invoicing. Ideal for delivery fleets, rental car branches, dealerships, and body shops." },
  { q: "What about heavy-duty — semis, buses, RVs?", a: "We operate medium and heavy wreckers in every major market. Class 7 and 8 tows, rollover recovery, load shifts, air-cushion recovery — all handled by certified heavy-duty operators." },
  { q: "Are your drivers licensed and insured?", a: "Every driver is fully licensed, background-checked, and covered by commercial liability and on-hook/cargo insurance. Certificates are available on request in under 24 hours." },
];

export const TOP_CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Miami", "Atlanta", "Denver", "Seattle", "Boston", "Nashville", "Portland", "Las Vegas", "Austin", "Charlotte", "Tampa"];

export const STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];
