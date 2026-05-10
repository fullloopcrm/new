// @ts-nocheck
/* ─── Stretch Service Types (11 total) ─── */

export interface Service {
  name: string;
  slug: string;
  tagline: string;
  shortDesc: string;
  description: string;
  features: string[];
  idealFor: string[];
}

export const services: Service[] = [
  {
    name: "Assisted Stretching",
    slug: "assisted-stretch-service",
    tagline: "Professional Hands-On Stretching Therapy",
    shortDesc: "One-on-one guided stretching with a certified therapist who moves your body through targeted positions for maximum flexibility gains.",
    description: "Assisted stretching is a hands-on therapy where a certified stretch therapist guides your body through targeted positions and movements that you cannot achieve on your own. Using techniques like PNF, your therapist applies precise pressure and resistance to unlock deep muscle tension, improve range of motion, and provide immediate pain relief.",
    features: ["One-on-one sessions with certified stretch therapist", "PNF techniques for maximum flexibility gains", "Full-body mobility assessment included", "Targets muscles you cannot reach on your own", "Immediate pain relief and tension release", "Personalized treatment plan for your body", "Professional equipment brought to your location", "Safe, controlled movements — no injury risk"],
    idealFor: ["Desk workers", "Athletes", "Seniors", "Post-surgery recovery", "Chronic pain sufferers", "Commuters"],
  },
  {
    name: "PNF Stretching",
    slug: "pnf-stretch-service",
    tagline: "The Gold Standard of Professional Stretching",
    shortDesc: "Proprioceptive Neuromuscular Facilitation — the most effective stretching technique used by therapists and sports professionals worldwide.",
    description: "PNF stretching is considered the most effective stretching technique in sports science. It combines passive stretching with isometric contractions to achieve maximum flexibility gains in minimum time. Studies show PNF produces 2-3x greater flexibility improvements than static stretching alone.",
    features: ["2-3x more effective than static stretching", "Contract-relax technique for deeper flexibility", "Activates your nervous system for greater range", "Used by Olympic athletes and pro sports teams", "Immediate measurable improvement per session", "Targets specific muscle groups with precision", "Safe when performed by certified therapists", "Ideal for breaking through flexibility plateaus"],
    idealFor: ["Athletes", "Runners", "Gym-goers", "Flexibility seekers", "Sports recovery", "Performance optimization"],
  },
  {
    name: "Active Stretching", slug: "active-stretch-service", tagline: "Strengthen and Stretch Simultaneously", shortDesc: "Use your own muscles to hold stretch positions, building strength and flexibility at the same time with therapist guidance.", description: "Active stretching involves holding a stretch position using the strength of your own muscles, with your therapist guiding proper form and alignment.", features: ["Builds strength while improving flexibility", "Engages opposing muscle groups naturally", "Improves functional range of motion", "Therapist guides proper form throughout", "Develops body awareness and control", "Reduces injury risk during physical activity", "Translates directly to daily movement", "No external force — your body does the work"], idealFor: ["Athletes", "Gym-goers", "Runners", "Active adults", "Yoga practitioners", "Dance professionals"],
  },
  {
    name: "Dynamic Stretching", slug: "dynamic-stretch-service", tagline: "Movement-Based Stretching for Peak Performance", shortDesc: "Controlled movements that take your joints through their full range of motion — the ideal warm-up for any physical activity.", description: "Dynamic stretching uses controlled, flowing movements to take your muscles and joints through their full range of motion. Research shows it improves performance by 5-10% and reduces injury risk.", features: ["Controlled movements through full range of motion", "Increases body temperature and blood flow", "Improves performance by 5-10% before activity", "Reduces injury risk significantly", "Mimics real-world movement patterns", "Activates nervous system for peak performance", "Customized sequences for your sport or activity", "Perfect pre-workout or pre-event warm-up"], idealFor: ["Pre-workout warm-up", "Runners", "Athletes", "Sports teams", "Morning routines", "Active lifestyles"],
  },
  {
    name: "Passive Stretching", slug: "passive-stretch-service", tagline: "Deep Relaxation and Flexibility Without Effort", shortDesc: "Your therapist does all the work — you relax completely while they guide your body into deep, restorative stretches.", description: "Passive stretching is the most relaxing form of assisted stretching. Your therapist moves your body into each stretch position while you remain completely relaxed.", features: ["Zero effort required — total relaxation", "Therapist controls all movement and depth", "Achieves deeper stretches than self-stretching", "Reduces cortisol and promotes calm", "Improves circulation and lymphatic flow", "Gentle and safe for all fitness levels", "Perfect for stress relief", "Ideal for recovery days and rest periods"], idealFor: ["Stress relief", "Beginners", "Seniors", "Post-travel recovery", "Hotel room sessions", "Relaxation seekers"],
  },
  {
    name: "Static Stretching", slug: "static-stretch-service", tagline: "Hold, Breathe, and Release Deep Tension", shortDesc: "Sustained stretch holds of 30-60 seconds with therapist assistance for maximum muscle lengthening and tension release.", description: "Static stretching involves holding a stretch position for 30-60 seconds, allowing the muscle to gradually lengthen and release tension.", features: ["Sustained holds of 30-60 seconds per stretch", "Gradual deepening as muscles release", "Maximum muscle lengthening and elongation", "Therapist monitors and adjusts intensity", "Improves overall flexibility over time", "Reduces delayed onset muscle soreness", "Promotes parasympathetic activation", "Foundation of all flexibility programs"], idealFor: ["Post-workout recovery", "Flexibility improvement", "Chronic tightness", "Better sleep", "Desk workers", "All fitness levels"],
  },
  {
    name: "Myofascial Release", slug: "myofascial-release-stretch-service", tagline: "Release the Fascia That's Keeping You Tight", shortDesc: "Targeted pressure on connective tissue (fascia) to break up adhesions, restore mobility, and eliminate chronic pain patterns.", description: "Myofascial release targets the fascia — the connective tissue that wraps around every muscle, bone, and organ in your body.", features: ["Targets fascia — the root cause of chronic tightness", "Breaks up adhesions and scar tissue", "Sustained pressure techniques for deep release", "Addresses pain patterns other methods miss", "Improves posture and structural alignment", "Reduces chronic pain from desk work", "Complements all other stretching techniques", "Long-lasting results with consistent sessions"], idealFor: ["Chronic pain sufferers", "Desk workers", "Tech neck", "Post-injury recovery", "Posture correction", "Commuters"],
  },
  {
    name: "Foam Rolling", slug: "foam-rolling-stretch-service", tagline: "Self-Myofascial Release with Expert Guidance", shortDesc: "Guided foam rolling techniques with professional instruction to target trigger points and maintain flexibility between sessions.", description: "Foam rolling is a self-myofascial release technique. Our therapists teach you proper foam rolling techniques customized for your body.", features: ["Expert-guided technique and form correction", "Customized routine for your specific needs", "Targets trigger points and muscle knots", "Improves blood flow and speeds recovery", "Tools to maintain progress between sessions", "Proper rolling speed, pressure, and duration", "Focus on commonly missed areas", "Take-home routine you can do daily"], idealFor: ["Gym-goers", "Runners", "Athletes", "Between-session maintenance", "Self-care routines", "Active lifestyles"],
  },
  {
    name: "Recovery Stretching", slug: "recovery-stretch-service", tagline: "Accelerate Your Body's Natural Recovery Process", shortDesc: "Post-workout, post-event, and post-travel stretching designed to reduce soreness, speed recovery, and prevent injury.", description: "Recovery stretching is specifically designed for after physical exertion — whether that is a marathon, a gym session, a day of sightseeing, or a long flight.", features: ["Reduces delayed onset muscle soreness", "Flushes metabolic waste from muscles", "Prevents post-activity stiffness and pain", "Combines gentle stretching and myofascial work", "Perfect after running, gym, or travel", "Improves next-day mobility significantly", "Accelerates natural recovery by 40-60%", "Mobile service — we come to you post-activity"], idealFor: ["Post-workout", "Marathon runners", "Tourists", "Gym-goers", "Post-flight recovery", "Weekend warriors"],
  },
  {
    name: "Gentle Stretch (Senior Mobility)", slug: "gentle-stretch-service", tagline: "Safe, Gentle Stretching for Active Aging", shortDesc: "Specialized gentle stretching program for seniors focused on maintaining mobility, preventing falls, and supporting independent living.", description: "Our Gentle Stretch program is specially designed for seniors and those with limited mobility, focusing on daily life movements.", features: ["Extra-gentle, slow-paced movements", "Focus on daily life movements and independence", "Fall prevention through better balance", "Chair-assisted options available", "Arthritis-friendly techniques", "Improves circulation and joint health", "Builds confidence in movement", "Therapists trained in senior-specific care"], idealFor: ["Seniors 65+", "Limited mobility", "Arthritis sufferers", "Fall prevention", "Post-surgery elderly", "Active aging"],
  },
  {
    name: "Ballistic Stretching", slug: "ballistic-stretch-service", tagline: "Advanced Dynamic Stretching for Peak Athletes", shortDesc: "Controlled bouncing movements at end range of motion — an advanced technique for athletes seeking maximum performance gains.", description: "Ballistic stretching uses controlled bouncing or swinging movements to push muscles beyond their normal range of motion. Reserved for conditioned athletes.", features: ["Advanced technique for conditioned athletes", "Controlled bouncing at end range of motion", "Rapid flexibility improvements when done safely", "Prepares body for explosive athletic movements", "Requires professional supervision for safety", "Builds on foundation of other stretching types", "Sport-specific movement preparation", "Progressive difficulty based on your level"], idealFor: ["Advanced athletes", "Martial artists", "Dancers", "Gymnasts", "Explosive sport athletes", "Conditioned individuals"],
  },
];

