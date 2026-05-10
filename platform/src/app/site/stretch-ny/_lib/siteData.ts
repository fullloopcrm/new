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
    slug: "assisted-stretch-service-in-nyc",
    tagline: "Professional Hands-On Stretching Therapy",
    shortDesc: "One-on-one guided stretching with a certified therapist who moves your body through targeted positions for maximum flexibility gains.",
    description: "Assisted stretching is a hands-on therapy where a certified stretch therapist guides your body through targeted positions and movements that you cannot achieve on your own. Using techniques like PNF (Proprioceptive Neuromuscular Facilitation), your therapist applies precise pressure and resistance to unlock deep muscle tension, improve range of motion, and provide immediate pain relief. Unlike self-stretching, assisted stretching reaches muscles and fascia that are impossible to target alone.",
    features: [
      "One-on-one sessions with certified stretch therapist",
      "PNF techniques for maximum flexibility gains",
      "Full-body mobility assessment included",
      "Targets muscles you cannot reach on your own",
      "Immediate pain relief and tension release",
      "Personalized treatment plan for your body",
      "Professional equipment brought to your location",
      "Safe, controlled movements — no injury risk",
    ],
    idealFor: ["Desk workers", "Athletes", "Seniors", "Post-surgery recovery", "Chronic pain sufferers", "NYC commuters"],
  },
  {
    name: "PNF Stretching",
    slug: "pnf-stretch-service-in-nyc",
    tagline: "The Gold Standard of Professional Stretching",
    shortDesc: "Proprioceptive Neuromuscular Facilitation — the most effective stretching technique used by therapists and sports professionals worldwide.",
    description: "PNF stretching (Proprioceptive Neuromuscular Facilitation) is considered the most effective stretching technique in sports science. It combines passive stretching with isometric contractions to achieve maximum flexibility gains in minimum time. Originally developed for rehabilitation, PNF stretching tricks your nervous system into allowing deeper stretches by alternating between muscle contraction and relaxation. Studies show PNF stretching produces 2-3x greater flexibility improvements than static stretching alone.",
    features: [
      "2-3x more effective than static stretching",
      "Contract-relax technique for deeper flexibility",
      "Activates your nervous system for greater range",
      "Used by Olympic athletes and pro sports teams",
      "Immediate measurable improvement per session",
      "Targets specific muscle groups with precision",
      "Safe when performed by certified therapists",
      "Ideal for breaking through flexibility plateaus",
    ],
    idealFor: ["Athletes", "Runners", "Gym-goers", "Flexibility seekers", "Sports recovery", "Performance optimization"],
  },
  {
    name: "Active Stretching",
    slug: "active-stretch-service-in-nyc",
    tagline: "Strengthen and Stretch Simultaneously",
    shortDesc: "Use your own muscles to hold stretch positions, building strength and flexibility at the same time with therapist guidance.",
    description: "Active stretching involves holding a stretch position using the strength of your own muscles, with your therapist guiding proper form and alignment. Unlike passive stretching where someone pushes you into position, active stretching engages opposing muscle groups to create the stretch — strengthening one muscle while lengthening another. This technique improves functional flexibility that translates directly to real-world movement, making it perfect for athletes and active New Yorkers.",
    features: [
      "Builds strength while improving flexibility",
      "Engages opposing muscle groups naturally",
      "Improves functional range of motion",
      "Therapist guides proper form throughout",
      "Develops body awareness and control",
      "Reduces injury risk during physical activity",
      "Translates directly to daily movement",
      "No external force — your body does the work",
    ],
    idealFor: ["Athletes", "Gym-goers", "Runners", "Active adults", "Yoga practitioners", "Dance professionals"],
  },
  {
    name: "Dynamic Stretching",
    slug: "dynamic-stretch-service-in-nyc",
    tagline: "Movement-Based Stretching for Peak Performance",
    shortDesc: "Controlled movements that take your joints through their full range of motion — the ideal warm-up for any physical activity.",
    description: "Dynamic stretching uses controlled, flowing movements to take your muscles and joints through their full range of motion. Unlike holding a static position, dynamic stretching mimics the movements you will perform during exercise or daily activities, warming up your muscles while improving flexibility. Research shows dynamic stretching before activity improves performance by 5-10% and significantly reduces injury risk. Our therapists guide you through customized dynamic sequences tailored to your activity level and goals.",
    features: [
      "Controlled movements through full range of motion",
      "Increases body temperature and blood flow",
      "Improves performance by 5-10% before activity",
      "Reduces injury risk significantly",
      "Mimics real-world movement patterns",
      "Activates nervous system for peak performance",
      "Customized sequences for your sport or activity",
      "Perfect pre-workout or pre-event warm-up",
    ],
    idealFor: ["Pre-workout warm-up", "Runners", "Athletes", "Central Park joggers", "Sports teams", "Morning routines"],
  },
  {
    name: "Passive Stretching",
    slug: "passive-stretch-service-in-nyc",
    tagline: "Deep Relaxation and Flexibility Without Effort",
    shortDesc: "Your therapist does all the work — you relax completely while they guide your body into deep, restorative stretches.",
    description: "Passive stretching is the most relaxing form of assisted stretching. Your therapist moves your body into each stretch position while you remain completely relaxed — no effort required on your part. This allows for deeper stretches than you could ever achieve on your own, as your muscles are not fighting against the stretch. Passive stretching is particularly effective for reducing muscle tension, improving circulation, and promoting deep relaxation. It is ideal for stress relief, recovery, and those new to stretching.",
    features: [
      "Zero effort required — total relaxation",
      "Therapist controls all movement and depth",
      "Achieves deeper stretches than self-stretching",
      "Reduces cortisol and promotes calm",
      "Improves circulation and lymphatic flow",
      "Gentle and safe for all fitness levels",
      "Perfect for stress relief after NYC life",
      "Ideal for recovery days and rest periods",
    ],
    idealFor: ["Stress relief", "Beginners", "Seniors", "Post-travel recovery", "Hotel room sessions", "Relaxation seekers"],
  },
  {
    name: "Static Stretching",
    slug: "static-stretch-service-in-nyc",
    tagline: "Hold, Breathe, and Release Deep Tension",
    shortDesc: "Sustained stretch holds of 30-60 seconds with therapist assistance for maximum muscle lengthening and tension release.",
    description: "Static stretching involves holding a stretch position for 30-60 seconds, allowing the muscle to gradually lengthen and release tension. With therapist assistance, static stretching reaches depths that are impossible alone. Your therapist monitors your body's response and gradually increases the stretch as your muscles relax, ensuring maximum benefit without risk of injury. Static stretching is the foundation of flexibility improvement and is recommended post-workout, before bed, and as part of any recovery routine.",
    features: [
      "Sustained holds of 30-60 seconds per stretch",
      "Gradual deepening as muscles release",
      "Maximum muscle lengthening and elongation",
      "Therapist monitors and adjusts intensity",
      "Improves overall flexibility over time",
      "Reduces delayed onset muscle soreness (DOMS)",
      "Promotes parasympathetic nervous system activation",
      "Foundation of all flexibility programs",
    ],
    idealFor: ["Post-workout recovery", "Flexibility improvement", "Chronic tightness", "Better sleep", "Desk workers", "All fitness levels"],
  },
  {
    name: "Myofascial Release",
    slug: "myofascial-release-stretch-service-in-nyc",
    tagline: "Release the Fascia That's Keeping You Tight",
    shortDesc: "Targeted pressure on connective tissue (fascia) to break up adhesions, restore mobility, and eliminate chronic pain patterns.",
    description: "Myofascial release targets the fascia — the connective tissue that wraps around every muscle, bone, and organ in your body. When fascia becomes tight or restricted due to stress, injury, or repetitive movement (like sitting at a desk all day), it creates pain, stiffness, and limited mobility. Your therapist applies sustained pressure to fascial restrictions, allowing the tissue to slowly release and restore normal movement. This technique addresses the root cause of many chronic pain conditions that stretching alone cannot fix.",
    features: [
      "Targets fascia — the root cause of chronic tightness",
      "Breaks up adhesions and scar tissue",
      "Sustained pressure techniques for deep release",
      "Addresses pain patterns other methods miss",
      "Improves posture and structural alignment",
      "Reduces chronic pain from desk work and commuting",
      "Complements all other stretching techniques",
      "Long-lasting results with consistent sessions",
    ],
    idealFor: ["Chronic pain sufferers", "Desk workers", "Tech neck", "Post-injury recovery", "Posture correction", "NYC commuters"],
  },
  {
    name: "Foam Rolling",
    slug: "foam-rolling-stretch-service-in-nyc",
    tagline: "Self-Myofascial Release with Expert Guidance",
    shortDesc: "Guided foam rolling techniques with professional instruction to target trigger points, improve recovery, and maintain flexibility between sessions.",
    description: "Foam rolling is a self-myofascial release technique that uses body weight and a foam roller to target trigger points and tight muscles. While many people own a foam roller, most use it incorrectly — missing key areas, applying wrong pressure, or rolling too fast. Our therapists teach you proper foam rolling techniques and guide you through a complete routine customized for your body. This is the perfect complement to assisted stretching, giving you tools to maintain your progress between professional sessions.",
    features: [
      "Expert-guided technique and form correction",
      "Customized routine for your specific needs",
      "Targets trigger points and muscle knots",
      "Improves blood flow and speeds recovery",
      "Tools to maintain progress between sessions",
      "Proper rolling speed, pressure, and duration",
      "Focus on commonly missed areas",
      "Take-home routine you can do daily",
    ],
    idealFor: ["Gym-goers", "Runners", "Athletes", "Between-session maintenance", "Self-care routines", "Active lifestyles"],
  },
  {
    name: "Recovery Stretching",
    slug: "recovery-stretch-service-in-nyc",
    tagline: "Accelerate Your Body's Natural Recovery Process",
    shortDesc: "Post-workout, post-event, and post-travel stretching designed to reduce soreness, speed recovery, and prevent injury.",
    description: "Recovery stretching is specifically designed for after physical exertion — whether that's a marathon, a gym session, a day of walking NYC, or a long flight. Your therapist uses a combination of gentle static stretching, light PNF, and myofascial techniques to flush metabolic waste from your muscles, reduce inflammation, and prevent the stiffness that hits 24-48 hours later. For NYC tourists who have been walking 20,000+ steps exploring the city, recovery stretching is the difference between enjoying tomorrow and barely being able to move.",
    features: [
      "Reduces delayed onset muscle soreness (DOMS)",
      "Flushes metabolic waste from muscles",
      "Prevents post-activity stiffness and pain",
      "Combines gentle stretching and myofascial work",
      "Perfect after running, gym, or sightseeing",
      "Improves next-day mobility significantly",
      "Accelerates natural recovery by 40-60%",
      "Mobile service — we come to you post-activity",
    ],
    idealFor: ["Post-workout", "Marathon runners", "NYC tourists", "Gym-goers", "Post-flight recovery", "Weekend warriors"],
  },
  {
    name: "Gentle Stretch (Senior Mobility)",
    slug: "gentle-stretch-service-in-nyc",
    tagline: "Safe, Gentle Stretching for Active Aging",
    shortDesc: "Specialized gentle stretching program for seniors focused on maintaining mobility, preventing falls, and supporting independent living.",
    description: "Our Gentle Stretch program is specially designed for seniors and those with limited mobility. Using slow, controlled movements with extra care and attention, your therapist helps maintain and improve joint mobility, muscle flexibility, and balance. This program focuses on the movements that matter most for daily life — reaching overhead, bending down, getting in and out of chairs, and walking confidently. Regular gentle stretching helps prevent falls (the #1 cause of injury in seniors), maintains independence, and improves quality of life.",
    features: [
      "Extra-gentle, slow-paced movements",
      "Focus on daily life movements and independence",
      "Fall prevention through better balance and flexibility",
      "Chair-assisted options available",
      "Arthritis-friendly techniques",
      "Improves circulation and joint health",
      "Builds confidence in movement",
      "Therapists trained in senior-specific care",
    ],
    idealFor: ["Seniors 65+", "Limited mobility", "Arthritis sufferers", "Fall prevention", "Post-surgery elderly", "Active aging"],
  },
  {
    name: "Ballistic Stretching",
    slug: "ballistic-stretch-service-in-nyc",
    tagline: "Advanced Dynamic Stretching for Peak Athletes",
    shortDesc: "Controlled bouncing movements at end range of motion — an advanced technique for athletes seeking maximum performance gains.",
    description: "Ballistic stretching uses controlled bouncing or swinging movements to push muscles beyond their normal range of motion. This advanced technique is reserved for conditioned athletes and individuals with an existing flexibility base, as it requires proper form and supervision to be performed safely. When done correctly under professional guidance, ballistic stretching can produce rapid flexibility improvements and prepare the body for explosive movements. Our therapists only recommend this technique for clients who have graduated through our other stretching programs.",
    features: [
      "Advanced technique for conditioned athletes",
      "Controlled bouncing at end range of motion",
      "Rapid flexibility improvements when done safely",
      "Prepares body for explosive athletic movements",
      "Requires professional supervision for safety",
      "Builds on foundation of other stretching types",
      "Sport-specific movement preparation",
      "Progressive difficulty based on your level",
    ],
    idealFor: ["Advanced athletes", "Martial artists", "Dancers", "Gymnasts", "Explosive sport athletes", "Conditioned individuals"],
  },
];

