export const PHONE = "(212) 470-4068";
export const PHONE_HREF = "tel:+12124704068";
export const SMS_HREF = "sms:+12124704068";
export const EMAIL = "hi@thenyctowingservice.com";
export const HOURS = "24/7 — Every Day";
export const RATING = "4.9";
export const REVIEW_COUNT = "300+";
export const CITY_COUNT = "200+";
export const STATE_COUNT = "5";

// Services are defined in @/app/site/nyc-tow/_data/services.ts
// Re-export for backward compat
export { SERVICES } from "./services";

export const PRICING = {
  solo: {
    label: "Light-Duty Tow",
    price: "$125",
    unit: "base hook-up",
    features: [
      "Cars, sedans, compact SUVs",
      "First 5 miles included",
      "$4 / mile after 5",
      "24/7 dispatch",
      "20–40 min typical arrival",
      "Flat-rate quoted before hookup",
    ],
  },
  standard: {
    label: "Flatbed / AWD / Luxury",
    price: "$175",
    unit: "base hook-up",
    popular: true,
    features: [
      "Mandatory for AWD, 4WD, and EVs",
      "Required for low-clearance sports cars",
      "First 5 miles included",
      "$5 / mile after 5",
      "All four wheels off the ground",
      "24/7 dispatch",
      "Most common call in Manhattan",
    ],
  },
  emergency: {
    label: "Roadside Flat Rate",
    price: "$85",
    unit: "per call",
    features: [
      "Jump start / battery test",
      "Flat tire change",
      "Lockout service",
      "Gas delivery (fuel at cost)",
      "Winch-out from snow / ditch",
      "Credit toward tow if one is needed",
      "All five boroughs, 24/7",
    ],
  },
};

export const TESTIMONIALS = [
  { name: "Marcus T.", location: "Midtown, Manhattan", text: "Battery died in front of my building at 2 AM after a double shift. Truck showed up in 22 minutes. Driver tested the alternator too — told me the battery was the original, 7 years old, and replaced it on the spot. Back on the road in 40 minutes total.", rating: 5 },
  { name: "Priya S.", location: "Astoria, Queens", text: "Flat on the Grand Central at Northern Blvd exit. Dispatcher knew exactly where I was. Driver Felix mounted my spare faster than I could explain what happened. Flat rate, quoted on the phone, exactly what I paid.", rating: 5 },
  { name: "David K.", location: "Park Slope, Brooklyn", text: "AWD Subaru needed to go to the dealer in Jersey. They knew to send a flatbed without me asking. Strapped down right, took the Verrazzano instead of fighting Manhattan traffic, and the car was in the shop before lunch.", rating: 5 },
  { name: "Gina R.", location: "Riverdale, Bronx", text: "Got towed from a private lot I didn't realize was permit-only. Called these guys to get the car out of the pound. They handled all the paperwork, picked it up, and dropped it at my house same afternoon. Saved me most of a day off work.", rating: 5 },
  { name: "Kevin M.", location: "New Dorp, Staten Island", text: "Deer strike on Hylan at 11 PM. Collision tow, flatbed, photos for my insurance, direct drop to the body shop my carrier uses. Adjuster said our claim was the cleanest they'd processed all week.", rating: 5 },
  { name: "Alex W.", location: "LIC, Queens", text: "Runs a small DSP with 8 vans. Been on a fleet account for about a year. Priority dispatch is real — when one of my trucks goes down, I'm not sitting behind a 45-minute queue of AAA retail calls. Billing is clean, net 30, no surprises.", rating: 5 },
];

export const FAQ = [
  { q: "How fast can you get to me in NYC?", a: "Most calls inside the five boroughs see arrival in 20–40 minutes. We stage trucks in Manhattan, Brooklyn, Queens, the Bronx, and Staten Island, so there's always someone close. Peak rush hour, snowstorms, and major events can push that out — dispatch will quote a live ETA when you call." },
  { q: "How does your pricing work?", a: "Flat-rate, quoted on the phone before we dispatch. Light-duty tows start at $125 base plus per-mile past the first five. Flatbed starts at $175. Roadside services (jump, tire, lockout, gas) are $85 flat per call. No NYC surcharge, no hidden storage fees, no after-hours markup." },
  { q: "Do you tow AWD or EV vehicles?", a: "Yes, and only on flatbed. AWD and 4WD drivetrains get destroyed if dragged on wheels — transfer cases are expensive. Most EVs (Tesla, Mustang Mach-E, Rivian, Lucid, etc.) also require flatbed. If you ask for a flatbed, we send a flatbed. If you're not sure what your car needs, tell dispatch the make and model and we'll tell you." },
  { q: "What if I just need a jump or a tire change?", a: "That's roadside — $85 flat. We come to you with a real battery tester, a full-size impact gun, and the tools to do it right. If the battery is dead beyond saving, we can install a replacement on the spot for most common group sizes." },
  { q: "My car got towed by NYPD. Can you help?", a: "Yes. We run an impound recovery service — we navigate the paperwork at the pound, pay out any release fees (itemized on your invoice), and physically retrieve the vehicle. Works for NYPD pounds in Brooklyn, Queens, and Manhattan, as well as private impounds." },
  { q: "Do you handle insurance billing?", a: "For accident and collision tows, yes — we bill your carrier directly in most cases. For routine tows, you pay at drop-off and we email a receipt for reimbursement. We work with every major carrier (Geico, Progressive, State Farm, Allstate, Liberty Mutual, USAA, Farmers, and the specialty NYC carriers)." },
  { q: "Are you licensed and insured?", a: "Yes. NYC DCWP tow license, commercial auto, garage liability, and on-hook insurance. COI available within 24 hours for fleet and property-manager accounts." },
  { q: "Do you run 24/7?", a: "Yes. Dispatch and trucks run 24 hours a day, 365 days a year. Overnight rates are the same as daytime. Holiday rates are the same as weekdays. Snowstorm operations scale with conditions but we stay up as long as the roads are safe to operate on." },
];

export const TOP_CITIES = [
  "Midtown", "Times Square", "SoHo", "Tribeca", "Upper East Side",
  "Upper West Side", "Harlem", "Williamsburg", "Park Slope", "DUMBO",
  "Long Island City", "Astoria", "Flushing", "Jamaica", "Forest Hills",
  "Riverdale", "Fordham", "Pelham Bay", "St. George", "New Dorp",
];

export const STATES = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