/* ─── Client Types ─── */

export interface ClientType { name: string; slug: string; emoji: string; shortDesc: string; painPoints: string[]; }

export const clientTypes: ClientType[] = [
  { name: "Desk Workers & Tech Professionals", slug: "desk-workers", emoji: "💻", shortDesc: "Chronic neck, shoulder, and back pain from sitting at a desk all day.", painPoints: ["Tech neck from screens", "Rounded shoulders", "Lower back pain", "Tight hip flexors", "Carpal tunnel risk", "Tension headaches"] },
  { name: "Commuters", slug: "commuters", emoji: "🚗", shortDesc: "Body strain from daily commuting — driving, trains, or sitting in traffic.", painPoints: ["Lower back from car seats", "Shoulder tension", "Hip tightness", "Neck pain", "Ankle stiffness", "Fatigue"] },
  { name: "Tourists & Travelers", slug: "tourists-travelers", emoji: "✈️", shortDesc: "Sore legs, tight muscles, and body fatigue after a day of exploring.", painPoints: ["Sightseeing exhaustion", "Sore feet and calves", "Tight lower back", "Jet lag stiffness", "Hotel bed aches", "Post-flight tightness"] },
  { name: "Athletes & Fitness Enthusiasts", slug: "athletes", emoji: "🏃", shortDesc: "Faster recovery, better performance, and injury prevention.", painPoints: ["Slow recovery", "Recurring injuries", "Flexibility plateaus", "Muscle imbalances", "Pre-event prep", "Post-workout tightness"] },
  { name: "Seniors & Active Agers", slug: "seniors", emoji: "🧓", shortDesc: "Maintaining mobility, preventing falls, and staying independent.", painPoints: ["Decreasing flexibility", "Fall risk", "Joint stiffness", "Daily task difficulty", "Balance issues", "Arthritis pain"] },
  { name: "Post-Surgery & Rehabilitation", slug: "post-surgery", emoji: "🏥", shortDesc: "Safe, guided stretching to support recovery after surgery or injury.", painPoints: ["Limited range of motion", "Scar tissue", "Muscle atrophy", "Fear of re-injury", "Slow recovery", "Pain management"] },
  { name: "Corporate & Office Teams", slug: "corporate-teams", emoji: "🏢", shortDesc: "On-site corporate wellness programs that reduce injuries and boost productivity.", painPoints: ["Employee back pain", "Workplace injuries", "Low productivity", "Healthcare costs", "Team stress", "Sedentary culture"] },
  { name: "Chronic Pain Sufferers", slug: "chronic-pain", emoji: "😣", shortDesc: "Long-term relief from sciatica, back pain, neck tension, and other chronic conditions.", painPoints: ["Sciatica", "Chronic back pain", "Neck tension", "Hip pain", "Fibromyalgia", "Tension headaches"] },
];