/* ─── Client Types Who Benefit ─── */

export interface ClientType {
  name: string;
  slug: string;
  emoji: string;
  shortDesc: string;
  painPoints: string[];
}

export const clientTypes: ClientType[] = [
  { name: "Desk Workers & Tech Professionals", slug: "desk-workers", emoji: "💻", shortDesc: "Chronic neck, shoulder, and back pain from sitting at a desk all day in NYC offices.", painPoints: ["Tech neck from screens", "Rounded shoulders", "Lower back pain", "Tight hip flexors", "Carpal tunnel risk", "Tension headaches"] },
  { name: "NYC Commuters", slug: "nyc-commuters", emoji: "🚇", shortDesc: "Body strain from daily subway rides, standing on crowded trains, and walking miles across the city.", painPoints: ["Lower back from subway seats", "Shoulder strain from holding poles", "Hip tightness from standing", "Ankle stiffness from walking", "Neck pain from phone use on train", "General body fatigue"] },
  { name: "Tourists & Travelers", slug: "tourists-travelers", emoji: "✈️", shortDesc: "Sore legs, tight muscles, and body fatigue after walking 20,000+ steps exploring NYC all day.", painPoints: ["Exhaustion from sightseeing", "Sore feet and calves", "Tight lower back from walking", "Jet lag body stiffness", "Hotel bed body aches", "Post-flight tightness"] },
  { name: "Athletes & Fitness Enthusiasts", slug: "athletes", emoji: "🏃", shortDesc: "Faster recovery, better performance, and injury prevention for runners, gym-goers, and sports players.", painPoints: ["Slow recovery time", "Recurring injuries", "Flexibility plateaus", "Muscle imbalances", "Pre-event preparation", "Post-workout tightness"] },
  { name: "Seniors & Active Agers", slug: "seniors", emoji: "🧓", shortDesc: "Maintaining mobility, preventing falls, and staying independent through gentle, safe stretching therapy.", painPoints: ["Decreasing flexibility", "Fall risk", "Joint stiffness", "Difficulty with daily tasks", "Balance issues", "Arthritis pain"] },
  { name: "Post-Surgery & Rehabilitation", slug: "post-surgery", emoji: "🏥", shortDesc: "Safe, guided stretching to support recovery after surgery or injury, restoring range of motion progressively.", painPoints: ["Limited range of motion", "Scar tissue restriction", "Muscle atrophy", "Fear of re-injury", "Slow recovery", "Pain management"] },
  { name: "Corporate & Office Teams", slug: "corporate-teams", emoji: "🏢", shortDesc: "On-site corporate wellness programs that reduce workplace injuries, boost productivity, and improve team morale.", painPoints: ["Employee back pain", "Workplace injury risk", "Low energy and productivity", "High healthcare costs", "Team stress levels", "Sedentary work culture"] },
  { name: "Chronic Pain Sufferers", slug: "chronic-pain", emoji: "😣", shortDesc: "Long-term relief from sciatica, back pain, neck tension, and other chronic conditions through targeted stretching.", painPoints: ["Sciatica", "Chronic lower back pain", "Neck and shoulder tension", "Hip pain", "Fibromyalgia symptoms", "Tension headaches"] },
];

