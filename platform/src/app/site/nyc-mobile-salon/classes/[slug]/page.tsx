import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allClasses, classCategories, boroughNames, neighborhoods } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { getClassBySlug, courseSchema, faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import { classContent } from "@/app/site/nyc-mobile-salon/_lib/class-content";

export const revalidate = 2592000;

export const dynamicParams = true

export async function generateStaticParams() { return [] }

type Props = { params: Promise<{ slug: string }> };

function isMensClass(slug: string): boolean {
  return slug === "mens-grooming-101";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cls = getClassBySlug(slug);
  if (!cls) return {};
  const content = classContent[slug];
  return {
    title: `${cls.name} in NYC — Mobile Beauty Workshop at Your Door`,
    description: `Book a ${cls.name.toLowerCase()} anywhere in NYC. ${cls.description}. ${cls.duration}, groups of ${cls.groupSize}.${content ? ` From ${content.price}.` : ""} The NYC Mobile Salon.`,
    alternates: { canonical: `https://thenycmobilesalon.com/classes/${slug}` },
  };
}

function getRelatedClasses(currentSlug: string) {
  return allClasses.filter((c) => c.slug !== currentSlug).slice(0, 4);
}

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

/** Per-class "Why Take This Class" benefits */
const classWhyBenefits: Record<string, { title: string; desc: string }[]> = {
  "diy-blowout-workshop": [
    { title: "Save Hundreds on Salon Visits", desc: "New Yorkers spend $65-$95 per blowout. Learning to do your own means you keep that money in your pocket week after week, year after year." },
    { title: "Look Polished Every Single Day", desc: "A great blowout is the foundation of looking put-together. Master this skill and you will never have a bad hair day again, whether it is a Monday morning meeting or a Friday night out." },
    { title: "Learn Techniques for Your Hair Type", desc: "Our instructors specialize in every hair texture, from fine and straight to thick, curly, and coily. You will learn the exact technique that works for your hair, not a generic one-size-fits-all approach." },
    { title: "Make Your Style Last 3-5 Days", desc: "The secret to a long-lasting blowout is not just the styling itself, it is how you prep, dry, and finish. We teach you all the tricks the pros use to extend the life of every blowout." },
    { title: "Bond with Friends While Learning", desc: "Turn a practical skill into a social event. Our blowout workshops are some of the most popular girls' night activities in New York City because everyone leaves looking and feeling amazing." },
  ],
  "braiding-basics-class": [
    { title: "Master Multiple Braid Styles", desc: "Walk away knowing 4-5 different braid techniques, from classic French braids to intricate fishtails and rope braids. Each style opens up dozens of hairstyle possibilities." },
    { title: "Do Your Kids' Hair Like a Pro", desc: "No more YouTube tutorial frustration at 7 AM before school. Learn the real techniques professional braiders use so you can create neat, beautiful braids quickly and confidently." },
    { title: "Perfect for Bridal Parties", desc: "Bridesmaids who can braid save the entire wedding party time and money on hair. Learn together at a bridal shower or bachelorette and have a blast doing it." },
    { title: "Build a Lifelong Skill", desc: "Braiding is one of those rare skills that only gets better with practice. Once you learn the fundamentals, you will keep improving for years and never stop finding new styles to try." },
    { title: "All Hair Types Welcome", desc: "Our instructors teach braiding techniques that work across every hair texture. Whether your hair is silky straight or beautifully coily, you will learn the approach that works best for you." },
  ],
  "everyday-makeup-masterclass": [
    { title: "Save Time Every Morning", desc: "A streamlined 10-15 minute routine means you get more sleep and still look polished. Our makeup artists show you which steps actually matter and which ones you can skip." },
    { title: "Stop Wasting Money on Wrong Products", desc: "Most people own dozens of products they never use. Learn which five to ten products actually work for your skin tone, type, and lifestyle so you stop buying things that collect dust." },
    { title: "Feel Confident Without Overdoing It", desc: "The best everyday makeup looks effortless. We teach you the natural, put-together look that works for the office, brunch, errands, and everything in between." },
    { title: "Learn Professional Application Techniques", desc: "There is a reason makeup artists make it look so easy. Small adjustments in brush angle, product placement, and blending technique make an enormous difference in the final result." },
    { title: "Get a Personalized Face Chart", desc: "Every participant leaves with a custom face chart showing exactly where to place each product on their unique face shape. It is like a cheat sheet you can follow every morning." },
  ],
  "skincare-routine-workshop": [
    { title: "Build a Routine That Actually Works", desc: "Stop guessing and start using a dermatologist-informed routine built specifically for your skin type, concerns, and budget. No more wasting money on trendy products that do nothing." },
    { title: "Understand Ingredients Like a Pro", desc: "Learn what retinol, niacinamide, hyaluronic acid, and vitamin C actually do so you can read labels, compare products, and make informed decisions for the rest of your life." },
    { title: "Get a Professional Skin Analysis", desc: "Every participant receives a mini skin analysis from a licensed esthetician. Know your skin type, identify your real concerns, and get a routine tailored to exactly what your skin needs." },
    { title: "Stop Falling for Marketing Hype", desc: "The skincare industry spends billions on marketing. We teach you how to spot the BS, avoid overpriced products, and find affordable alternatives that work just as well." },
    { title: "See Real Results in Weeks", desc: "A properly built skincare routine shows visible improvement within two to four weeks. We set you up with the right products in the right order so you see results fast." },
  ],
  "group-nail-art-class": [
    { title: "Create Salon-Quality Nail Art at Home", desc: "Professional nail art can cost $80-$150 per session in NYC. Learn to create beautiful designs yourself and save hundreds of dollars over the course of a year." },
    { title: "Learn 3-5 Professional Designs", desc: "Our nail artists teach you real techniques, from dotting and striping to gradients and freehand florals. You will leave with a portfolio of designs you can recreate anytime." },
    { title: "Perfect Party Activity", desc: "Nail art classes are one of the most popular group activities for birthdays, bachelorettes, teen parties, and girls' nights. Everyone gets creative, everyone has fun, and everyone leaves with beautiful nails." },
    { title: "All Materials Provided", desc: "We bring everything, including practice tips so you can experiment freely without worrying about messing up your real nails. Try bold designs risk-free before committing." },
    { title: "Express Your Creativity", desc: "Nail art is one of the most accessible forms of creative expression. No artistic background needed, our instructors break every design down into simple, repeatable steps anyone can follow." },
  ],
  "mens-grooming-101": [
    { title: "Look Sharp Without the Effort", desc: "A solid grooming routine takes 3-5 minutes a day. Learn the fundamentals that make the biggest visual difference so you look polished with minimal time investment." },
    { title: "Save Money Between Barber Visits", desc: "Maintaining your neckline, trimming your beard, and keeping your brows clean between barber visits means you always look fresh, not just the day after your appointment." },
    { title: "Build a Real Skincare Routine", desc: "Most guys use bar soap on their face and wonder why their skin looks rough. We build you a simple, effective 3-step routine that works for your skin type and takes almost no time." },
    { title: "Get Wedding-Ready", desc: "Grooms and groomsmen who take this class show up on the big day looking their absolute best. Start your grooming routine weeks before the wedding and see the difference it makes." },
    { title: "No Judgment, No Pretension", desc: "This is a practical, no-nonsense class for regular guys who want to look better. No one cares what you know or do not know coming in, we meet you where you are." },
  ],
};

/** Per-class "What to Expect" session descriptions */
const classWhatToExpect: Record<string, string[]> = {
  "diy-blowout-workshop": [
    "When our instructor arrives at your location, they will set up a full styling station with professional-grade blow dryers, round brushes in multiple sizes, clips, heat protectant, and finishing products. Each participant gets their own set of tools to work with throughout the session. We start with a brief introduction where the instructor assesses each person's hair type and discusses what kind of blowout will work best for their texture and length. This initial consultation ensures that everyone gets personalized instruction rather than a generic demonstration.",
    "The core of the workshop is hands-on practice. After demonstrating each technique on a volunteer, the instructor guides everyone through the process step by step. You will learn how to properly section your hair, how to hold the round brush at the correct angle for maximum volume and smoothness, how to control tension without causing breakage, and how to use the dryer nozzle to direct airflow for a sleek finish. The instructor moves around the room correcting form, answering questions, and offering tips specific to each person's hair. Expect to practice each section multiple times until the technique clicks.",
    "The session wraps up with finishing techniques, including how to set your blowout with cool air, how to add shine without weighing hair down, and how to sleep on your blowout so it lasts multiple days. Every participant receives a personalized cheat sheet with product recommendations and technique reminders. Most people are surprised by how much better their blowout looks by the end of the session compared to the beginning. The improvement is visible and immediate, and that confidence carries over into every blowout you do at home going forward.",
  ],
  "braiding-basics-class": [
    "Our braiding specialist arrives at your location with mannequin heads, clips, combs, hair elastics, and everything else you need for a productive two-hour session. We start with the absolute fundamentals: how to hold hair, how to create clean sections, and how to maintain even tension throughout a braid. Even if you have braided before, this foundational review helps eliminate bad habits that make braids look messy or fall apart quickly.",
    "From there, we build up progressively through four to five braid styles. The instructor demonstrates each technique slowly, then has everyone practice together with real-time coaching and corrections. You will work on mannequin heads first to build muscle memory, then transition to practicing on each other or on your own hair. The instructor pays close attention to each person's progress and adjusts the pacing so no one feels left behind or bored. By the halfway point, most participants are already completing braids they could never do before.",
    "The final portion of the class focuses on finishing and styling, learning how to secure braids neatly, how to pancake braids for a fuller look, and how to incorporate braids into everyday hairstyles. You will leave with a step-by-step guide for each braid style covered, plus recommendations for the best tools and products to use at home. Many participants tell us this class is the most fun they have had learning a new skill, because there is something deeply satisfying about watching your hands finally do what your brain has been trying to figure out from YouTube tutorials.",
  ],
  "everyday-makeup-masterclass": [
    "Your makeup artist arrives with a full professional kit, including a curated selection of foundations, concealers, brow products, eyeshadows, blushes, and lip colors across a wide range of skin tones. Each participant works on their own face throughout the class, which means you leave looking great and knowing exactly how to recreate the look at home. We start with skin prep, covering the correct way to moisturize and prime so your makeup lasts all day without creasing, fading, or oxidizing.",
    "The main portion of the class walks through each step of a polished everyday routine. Your instructor demonstrates on one participant, then guides everyone through the application together. We cover foundation matching and application (brush, sponge, and fingers, so you know all three methods), concealer placement and blending, brow shaping and filling, a simple eye look using two to three shadows, mascara technique, blush and bronzer placement, and lip options from natural to bold. The instructor helps each person individually, adjusting technique and product choices based on their skin type, face shape, and personal style preferences.",
    "The session ends with a day-to-night transition demonstration, showing you how to take your daytime look and elevate it for evening in under five minutes. Every participant receives a personalized face chart, a visual diagram of their face showing exactly where each product goes, what shades to use, and in what order. This face chart becomes your daily reference until the routine becomes second nature. Most participants tell us they feel more confident applying makeup after ninety minutes with us than after years of watching tutorials online.",
  ],
  "skincare-routine-workshop": [
    "Our licensed esthetician arrives with a portable skin analysis setup, a curated collection of cleansers, exfoliants, serums, moisturizers, and sunscreens, plus ingredient reference materials. The session begins with individual mini skin analyses for each participant. Using professional lighting and a magnifying lens, the esthetician examines each person's skin and identifies their skin type (oily, dry, combination, sensitive, or normal) along with specific concerns like acne, hyperpigmentation, fine lines, dehydration, or redness. This analysis alone is worth the price of the class, as many people have been treating the wrong skin type for years.",
    "With everyone's skin type identified, the esthetician walks the group through building a complete routine step by step. You will learn the correct order of application (it matters more than most people realize), how long to wait between layers, how much product to use, and which ingredients should never be combined. The class covers the five core steps of any effective routine: cleansing, exfoliating (and how often), treating (serums and actives), moisturizing, and protecting with SPF. Along the way, you will test products on your skin so you can feel the difference between textures and formulations.",
    "The workshop wraps up with an ingredient education segment where you learn to read product labels, identify the ingredients that actually work, and spot marketing claims that sound impressive but mean nothing. Every participant receives a personalized routine recommendation listing specific products at multiple price points (drugstore, mid-range, and luxury) so you can build your routine within your budget. You will also learn how to adjust your routine seasonally, because what works in a humid NYC summer is very different from what works in a dry, heated NYC winter.",
  ],
  "group-nail-art-class": [
    "Our nail artist arrives with a complete mobile nail art studio, including polishes in every color, dotting tools, striping brushes, stamping plates, nail tape, glitter, practice tips (fake nails), and everything else you need for a creative two-hour session. We start by setting up individual workstations for each participant and reviewing the basics of nail art: how to hold a brush, how to control polish flow, and how to fix mistakes without starting over. Even if you have never done anything beyond a solid color manicure, you will feel comfortable within the first fifteen minutes.",
    "The core of the class covers three to five nail art designs, progressing from simple to more complex. The instructor demonstrates each design step by step, then guides everyone through recreating it on their practice tips. Expect to learn techniques like dotting (polka dots, flowers, animal prints), striping (geometric patterns, French tips, negative space designs), color blocking, gradient and ombre effects, and at least one advanced freehand design. You practice each design multiple times on fake nails before trying it on your actual nails, so there is zero pressure to get it perfect the first time.",
    "The session ends with each participant creating a finished set of nail art on their own nails or on a display set they can take home. The instructor provides a take-home technique guide with step-by-step instructions for every design covered in class, plus recommendations for affordable tools and polishes you can order online. Many participants are genuinely amazed at what they are able to create by the end of the session. The jump from never having done nail art to confidently executing multiple designs in two hours is dramatic and deeply satisfying.",
  ],
  "mens-grooming-101": [
    "Our grooming specialist, a licensed barber with years of experience, arrives at your location with a full kit including skincare products, beard trimmers, shaping tools, brow grooming equipment, and product samples. The session starts with a straightforward assessment: what is your current routine, what are your biggest grooming frustrations, and what do you want to improve? No one is judged for not knowing anything. Most guys who take this class are starting from zero, and that is exactly who it is designed for.",
    "The hands-on portion covers the full grooming spectrum. For skincare, you will build a simple three-step routine (cleanser, moisturizer, SPF) that takes under three minutes and actually works for your skin type. For beard care, you will learn trimming techniques, how to shape your beard to complement your face shape, and how to maintain a clean neckline between barber visits. The instructor demonstrates each technique, then guides everyone through practicing it themselves. We also cover brow grooming basics, nose and ear hair management, and how to choose products that actually do what they claim.",
    "The class wraps up with personalized grooming plans for each participant. Your instructor will recommend specific products based on your skin type, facial hair pattern, and budget, and give you a simple daily and weekly routine to follow. Most guys are surprised by how little time and effort it actually takes to look significantly more polished. The difference between no grooming routine and a basic grooming routine is dramatic, and it shows up in how people perceive you at work, on dates, and in everyday life. You will leave with the knowledge and confidence to maintain your look every single day.",
  ],
};

/** Per-class "How It Works" steps */
const classHowItWorks: Record<string, { step: string; title: string; desc: string }[]> = {
  "diy-blowout-workshop": [
    { step: "1", title: "Choose Your Date and Location", desc: "Pick any date that works for your group and tell us where you want the class held. Your apartment, a friend's place, an office, a hotel suite, anywhere in the five boroughs of NYC." },
    { step: "2", title: "Gather Your Group", desc: "Round up 3 or more friends, family members, or coworkers who want to learn. The more people, the more fun. We can accommodate groups of up to 10 per instructor." },
    { step: "3", title: "We Come to You Fully Equipped", desc: "Our licensed hairstylist arrives at your door with professional blow dryers, round brushes, clips, heat protectant, and every product you need. You do not need to buy or prepare anything." },
    { step: "4", title: "Learn, Practice, and Leave Looking Amazing", desc: "Spend 90 minutes learning, practicing on your own hair, and getting personalized feedback. You leave with a new skill, a cheat sheet, and a salon-quality blowout." },
  ],
  "braiding-basics-class": [
    { step: "1", title: "Book Your Session Online", desc: "Choose a date, tell us your location in NYC, and let us know how many people will be joining. We will confirm your booking within 24 hours and answer any questions." },
    { step: "2", title: "Invite Your Group", desc: "Gather 3 or more friends, family members, or coworkers. This class works especially well for bridal parties, birthday celebrations, mother-daughter bonding, or just a fun weeknight activity." },
    { step: "3", title: "Your Instructor Arrives Ready to Teach", desc: "Our braiding specialist shows up with mannequin heads, tools, elastics, and everything needed for a productive two-hour session. All you need to provide is the space and the enthusiasm." },
    { step: "4", title: "Practice Until It Clicks", desc: "Work through 4-5 braid styles with hands-on guidance. By the time your instructor leaves, you will be able to do at least three new braid styles on your own." },
  ],
  "everyday-makeup-masterclass": [
    { step: "1", title: "Request Your Preferred Date", desc: "Submit a booking request with your preferred date, time, location, and group size. We will match you with the perfect makeup artist for your group and confirm within 24 hours." },
    { step: "2", title: "Assemble Your Group", desc: "Get 3 or more people together. This class is popular for bachelorette parties, birthday celebrations, corporate team-building events, and casual girls' nights at home." },
    { step: "3", title: "Your Makeup Artist Sets Up Shop", desc: "Our licensed MUA arrives with a professional kit covering every skin tone and type. They set up individual stations so each person can work on their own face with proper lighting and mirrors." },
    { step: "4", title: "Learn Your Perfect Routine", desc: "Over 90 minutes, you build a complete everyday look step by step. You leave wearing your finished makeup and carrying a personalized face chart you can reference every morning." },
  ],
  "skincare-routine-workshop": [
    { step: "1", title: "Book Your Workshop", desc: "Choose your date, tell us where you are in NYC, and let us know your group size. We will pair you with a licensed esthetician who specializes in the skin concerns most relevant to your group." },
    { step: "2", title: "Get Your Group Together", desc: "Invite 3 or more friends, family, or coworkers. This workshop is perfect for wellness nights, bridal party prep, corporate wellness events, or anyone who wants to finally understand skincare." },
    { step: "3", title: "Your Esthetician Arrives Fully Prepared", desc: "Our licensed esthetician brings a portable skin analysis setup, a curated product collection across price points, and ingredient reference materials. Come with clean, bare skin for the best experience." },
    { step: "4", title: "Leave with a Complete Routine", desc: "After 90 minutes, every participant has a personalized skincare routine, product recommendations at their budget, and the knowledge to make smart skincare decisions for life." },
  ],
  "group-nail-art-class": [
    { step: "1", title: "Pick Your Date and Spot", desc: "Tell us when and where you want your nail art class. Living room, backyard, office break room, hotel room, wherever your group is comfortable, we will make it work." },
    { step: "2", title: "Rally Your Crew", desc: "Get 3 or more nail art enthusiasts (or total beginners) together. This class is a hit at birthday parties, bachelorettes, teen sleepovers, and creative team outings." },
    { step: "3", title: "Your Nail Artist Brings Everything", desc: "Our professional nail artist arrives with polishes, tools, practice tips, and all the materials needed for a two-hour creative session. You do not need to own a single nail polish." },
    { step: "4", title: "Create and Take Home Your Designs", desc: "Learn 3-5 designs, practice on fake nails, then create a finished set on your own nails. Leave with a technique guide and the confidence to do nail art at home." },
  ],
  "mens-grooming-101": [
    { step: "1", title: "Book Your Session", desc: "Tell us your date, location, and group size. We will match you with a licensed barber and grooming specialist who knows how to teach guys the fundamentals without any pretension." },
    { step: "2", title: "Get the Guys Together", desc: "Round up 3 or more friends, groomsmen, coworkers, or roommates. This class is popular for bachelor parties, groom prep, corporate events, and groups of guys who just want to look better." },
    { step: "3", title: "Your Grooming Specialist Shows Up Ready", desc: "Our instructor arrives with skincare products, beard trimmers, shaping tools, brow equipment, and product samples. No preparation required on your end, just show up as you are." },
    { step: "4", title: "Walk Away with a Complete Routine", desc: "In 90 minutes, you will build a personalized grooming routine covering skincare, beard care, and maintenance. You leave knowing exactly what to do every morning and which products to buy." },
  ],
};

export default async function ClassPage({ params }: Props) {
  const { slug } = await params;
  const cls = getClassBySlug(slug);
  if (!cls) notFound();

  const isMens = isMensClass(slug);
  const content = classContent[slug];
  const related = getRelatedClasses(slug);
  const whyBenefits = classWhyBenefits[slug] || [];
  const whatToExpect = classWhatToExpect[slug] || [];
  const howItWorks = classHowItWorks[slug] || [];

  const faqs = [
    { q: `How much does ${cls.name.toLowerCase()} cost?`, a: `Our ${cls.name.toLowerCase()} is priced at $99 per hour with a two-hour minimum for groups of 3 or more people.${content ? ` Per-person pricing starts at ${content.price} depending on group size and session length.` : ""} This rate covers the instructor's travel to your location anywhere in the five boroughs of NYC, all materials and tools needed for the class, and personalized instruction for every participant. There are no hidden fees, no setup charges, and no travel surcharges regardless of which borough you are in. For the most up-to-date pricing details and package options, visit our pricing page.` },
    { q: `Do I need any experience for ${cls.name.toLowerCase()}?`, a: `No prior experience is needed whatsoever. Our ${cls.name.toLowerCase()} is designed to accommodate complete beginners as well as people with some existing knowledge who want to refine their technique. Our instructor assesses each participant's current skill level at the beginning of the session and adapts their teaching accordingly. Whether you have never picked up a ${slug.includes("blowout") ? "round brush" : slug.includes("braid") ? "braid" : slug.includes("makeup") ? "makeup brush" : slug.includes("skincare") ? "serum" : slug.includes("nail") ? "dotting tool" : "trimmer"} before or you practice regularly and want professional-level tips, you will get value from this class. We meet every participant exactly where they are and help them level up from there.` },
    { q: `What materials do I need to bring?`, a: `You do not need to bring anything at all. We arrive at your location with every single tool, product, and material needed for the class. This includes professional-grade equipment, a curated selection of products across brands and price points, practice materials, and any reference guides or handouts.${slug.includes("makeup") || slug.includes("skincare") ? " The one thing we ask is that you come with clean, bare skin so we can start fresh and you get the most accurate results from any skin analysis or product application." : ""} If you want to bring your own products or tools that you currently use, you are welcome to, and our instructor can evaluate them and suggest improvements. But it is absolutely not required.` },
    { q: `How many people can attend ${cls.name.toLowerCase()}?`, a: `${cls.name} works best with groups of ${cls.groupSize} people, which is the ideal range for hands-on instruction where everyone gets personal attention. The minimum group size is 3 people. If you have a larger group, we can absolutely accommodate you by bringing additional instructors. Groups of 10 to 20 people typically require two instructors, and we have handled groups of up to 30 for corporate events and large celebrations. Just let us know your group size when booking and we will make sure you have enough instructors for everyone to get quality one-on-one guidance.` },
    { q: `Can I book a private one-on-one lesson?`, a: `Yes, we offer private one-on-one sessions for ${cls.name.toLowerCase()}. Private lessons are priced at $99 per hour with a two-hour minimum. The advantage of a private session is that you get the instructor's full, undivided attention for the entire class, which means faster skill development and completely personalized instruction. Many of our clients book private sessions when they have a specific goal in mind, like mastering a particular technique before an event, or when they prefer learning without a group setting. Contact us to schedule your private lesson at a time and location that works for you.` },
    { q: `How long does ${cls.name.toLowerCase()} take?`, a: `The standard ${cls.name.toLowerCase()} session runs ${cls.duration}. This is enough time to cover all the core techniques, give every participant hands-on practice, and answer questions. If your group wants a longer, more in-depth session, we can extend the class in one-hour increments at $99 per additional hour. Some groups choose to book a two-and-a-half or three-hour session for a more relaxed pace, especially for celebrations like bachelorette parties or birthdays where the social aspect is as important as the learning. Let us know your preference when booking and we will customize the session length to fit your group.` },
    { q: `What will I be able to do after completing this class?`, a: `After completing ${cls.name.toLowerCase()}, you will have the skills and confidence to ${slug.includes("blowout") ? "give yourself a salon-quality blowout at home that lasts 3-5 days, using the correct sectioning, brush angles, and finishing techniques" : slug.includes("braid") ? "execute at least 3-4 different braid styles confidently, including French braids, Dutch braids, and fishtails, on yourself or someone else" : slug.includes("makeup") ? "apply a polished, professional-looking everyday makeup routine in 10-15 minutes, including foundation, concealer, brows, eyes, and lips" : slug.includes("skincare") ? "build and maintain a complete skincare routine tailored to your specific skin type and concerns, read ingredient labels confidently, and make informed product purchasing decisions" : slug.includes("nail") ? "create 3-5 different nail art designs at home using professional techniques like dotting, striping, gradients, and freehand art" : "maintain a complete daily grooming routine including skincare, beard trimming and shaping, brow grooming, and product selection"}. Every participant also leaves with written reference materials so you can refresh your memory at home. The skills you learn in this class are permanent. Once the technique clicks, you have it for life.` },
    { q: `Do you actually come to my location?`, a: `Yes, we are a fully mobile service. Our instructors travel to your location anywhere in the five boroughs of New York City, including Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. We come to apartments, houses, offices, hotel rooms, Airbnbs, event venues, rooftops, backyards, and any other space where your group is comfortable. All we need is enough room for your group to sit or stand comfortably with some elbow room. There is no additional travel fee regardless of where you are in NYC. We arrive on time with all equipment set up and ready to go, and we clean up everything when we leave.` },
  ];

  const heroStyle = isMens
    ? { background: "linear-gradient(135deg, #1a1a1a 0%, #0c2340 50%, #1a1a1a 100%)" }
    : { background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" };

  const accentColor = isMens ? "sky" : "purple";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        courseSchema({ name: `${cls.name} in NYC`, description: `${cls.description}. Hands-on workshop, ${cls.duration}, groups of ${cls.groupSize}.`, url: `https://thenycmobilesalon.com/classes/${slug}`, duration: cls.duration, groupSize: cls.groupSize })
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        faqSchema(faqs)
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Classes", url: "/classes" }, { name: cls.name, url: `/classes/${slug}` }])
      ) }} />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={heroStyle}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            <Link href="/classes" className="hover:text-white/80">Classes</Link>
            <span>/</span>
            <span className="text-white/40">{cls.name}</span>
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
            {cls.name}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            {cls.description}. {cls.duration}, groups of {cls.groupSize} — at your location anywhere in NYC.
            {content ? ` From ${content.price}.` : ""} $99/hour, 2-hour minimum for groups of 3+.
          </p>
          <div className="mt-8">
            <Link href="/book" className={isMens ? "inline-block rounded-full bg-sky-500 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-600 font-display" : "inline-block rounded-full bg-white px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-purple-700 shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-50 font-display"}>Book This Class</Link>
          </div>
        </div>
      </section>

      {/* Content */}
      {content && (
        <section className="bg-white px-6 py-16 md:py-20">
          <div className="mx-auto max-w-4xl md:grid md:grid-cols-3 md:gap-12">
            <div className="md:col-span-2">
              <h2 className="font-display mb-6 text-3xl font-medium tracking-tight text-charcoal">
                About this workshop
              </h2>
              <div className="space-y-5 text-lg leading-relaxed text-gray-600">
                <p>{content.intro}</p>
                <p>{content.details}</p>
                <p className="font-medium text-charcoal">{content.ideal}</p>
                <p>
                  Every {cls.name.toLowerCase()} session is fully mobile, meaning our instructor travels directly to your location anywhere in New York City. Whether you are hosting in your living room in Brooklyn, a penthouse in Manhattan, a backyard in Queens, or an office in the Bronx, we bring the entire class to you. There is no need to commute, find parking, or coordinate meeting at a studio. Your space becomes the classroom, and our instructor handles everything from setup to cleanup.
                </p>
                <p>
                  What sets our {cls.name.toLowerCase()} apart from generic online tutorials or group classes at a studio is the personalized, hands-on instruction. Our licensed professionals do not just demonstrate techniques and hope you figure it out. They watch you practice, correct your form in real time, and adapt their teaching to your specific needs. This one-on-one attention within a group setting is why our participants consistently report that they learn more in a single session with us than in months of watching YouTube videos.
                </p>
                <p>
                  We have taught this class to thousands of New Yorkers across all five boroughs, from total beginners who have never attempted anything like this before to experienced hobbyists looking to refine their technique. The group dynamic adds an element of fun and camaraderie that makes the learning experience feel less like a class and more like a social event. Many of our bookings are for special occasions like bachelorette parties, birthday celebrations, corporate team-building events, and holiday gatherings, but we also work with groups of friends who simply want to learn something new together.
                </p>
              </div>

              {/* What You'll Learn */}
              <h3 className="font-display mt-10 mb-4 text-xl font-semibold text-charcoal">What you&apos;ll learn</h3>
              <div className="space-y-3 text-gray-600">
                {slug === "diy-blowout-workshop" && (
                  <>
                    <p>Our blowout workshop covers every aspect of creating a salon-quality blowout at home. You will learn proper sectioning techniques for your specific hair density and length, including how to clip sections so they stay out of the way while you work. The instructor demonstrates correct round brush angles for volume at the root, smoothness through the mid-lengths, and a polished curl at the ends. You will understand the difference between bristle types and barrel sizes and when to use each one.</p>
                    <p>Beyond the mechanics, you will learn the science behind a great blowout: how heat and tension interact with different hair textures, why the direction of airflow matters more than the temperature setting, and how to use products strategically rather than piling them on. We cover heat protectants, volumizers, smoothing serums, and finishing sprays, explaining which ones you actually need and which ones are marketing fluff. By the end, you will have a complete understanding of the blowout process from wet hair to finished style.</p>
                  </>
                )}
                {slug === "braiding-basics-class" && (
                  <>
                    <p>Our braiding class teaches four to five distinct braid styles, building progressively from simple to complex. You will start with the classic three-strand braid to establish proper hand positioning and tension control, then advance to French braids (adding hair from each side as you go), Dutch braids (the inverted technique that makes braids pop off the head), fishtails (the two-strand technique that looks intricate but is surprisingly simple once you get the rhythm), and rope braids (the twisted style that holds beautifully and works on almost any hair length).</p>
                    <p>For each style, we break down the technique into small, manageable steps. You will learn how to start a braid at different points on the head (center part, side part, crown, nape), how to braid your own hair versus braiding someone else&apos;s, and how to finish and secure braids so they last all day. We also cover styling variations: how to pancake braids for a fuller, more textured look, how to incorporate braids into updos and half-up styles, and how to braid with different hair textures and lengths.</p>
                  </>
                )}
                {slug === "everyday-makeup-masterclass" && (
                  <>
                    <p>Our everyday makeup masterclass covers the complete spectrum of daily makeup application. You will learn skin prep (the step most people skip that makes the biggest difference), how to find your exact foundation shade and apply it seamlessly, concealer techniques for under-eyes, blemishes, and redness, brow shaping and filling methods that look natural rather than drawn-on, and a simple two-to-three shadow eye look that works for every occasion.</p>
                    <p>We also cover blush and bronzer placement based on your face shape, mascara application techniques that prevent clumping and smudging, and lip options from barely-there tints to bold statement colors. Our instructor teaches you three different foundation application methods (brush, sponge, and fingers) so you can choose the one that gives you the best result. You will also learn the day-to-night transition: how to take your daytime look and elevate it for evening in under five minutes with just two or three additional products.</p>
                  </>
                )}
                {slug === "skincare-routine-workshop" && (
                  <>
                    <p>Our skincare workshop covers the five core pillars of an effective routine: cleansing, exfoliating, treating, moisturizing, and sun protection. For each step, you will learn why it matters, which product types and formulations are best for your skin type, how to apply them correctly (yes, there is a right and wrong way to apply moisturizer), and how to layer multiple products without pilling or irritation.</p>
                    <p>The ingredient education component is where this class really shines. You will learn what retinol, niacinamide, hyaluronic acid, salicylic acid, glycolic acid, and vitamin C actually do at a cellular level, which concentrations are effective, and which ingredient combinations to avoid. We teach you to read ingredient labels so you can evaluate any product on the shelf, compare it to alternatives, and make an informed purchasing decision. This knowledge saves you hundreds of dollars over time by preventing impulse buys on products that sound good but do nothing for your skin.</p>
                  </>
                )}
                {slug === "group-nail-art-class" && (
                  <>
                    <p>Our nail art class covers both foundational techniques and specific designs. On the technique side, you will learn proper brush control (how to hold a detail brush, how to load it with polish, how to create clean lines), dotting techniques using both professional dotting tools and household items, striping and taping methods for geometric designs, and gradient and ombre application. These foundational skills are transferable to any design you want to create in the future.</p>
                    <p>On the design side, you will learn three to five complete nail art looks, which typically include polka dot and dotting patterns, geometric or striped designs, a floral or nature-inspired design, a gradient or ombre effect, and at least one advanced freehand design. Our instructor breaks each design into numbered steps so even someone who has never done nail art can follow along and create a beautiful result. You practice every design on fake nails first, so there is zero pressure and you can experiment freely.</p>
                  </>
                )}
                {slug === "mens-grooming-101" && (
                  <>
                    <p>Our grooming class covers the complete male grooming routine from head to toe. On the skincare side, you will learn how to identify your skin type (most guys have no idea), how to choose a cleanser that works without over-drying, the importance of moisturizer even for oily skin, and why SPF is the single most effective anti-aging product on the market. We build you a three-step routine that takes under three minutes.</p>
                    <p>For beard and facial hair, you will learn trimming techniques using both guards and freehand, how to shape your beard to complement your face shape, how to maintain a clean neckline between barber visits, and how to deal with common issues like patchiness, ingrown hairs, and uneven growth. We also cover brow grooming (cleaning up the middle and shaping without over-plucking), nose and ear hair management, and product recommendations for every step of your routine, from affordable drugstore options to premium products that are worth the investment.</p>
                  </>
                )}
              </div>

              {/* Who This Class Is For */}
              <h3 className="font-display mt-10 mb-4 text-xl font-semibold text-charcoal">Who this class is for</h3>
              <div className="space-y-3 text-gray-600">
                {slug === "diy-blowout-workshop" && (
                  <>
                    <p>This workshop is designed for anyone in New York City who wants to stop relying on salon blowouts and start doing their own hair with professional results. If you currently spend $65 to $95 per blowout at a salon and go once a week or even once every two weeks, you are spending thousands of dollars a year on something you could learn to do yourself. Our class pays for itself after your first or second at-home blowout.</p>
                    <p>It is also perfect for people who have tried to blow out their own hair at home and been frustrated by the results. If your blowouts come out frizzy, flat, or lopsided, it is almost certainly a technique issue rather than a hair issue, and that is exactly what our instructors correct. We see breakthrough moments in every single class where someone who thought they just had bad hair realizes they were holding the brush wrong the entire time.</p>
                  </>
                )}
                {slug === "braiding-basics-class" && (
                  <>
                    <p>This class is perfect for mothers and caregivers who want to do their children&apos;s hair beautifully without struggling through confusing online tutorials at seven in the morning before school. It is ideal for bridesmaids and bridal parties who want to bond over learning a new skill together while potentially saving on wedding-day hair costs. And it is great for anyone who has always admired braided hairstyles and wanted to learn how to create them.</p>
                    <p>We welcome all ages and experience levels. Whether you are a teenager who wants to braid your own hair for school, a college student planning a creative girls&apos; night, or a grandmother who wants to learn new styles for your grandchildren, this class meets you where you are and takes your skills to the next level.</p>
                  </>
                )}
                {slug === "everyday-makeup-masterclass" && (
                  <>
                    <p>This masterclass is built for people who feel overwhelmed by makeup and want a simplified, personalized routine they can execute confidently every day. If you stand in front of the mirror not knowing where to start, or if you own thirty products but only use three of them, this class is for you. We cut through the noise and teach you only what matters for your face, your skin, and your lifestyle.</p>
                    <p>It is also ideal for people going through transitions: starting a new job, re-entering the dating scene, preparing for a major event, or simply wanting to feel more polished and confident in their daily appearance. We frequently teach this class to bridal parties, corporate teams, college graduates, and friend groups who want to have fun while learning something genuinely useful.</p>
                  </>
                )}
                {slug === "skincare-routine-workshop" && (
                  <>
                    <p>This workshop is designed for anyone who is confused by the overwhelming world of skincare products and wants a clear, personalized routine that actually works. If you have spent hundreds of dollars on serums and creams that promised miracles and delivered nothing, this class will show you why and help you start over with a routine that is built on science rather than marketing.</p>
                    <p>It is especially valuable for people dealing with specific skin concerns like acne, aging, hyperpigmentation, redness, sensitivity, or chronic dryness. Our esthetician addresses each person&apos;s unique concerns individually and recommends targeted solutions. We also frequently host this workshop for bridal parties (great skin starts months before the wedding), corporate wellness events, and friend groups who want to invest in their skin together.</p>
                  </>
                )}
                {slug === "group-nail-art-class" && (
                  <>
                    <p>This class welcomes everyone from complete beginners who have never done anything beyond a basic solid color manicure to hobbyists who practice regularly and want to learn professional techniques. If you have ever scrolled through nail art on social media and thought you could never do that, this class will change your mind. Our instructor breaks every design into simple, repeatable steps that anyone can follow.</p>
                    <p>It is one of our most popular choices for celebrations: birthday parties, bachelorette weekends, teen sleepovers, holiday gatherings, and creative team outings. The class doubles as entertainment and education, and everyone leaves with beautiful nails and new skills they can practice at home.</p>
                  </>
                )}
                {slug === "mens-grooming-101" && (
                  <>
                    <p>This class is for any guy who wants to look more put-together without spending a lot of time or money. Whether you are a groom getting ready for the biggest day of your life, a professional who wants to make a better impression at work, or a regular guy who just never learned the basics, this class gives you everything you need in 90 practical minutes.</p>
                    <p>We designed this class specifically for men who are starting from scratch or near-scratch. There is no expectation that you know anything about skincare, grooming products, or facial hair maintenance coming in. Our instructor is a licensed barber who works with guys every day and understands that most men want simple, effective solutions, not complicated 12-step routines. If you can brush your teeth, you can follow the routine we build for you.</p>
                  </>
                )}
              </div>

              <h3 className="font-display mt-10 mb-4 text-xl font-semibold text-charcoal">What&apos;s included</h3>
              <ul className="space-y-2">
                {content.includes.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-gray-700">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isMens ? "bg-sky-100" : "bg-purple-100"}`}>
                      <svg className={`h-3 w-3 ${isMens ? "text-sky-600" : "text-purple-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </span>
                    {item}
                  </li>
                ))}
                <li className="flex items-center gap-2.5 text-gray-700">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isMens ? "bg-sky-100" : "bg-purple-100"}`}>
                    <svg className={`h-3 w-3 ${isMens ? "text-sky-600" : "text-purple-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </span>
                  Mobile service — we travel to your location in any NYC borough
                </li>
                <li className="flex items-center gap-2.5 text-gray-700">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isMens ? "bg-sky-100" : "bg-purple-100"}`}>
                    <svg className={`h-3 w-3 ${isMens ? "text-sky-600" : "text-purple-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </span>
                  No travel fees anywhere in the five boroughs
                </li>
                <li className="flex items-center gap-2.5 text-gray-700">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isMens ? "bg-sky-100" : "bg-purple-100"}`}>
                    <svg className={`h-3 w-3 ${isMens ? "text-sky-600" : "text-purple-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </span>
                  Complete setup and cleanup by your instructor
                </li>
              </ul>
            </div>

            {/* Sidebar */}
            <div className="mt-10 md:mt-0">
              <div className={`sticky top-8 rounded-xl border p-6 ${isMens ? "border-sky-100 bg-sky-50" : "border-purple-100 bg-purple-50/50"}`}>
                <h3 className="font-display mb-4 text-lg font-semibold text-charcoal">Quick details</h3>
                <dl className="space-y-3 text-sm">
                  <div><dt className="font-semibold text-charcoal">Starting at</dt><dd className="text-gray-600">{content.price}</dd></div>
                  <div><dt className="font-semibold text-charcoal">Hourly rate</dt><dd className="text-gray-600">$99/hr (2-hr min for groups)</dd></div>
                  <div><dt className="font-semibold text-charcoal">Duration</dt><dd className="text-gray-600">{cls.duration}</dd></div>
                  <div><dt className="font-semibold text-charcoal">Group size</dt><dd className="text-gray-600">{cls.groupSize} people (3+ min)</dd></div>
                  <div><dt className="font-semibold text-charcoal">Coverage</dt><dd className="text-gray-600">All 5 NYC boroughs</dd></div>
                  <div><dt className="font-semibold text-charcoal">Experience</dt><dd className="text-gray-600">None required</dd></div>
                  <div><dt className="font-semibold text-charcoal">Materials</dt><dd className="text-gray-600">All provided</dd></div>
                  <div><dt className="font-semibold text-charcoal">Travel fee</dt><dd className="text-gray-600">None — free citywide</dd></div>
                  <div><dt className="font-semibold text-charcoal">Private lessons</dt><dd className="text-gray-600">Available ($99/hr)</dd></div>
                  <div><dt className="font-semibold text-charcoal">Booking</dt><dd className="text-gray-600">24-hr confirmation</dd></div>
                </dl>
                <Link href="/book" className={`mt-6 block w-full text-center rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition hover:-translate-y-0.5 font-display ${isMens ? "bg-sky-500 shadow-sky-500/30 hover:bg-sky-600" : "bg-purple-600 shadow-purple-500/20 hover:bg-purple-700"}`}>Book This Class</Link>
                <p className="mt-3 text-center text-xs text-gray-500">No payment required to book. We confirm within 24 hours.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      {howItWorks.length > 0 && (
        <section className={`px-6 py-16 md:py-20 ${isMens ? "bg-gray-950" : "bg-purple-50/50"}`}>
          <div className="mx-auto max-w-4xl">
            <h2 className={`font-display mb-4 text-center text-2xl font-medium tracking-tight md:text-3xl ${isMens ? "text-white" : "text-charcoal"}`}>
              How to book {cls.name.toLowerCase()}
            </h2>
            <p className={`mx-auto mb-12 max-w-2xl text-center ${isMens ? "text-gray-400" : "text-gray-500"}`}>
              From booking to bliss in four simple steps. The entire process takes less than two minutes to start.
            </p>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {howItWorks.map((step) => (
                <div key={step.step} className={`rounded-xl border p-6 ${isMens ? "border-sky-900/50 bg-sky-950/30" : "border-purple-100 bg-white"}`}>
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${isMens ? "bg-sky-500/20 text-sky-400" : "bg-purple-100 text-purple-600"}`}>
                    {step.step}
                  </div>
                  <h3 className={`font-display mb-2 text-sm font-semibold ${isMens ? "text-white" : "text-charcoal"}`}>{step.title}</h3>
                  <p className={`text-sm leading-relaxed ${isMens ? "text-gray-400" : "text-gray-500"}`}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Take This Class */}
      {whyBenefits.length > 0 && (
        <section className={`px-6 py-16 md:py-20 ${isMens ? "bg-gray-900" : "bg-white"}`}>
          <div className="mx-auto max-w-5xl">
            <h2 className={`font-display mb-4 text-center text-2xl font-medium tracking-tight md:text-3xl ${isMens ? "text-white" : "text-charcoal"}`}>
              Why take {cls.name.toLowerCase()}
            </h2>
            <p className={`mx-auto mb-12 max-w-2xl text-center ${isMens ? "text-gray-400" : "text-gray-500"}`}>
              Investing in this skill pays dividends every single day. Here is why our participants love this class.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {whyBenefits.map((benefit, i) => (
                <div key={i} className={`rounded-xl border p-6 ${isMens ? "border-sky-900/50 bg-sky-950/20" : "border-purple-100 bg-purple-50/30"}`}>
                  <Sparkle className={`mb-3 h-5 w-5 ${isMens ? "text-sky-400" : "text-purple-400"}`} />
                  <h3 className={`font-display mb-2 text-base font-semibold ${isMens ? "text-white" : "text-charcoal"}`}>{benefit.title}</h3>
                  <p className={`text-sm leading-relaxed ${isMens ? "text-gray-400" : "text-gray-500"}`}>{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* What to Expect */}
      {whatToExpect.length > 0 && (
        <section className={`px-6 py-16 md:py-20 ${isMens ? "bg-gray-950" : "bg-purple-50/30"}`}>
          <div className="mx-auto max-w-3xl">
            <h2 className={`font-display mb-4 text-center text-2xl font-medium tracking-tight md:text-3xl ${isMens ? "text-white" : "text-charcoal"}`}>
              What to expect during your session
            </h2>
            <p className={`mx-auto mb-10 max-w-2xl text-center ${isMens ? "text-gray-400" : "text-gray-500"}`}>
              Here is a detailed look at how a typical {cls.name.toLowerCase()} session unfolds, from the moment your instructor arrives to the moment they leave.
            </p>
            <div className={`space-y-6 text-lg leading-relaxed ${isMens ? "text-gray-300" : "text-gray-600"}`}>
              {whatToExpect.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section className={`px-6 py-16 md:py-20 ${isMens ? "bg-gray-900" : "bg-white"}`}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={`font-display mb-4 text-2xl font-medium tracking-tight md:text-3xl ${isMens ? "text-white" : "text-charcoal"}`}>
            {cls.name} pricing
          </h2>
          <p className={`mx-auto mb-8 max-w-2xl ${isMens ? "text-gray-400" : "text-gray-500"}`}>
            Transparent pricing with no hidden fees, no travel surcharges, and no surprises. Everything is included.
          </p>
          <div className={`mx-auto max-w-md rounded-2xl border p-8 ${isMens ? "border-sky-800 bg-sky-950/30" : "border-purple-200 bg-purple-50/50"}`}>
            <div className={`mb-1 text-sm font-semibold uppercase tracking-wider ${isMens ? "text-sky-400" : "text-purple-600"}`}>Group rate</div>
            <div className={`font-display text-5xl font-bold ${isMens ? "text-white" : "text-charcoal"}`}>$99<span className="text-2xl font-normal text-gray-400">/hr</span></div>
            <p className={`mt-2 text-sm ${isMens ? "text-gray-400" : "text-gray-500"}`}>2-hour minimum for groups of 3+</p>
            {content && (
              <p className={`mt-1 text-sm ${isMens ? "text-gray-400" : "text-gray-500"}`}>Per-person pricing from {content.price}</p>
            )}
            <ul className={`mt-6 space-y-2 text-left text-sm ${isMens ? "text-gray-300" : "text-gray-600"}`}>
              <li className="flex items-center gap-2">
                <svg className={`h-4 w-4 ${isMens ? "text-sky-400" : "text-purple-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                All materials and tools included
              </li>
              <li className="flex items-center gap-2">
                <svg className={`h-4 w-4 ${isMens ? "text-sky-400" : "text-purple-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Free travel to any NYC borough
              </li>
              <li className="flex items-center gap-2">
                <svg className={`h-4 w-4 ${isMens ? "text-sky-400" : "text-purple-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Licensed, experienced instructors
              </li>
              <li className="flex items-center gap-2">
                <svg className={`h-4 w-4 ${isMens ? "text-sky-400" : "text-purple-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Take-home reference materials
              </li>
              <li className="flex items-center gap-2">
                <svg className={`h-4 w-4 ${isMens ? "text-sky-400" : "text-purple-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Private lessons available at same rate
              </li>
            </ul>
            <Link href="/book" className={`mt-6 block w-full text-center rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition hover:-translate-y-0.5 font-display ${isMens ? "bg-sky-500 shadow-sky-500/30 hover:bg-sky-600" : "bg-purple-600 shadow-purple-500/20 hover:bg-purple-700"}`}>Book Now</Link>
            <p className={`mt-4 text-xs ${isMens ? "text-gray-500" : "text-gray-400"}`}>
              See full pricing details on our <Link href="/pricing" className={`underline ${isMens ? "text-sky-400" : "text-purple-600"}`}>pricing page</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Book by Borough */}
      <section className={`px-4 py-16 md:py-20 ${isMens ? "bg-gray-950" : "bg-purple-50/50"}`}>
        <div className="mx-auto max-w-5xl">
          <h2 className={`font-display mb-3 text-center text-2xl font-medium tracking-tight md:text-3xl ${isMens ? "text-white" : "text-charcoal"}`}>
            Book {cls.name.toLowerCase()} by borough
          </h2>
          <p className={`mx-auto mb-8 max-w-2xl text-center ${isMens ? "text-gray-400" : "text-gray-500"}`}>
            We bring {cls.name.toLowerCase()} directly to your door in every NYC borough. Select your borough to see available neighborhoods.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {Object.entries(boroughNames).map(([boroSlug, boroName]) => (
              <Link key={boroSlug} href={`/classes/${slug}/${boroSlug}`} className={`card-hover rounded-xl border bg-white p-6 text-center ${isMens ? "border-sky-100" : "border-purple-100"}`}>
                <p className="text-lg font-semibold text-charcoal">{boroName}</p>
                <p className={`mt-1 text-xs ${isMens ? "text-sky-500" : "text-purple-600"}`}>{neighborhoods[boroSlug]?.length} neighborhoods &rarr;</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`px-6 py-16 md:py-20 ${isMens ? "bg-gray-900" : "bg-white"}`}>
        <div className="mx-auto max-w-3xl">
          <h2 className={`font-display mb-4 text-center text-2xl font-medium tracking-tight md:text-3xl ${isMens ? "text-white" : "text-charcoal"}`}>
            Frequently asked questions about {cls.name.toLowerCase()}
          </h2>
          <p className={`mx-auto mb-10 max-w-2xl text-center ${isMens ? "text-gray-400" : "text-gray-500"}`}>
            Everything you need to know before booking your {cls.name.toLowerCase()} session in New York City.
          </p>
          <div className={`divide-y ${isMens ? "divide-sky-900/50" : "divide-purple-100"}`}>
            {faqs.map((faq) => (
              <div key={faq.q} className="py-6">
                <h3 className={`font-display mb-3 text-lg font-semibold ${isMens ? "text-white" : "text-charcoal"}`}>{faq.q}</h3>
                <p className={`leading-relaxed ${isMens ? "text-gray-400" : "text-gray-600"}`}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Classes */}
      {related.length > 0 && (
        <section className={`px-4 py-16 md:py-20 ${isMens ? "bg-gray-950" : "bg-purple-50/50"}`}>
          <div className="mx-auto max-w-5xl">
            <h2 className={`font-display mb-3 text-center text-2xl font-medium tracking-tight md:text-3xl ${isMens ? "text-white" : "text-charcoal"}`}>
              Other workshops you might enjoy
            </h2>
            <p className={`mx-auto mb-8 max-w-2xl text-center ${isMens ? "text-gray-400" : "text-gray-500"}`}>
              Explore our full lineup of mobile beauty and grooming classes available across New York City.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {related.map((r) => {
                const rc = classContent[r.slug];
                const rMens = isMensClass(r.slug);
                return (
                  <Link key={r.slug} href={`/classes/${r.slug}`} className={`group rounded-xl border bg-white p-5 transition-all hover:shadow-md ${rMens ? "border-sky-100 hover:shadow-sky-500/10" : "border-purple-100 hover:shadow-purple-500/10"}`}>
                    <h3 className={`font-display mb-1 text-sm font-semibold text-charcoal transition-colors ${rMens ? "group-hover:text-sky-600" : "group-hover:text-purple-600"}`}>{r.name}</h3>
                    <p className="text-xs text-gray-400">{r.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span>{r.duration}</span>
                      {rc && <span className={rMens ? "text-sky-500" : "text-purple-600"}>From {rc.price}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className={`px-4 py-20 text-center ${isMens ? "bg-gray-900" : "bg-white"}`}>
        <div className="mx-auto max-w-2xl">
          <Sparkle className={`mx-auto mb-4 h-6 w-6 ${isMens ? "text-sky-400" : "text-purple-400"}`} />
          <h2 className={`font-display mb-4 text-3xl font-medium md:text-4xl ${isMens ? "text-white" : "text-charcoal"}`}>
            Ready to book your <span className="italic">{cls.name.toLowerCase()}</span>?
          </h2>
          <p className={`mb-3 text-lg ${isMens ? "text-gray-300" : "text-gray-600"}`}>
            {cls.duration} of hands-on, personalized instruction from a licensed professional, delivered directly to your location anywhere in New York City. Groups of {cls.groupSize}, all materials included, no travel fees.
          </p>
          <p className={`mb-8 ${isMens ? "text-gray-400" : "text-gray-500"}`}>
            {content ? `Starting at ${content.price} per person.` : ""} $99/hour with a 2-hour minimum for groups of 3 or more. Private lessons available at the same rate. Book today and we will confirm your session within 24 hours.
          </p>
          <Link href="/book" className={`rounded-full px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition hover:-translate-y-0.5 font-display inline-block ${isMens ? "bg-sky-500 shadow-sky-500/30 hover:bg-sky-600" : "bg-purple-600 shadow-purple-500/20 hover:bg-purple-700"}`}>Book Your {cls.name} Now</Link>
          <p className={`mt-4 text-sm ${isMens ? "text-gray-500" : "text-gray-400"}`}>
            Questions? <Link href="/contact" className={`underline ${isMens ? "text-sky-400" : "text-purple-600"}`}>Contact us</Link> or call/text anytime. See all classes on our <Link href="/classes" className={`underline ${isMens ? "text-sky-400" : "text-purple-600"}`}>classes page</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