/* ─── States ─── */

export interface State { name: string; slug: string; abbr: string; }

export const states: State[] = [
  { name: "Alabama", slug: "alabama", abbr: "AL" }, { name: "Alaska", slug: "alaska", abbr: "AK" }, { name: "Arizona", slug: "arizona", abbr: "AZ" }, { name: "Arkansas", slug: "arkansas", abbr: "AR" }, { name: "California", slug: "california", abbr: "CA" }, { name: "Colorado", slug: "colorado", abbr: "CO" }, { name: "Connecticut", slug: "connecticut", abbr: "CT" }, { name: "Delaware", slug: "delaware", abbr: "DE" }, { name: "Florida", slug: "florida", abbr: "FL" }, { name: "Georgia", slug: "georgia", abbr: "GA" }, { name: "Hawaii", slug: "hawaii", abbr: "HI" }, { name: "Idaho", slug: "idaho", abbr: "ID" }, { name: "Illinois", slug: "illinois", abbr: "IL" }, { name: "Indiana", slug: "indiana", abbr: "IN" }, { name: "Iowa", slug: "iowa", abbr: "IA" }, { name: "Kansas", slug: "kansas", abbr: "KS" }, { name: "Kentucky", slug: "kentucky", abbr: "KY" }, { name: "Louisiana", slug: "louisiana", abbr: "LA" }, { name: "Maine", slug: "maine", abbr: "ME" }, { name: "Maryland", slug: "maryland", abbr: "MD" }, { name: "Massachusetts", slug: "massachusetts", abbr: "MA" }, { name: "Michigan", slug: "michigan", abbr: "MI" }, { name: "Minnesota", slug: "minnesota", abbr: "MN" }, { name: "Mississippi", slug: "mississippi", abbr: "MS" }, { name: "Missouri", slug: "missouri", abbr: "MO" }, { name: "Montana", slug: "montana", abbr: "MT" }, { name: "Nebraska", slug: "nebraska", abbr: "NE" }, { name: "Nevada", slug: "nevada", abbr: "NV" }, { name: "New Hampshire", slug: "new-hampshire", abbr: "NH" }, { name: "New Jersey", slug: "new-jersey", abbr: "NJ" }, { name: "New Mexico", slug: "new-mexico", abbr: "NM" }, { name: "New York", slug: "new-york", abbr: "NY" }, { name: "North Carolina", slug: "north-carolina", abbr: "NC" }, { name: "North Dakota", slug: "north-dakota", abbr: "ND" }, { name: "Ohio", slug: "ohio", abbr: "OH" }, { name: "Oklahoma", slug: "oklahoma", abbr: "OK" }, { name: "Oregon", slug: "oregon", abbr: "OR" }, { name: "Pennsylvania", slug: "pennsylvania", abbr: "PA" }, { name: "Rhode Island", slug: "rhode-island", abbr: "RI" }, { name: "South Carolina", slug: "south-carolina", abbr: "SC" }, { name: "South Dakota", slug: "south-dakota", abbr: "SD" }, { name: "Tennessee", slug: "tennessee", abbr: "TN" }, { name: "Texas", slug: "texas", abbr: "TX" }, { name: "Utah", slug: "utah", abbr: "UT" }, { name: "Vermont", slug: "vermont", abbr: "VT" }, { name: "Virginia", slug: "virginia", abbr: "VA" }, { name: "Washington", slug: "washington", abbr: "WA" }, { name: "West Virginia", slug: "west-virginia", abbr: "WV" }, { name: "Wisconsin", slug: "wisconsin", abbr: "WI" }, { name: "Wyoming", slug: "wyoming", abbr: "WY" },
];