/* ─── Boroughs ─── */

export interface Borough {
  name: string;
  slug: string;
  shortName: string;
}

export const boroughs: Borough[] = [
  { name: "Manhattan", slug: "manhattan", shortName: "Manhattan" },
  { name: "Brooklyn", slug: "brooklyn", shortName: "Brooklyn" },
  { name: "Queens", slug: "queens", shortName: "Queens" },
  { name: "Bronx", slug: "bronx", shortName: "The Bronx" },
  { name: "Staten Island", slug: "staten-island", shortName: "Staten Island" },
];

/* ─── Neighborhoods (imported from borough files) ─── */

export interface Neighborhood {
  name: string;
  slug: string;
  borough: string;
  boroughSlug: string;
  description: string;
  landmarks: string[];
  vibe: string;
}

import { manhattanNeighborhoods } from "./neighborhoods-manhattan";
import { brooklynNeighborhoods } from "./neighborhoods-brooklyn";
import { queensNeighborhoods } from "./neighborhoods-queens";
import { bronxNeighborhoods } from "./neighborhoods-bronx";
import { statenIslandNeighborhoods } from "./neighborhoods-staten-island";

export const neighborhoods: Neighborhood[] = [
  ...manhattanNeighborhoods,
  ...brooklynNeighborhoods,
  ...queensNeighborhoods,
  ...bronxNeighborhoods,
  ...statenIslandNeighborhoods,
];

/* ─── Parks & Iconic Locations (imported from parks file) ─── */

export interface Park {
  name: string;
  slug: string;
  borough: string;
  boroughSlug: string;
  description: string;
  bestSpot: string;
  touristRating: number;
  nearbyAttractions: string[];
}

import { allParks } from "./parks-data";

export const parks: Park[] = allParks;

/* ─── Helper Functions ─── */

export function findBoroughBySlug(slug: string): Borough | undefined {
  return boroughs.find((b) => b.slug === slug);
}

export function findNeighborhoodBySlug(boroughSlug: string, neighborhoodSlug: string): Neighborhood | undefined {
  return neighborhoods.find((n) => n.boroughSlug === boroughSlug && n.slug === neighborhoodSlug);
}

export function findServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function findParkBySlug(slug: string): Park | undefined {
  return parks.find((p) => p.slug === slug);
}

export function getNeighborhoodsByBorough(boroughSlug: string): Neighborhood[] {
  return neighborhoods.filter((n) => n.boroughSlug === boroughSlug);
}

export function getParksByBorough(boroughSlug: string): Park[] {
  return parks.filter((p) => p.boroughSlug === boroughSlug);
}

export function getNeighborhoodUrl(n: Neighborhood): string {
  return `/locations/${n.boroughSlug}/${n.slug}`;
}