/* ─── Cities (imported from batch files) ─── */

export interface City {
  name: string;
  slug: string;
  state: string;
  stateSlug: string;
  stateAbbr: string;
  population: number;
  description: string;
  landmarks: string[];
  vibe: string;
}

import { citiesBatch1 } from "./cities-batch1";
import { citiesBatch2 } from "./cities-batch2";
import { citiesBatch3 } from "./cities-batch3";
import { citiesBatch4 } from "./cities-batch4";
import { citiesBatch5 } from "./cities-batch5";

export const cities: City[] = [
  ...citiesBatch1,
  ...citiesBatch2,
  ...citiesBatch3,
  ...citiesBatch4,
  ...citiesBatch5,
];

/* ─── Parks & Tourist Spots (imported) ─── */

export interface Park {
  name: string;
  slug: string;
  city: string;
  citySlug: string;
  state: string;
  stateSlug: string;
  description: string;
  bestSpot: string;
  touristRating: number;
  nearbyAttractions: string[];
}

import { allParks } from "./parks-national";
import { beaches } from "./beaches";

export const parks: Park[] = [...allParks, ...beaches];

/* ─── Helper Functions ─── */

export function findStateBySlug(slug: string): State | undefined { return states.find((s) => s.slug === slug); }
export function findCityBySlug(stateSlug: string, citySlug: string): City | undefined { return cities.find((c) => c.stateSlug === stateSlug && c.slug === citySlug); }
export function findServiceBySlug(slug: string): Service | undefined { return services.find((s) => s.slug === slug); }
export function findParkBySlug(slug: string): Park | undefined { return parks.find((p) => p.slug === slug); }
export function getCitiesByState(stateSlug: string): City[] { return cities.filter((c) => c.stateSlug === stateSlug); }
export function getParksByCity(citySlug: string): Park[] { return parks.filter((p) => p.citySlug === citySlug); }
export function getParksByState(stateSlug: string): Park[] { return parks.filter((p) => p.stateSlug === stateSlug); }
export function getCityUrl(c: City): string { return `/locations/${c.stateSlug}/${c.slug}`; }
export function getCityServiceUrl(c: City, s: Service): string { return `/locations/${c.stateSlug}/${c.slug}/${s.slug}`; }
export function getStateUrl(s: State | string): string { const slug = typeof s === "string" ? states.find((st) => st.name === s)?.slug || s.toLowerCase().replace(/\s+/g, "-") : s.slug; return `/locations/${slug}`; }
export function getServiceUrl(s: Service): string { return `/services/${s.slug}`; }
export function getParkUrl(p: Park): string { return `/parks/${p.slug}`; }