export function getNeighborhoodServiceUrl(n: Neighborhood, s: Service): string {
  return `/locations/${n.boroughSlug}/${n.slug}/${s.slug}`;
}

export function getBoroughUrl(b: Borough | string): string {
  const slug = typeof b === "string" ? boroughs.find((bo) => bo.name === b)?.slug || b.toLowerCase().replace(/\s+/g, "-") : b.slug;
  return `/locations/${slug}`;
}

export function getServiceUrl(s: Service): string {
  return `/services/${s.slug}`;
}

export function getParkUrl(p: Park): string {
  return `/parks/${p.slug}`;
}

/* ─── Site Constants ─── */

export const SITE_NAME = "Stretch NYC";
export const SITE_URL = "https://www.stretchny.com";
export const SITE_PHONE = "212-202-7080";
export const SITE_PHONE_LINK = "sms:+12122027080";
export const SITE_SMS_LINK = "sms:+12122027080";
export const SITE_EMAIL = "hello@stretchny.com";
export const SITE_ADDRESS = "150 W 47th Street, New York, NY 10036";
export const SITE_HOURS = "7AM - 10PM Daily";
export const SITE_PRICE = "$99";
export const SITE_WEEKLY_PRICE = "$89";
export const SITE_RATING = "5.0";
export const SITE_REVIEW_COUNT = "31";
export const SITE_INSTAGRAM = "@stretchnewyorkcity";