/* ─── Site Constants ─── */

export const SITE_NAME = "Stretch Service";
export const SITE_URL = "https://www.stretchservice.com";
export const SITE_PHONE = "(888) 734-7274";
export const SITE_PHONE_LINK = "sms:+18887347274";
export const SITE_SMS_LINK = "sms:+18887347274";
export const SITE_EMAIL = "hello@stretchservice.com";
export const SITE_ADDRESS = "Nationwide Mobile Stretch Service";

export const OFFICES = [
  { city: "New York", state: "NY", address: "1411 Broadway, New York, NY 10018" },
  { city: "Miami", state: "FL", address: "1395 Brickell Ave, Miami, FL 33131" },
  { city: "Atlanta", state: "GA", address: "3344 Peachtree Rd NE, Atlanta, GA 30326" },
  { city: "Houston", state: "TX", address: "1301 Fannin St, Houston, TX 77002" },
  { city: "Dallas", state: "TX", address: "2200 Ross Ave, Dallas, TX 75201" },
  { city: "Chicago", state: "IL", address: "233 S Wacker Dr, Chicago, IL 60606" },
  { city: "Denver", state: "CO", address: "1801 California St, Denver, CO 80202" },
  { city: "Phoenix", state: "AZ", address: "2398 E Camelback Rd, Phoenix, AZ 85016" },
  { city: "Los Angeles", state: "CA", address: "10250 Constellation Blvd, Los Angeles, CA 90067" },
  { city: "Seattle", state: "WA", address: "1191 2nd Ave, Seattle, WA 98101" },
];
export const SITE_HOURS = "7AM - 10PM Daily";
export const SITE_PRICE = "$99";
export const SITE_WEEKLY_PRICE = "$89";
export const SITE_RATING = "5.0";
export const SITE_REVIEW_COUNT = "150";
export const SITE_INSTAGRAM = "@stretchservice";
