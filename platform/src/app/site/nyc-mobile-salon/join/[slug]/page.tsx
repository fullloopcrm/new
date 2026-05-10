// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allServices, womensCategories, mensCategories, boroughNames, neighborhoods } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { getServiceBySlug, faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import { serviceContent } from "@/app/site/nyc-mobile-salon/_lib/service-content";

/* ── helpers ──────────────────────────────────────────────────────── */

const womensSlugSet = new Set(
  womensCategories.flatMap((c) => c.services.map((s) => s.slug))
);

function isWomensService(slug: string) {
  return womensSlugSet.has(slug);
}

/* ── static params ────────────────────────────────────────────────── */

export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

/* ── metadata ─────────────────────────────────────────────────────── */

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};

  const title = `Mobile ${service.name} Jobs in NYC — $49+/hr | Join The NYC Mobile Salon`;
  const description = `Now hiring: mobile ${service.name.toLowerCase()} professionals in New York City. Earn $49+/hour, set your own schedule, no booth rental fees, paid via Zelle or Apple Cash within 30 minutes of job completion, liability insurance included. Licensed ${service.name.toLowerCase()} specialists wanted across all 5 NYC boroughs. Apply today.`;

  return {
    title,
    description,
    alternates: { canonical: `https://thenycmobilesalon.com/join/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://thenycmobilesalon.com/join/${slug}`,
      siteName: "The NYC Mobile Salon",
      type: "website",
    },
  };
}

/* ── service-specific task lists ───────────────────────────────────── */

function getTasksForService(slug: string): string[] {
  const taskMap: Record<string, string[]> = {
    "blowouts-and-styling": [
      "Perform salon-quality blowouts in client homes, offices, and hotel rooms across New York City",
      "Work with all hair types and textures including fine, thick, curly, coily, and everything in between",
      "Customize blowout styles based on client preferences — sleek straight, loose waves, voluminous curls, or bouncy body",
      "Use professional-grade dryers, round brushes, flat irons, and finishing products to create lasting results",
      "Consult with clients on heat protection, product selection, and style maintenance between appointments",
      "Deliver consistent, five-star service that keeps clients booking you by name every two to four weeks",
      "Maintain a fully stocked kit with backup tools, multiple product lines, and a professional appearance at every appointment",
      "Manage your own appointment schedule, travel logistics, and client communication through our booking platform",
    ],
    "haircuts-and-trims": [
      "Deliver precision haircuts and trims in client homes, offices, and event venues across all five boroughs",
      "Specialize in a range of styles including blunt cuts, long layers, pixie cuts, bobs, shags, curtain bangs, and textured crops",
      "Consult with each client to understand their face shape, hair texture, lifestyle, and desired look before cutting",
      "Bring all necessary tools including professional shears, thinning shears, clippers, combs, capes, and styling products",
      "Provide shampoo, conditioning, and a finished blowout or style with every haircut appointment",
      "Photograph your work (with client permission) to build your portfolio on our platform and attract repeat bookings",
      "Maintain impeccable sanitation standards between clients using hospital-grade disinfection protocols",
      "Handle walk-in-style transformations as well as quick maintenance trims with equal professionalism",
    ],
    "single-process-color": [
      "Perform full hair color applications, root touch-ups, and gray coverage services in client homes across NYC",
      "Work with professional-grade color lines to achieve rich, even, long-lasting results in any shade",
      "Conduct thorough color consultations to find each client's perfect shade, including strand tests when needed",
      "Set up protective coverings to keep client spaces clean during color processing and rinsing",
      "Manage processing times, rinsing, conditioning, and styling as part of every color appointment",
      "Educate clients on color maintenance, recommended products, and ideal timing for touch-up appointments",
    ],
    "double-process-color": [
      "Perform bleach and tone services for platinum, icy tones, pastels, and vivid fashion colors in client homes",
      "Assess hair health and history before every double-process appointment to ensure safe lifting",
      "Apply bond-protecting treatments throughout the lightening process to maintain hair integrity",
      "Manage multi-step processing with precision timing for consistent, even results",
      "Consult with clients on realistic expectations, maintenance requirements, and aftercare for double-process color",
      "Set up and break down a full color station in client spaces with protective coverings and professional equipment",
    ],
    "highlights-balayage-ombre": [
      "Perform foil highlights, hand-painted balayage, ombre, babylights, and money pieces in client homes",
      "Customize placement, tone, and intensity based on each client's skin tone, natural color, and maintenance preferences",
      "Work with professional lightener, toner, and processing tools to achieve salon-level dimension and depth",
      "Educate clients on the differences between highlighting techniques and recommend the best option for their lifestyle",
      "Manage complex processing timelines including sectioning, application, checking, toning, and styling",
      "Deliver looks that grow out beautifully and keep clients coming back every 8 to 12 weeks",
    ],
    "deep-conditioning-treatment": [
      "Assess client hair condition and customize deep conditioning treatments based on specific needs",
      "Apply professional-grade hydrating masks, protein treatments, and bond builders for maximum restoration",
      "Use gentle heat processing techniques to enhance product absorption and treatment effectiveness",
      "Educate clients on at-home maintenance between professional treatments",
      "Pair treatments with other hair services as add-ons to maximize appointment value",
      "Track client hair health progress across multiple appointments to build long-term care plans",
    ],
    "silk-press": [
      "Perform flawless silk press services on natural hair types 3 and 4 in client homes across New York City",
      "Use adjustable-temperature flat irons with heat protectant to achieve sleek, bouncy, silky-straight results with zero heat damage",
      "Shampoo, condition, and thoroughly detangle before blow drying and pressing for the best possible outcome",
      "Apply finishing serums and products for a glossy, swinging finish that lasts until the next wash day",
      "Consult with clients on temperature settings, product selection, and maintenance between silk press appointments",
      "Work efficiently to complete silk press services within 90 to 120 minutes without compromising quality",
    ],
    "braids-and-protective-styles": [
      "Install box braids, knotless braids, cornrows, Ghana braids, feed-in braids, twists, faux locs, and crochet styles",
      "Work with a variety of extension hair including synthetic, human hair, and heat-friendly options",
      "Consult with clients on style selection, size, length, color, and expected wear time",
      "Prep natural hair with detangling, moisturizing, and protective base work before braiding",
      "Complete intricate styles within estimated timeframes while maintaining consistent tension and patterns",
      "Educate clients on protective style maintenance, nighttime care, and when to schedule removal",
      "Manage multi-hour appointments with professionalism, comfort breaks, and client engagement",
      "Bring all necessary extension hair, accessories, and tools to every appointment",
    ],
    "extensions": [
      "Install clip-in, tape-in, sew-in, and micro-link hair extensions in client homes across NYC",
      "Perform extension removals safely and without damage to the client's natural hair",
      "Color-match and blend extensions seamlessly with the client's natural hair color and texture",
      "Cut and style extensions after installation for a completely natural, undetectable finish",
      "Consult with clients on the best extension method for their hair type, lifestyle, and budget",
      "Provide detailed aftercare instructions for each extension method to maximize longevity",
    ],
    "updo-and-formal-styling": [
      "Create elegant updos, chignons, French twists, braided crowns, and modern textured styles for events",
      "Consult with clients on outfit, venue, and desired vibe to design the perfect formal hairstyle",
      "Work with natural hair and extensions to achieve volume, texture, and hold that lasts all day or night",
      "Arrive with a full kit of pins, clips, elastic bands, finishing sprays, and backup tools",
      "Style bridal parties, prom groups, and gala attendees with efficiency and attention to individual preferences",
      "Photograph completed styles for portfolio building and platform promotion",
    ],
    "classic-manicure": [
      "Perform clean, classic manicures in client homes including nail shaping, cuticle care, and polish application",
      "Bring a portable nail station with sanitized tools, a full polish selection, and disposable supplies",
      "Work with OPI, Essie, Zoya, and other professional polish lines in a wide range of colors",
      "Maintain hospital-grade sanitation protocols between every client appointment",
      "Offer hand exfoliation and brief hand massage as part of every classic manicure service",
      "Consult with clients on nail shape, length, and polish color to deliver personalized results",
    ],
    "gel-manicure": [
      "Apply chip-free gel manicures using professional UV/LED lamps and premium gel polish systems",
      "Work with OPI GelColor, CND Shellac, Gelish, and other professional gel lines",
      "Perform full nail prep including shaping, cuticle care, dehydration, and base coat application",
      "Offer gel removal services as an add-on for clients transitioning between sets",
      "Transport and set up portable LED/UV curing lamps safely in client homes and offices",
      "Educate clients on gel nail care, longevity expectations, and safe removal between appointments",
    ],
    "classic-pedicure": [
      "Deliver relaxing pedicures in client homes using a portable foot bath and professional supplies",
      "Perform callus removal, nail trimming, cuticle care, exfoliation, and foot and calf massage",
      "Apply polish with precision and offer a full range of professional color options",
      "Set up and break down a portable pedicure station efficiently in any home environment",
      "Maintain strict sanitation between clients with disposable liners, sterilized tools, and fresh towels",
      "Recommend foot care products and maintenance routines between professional pedicure appointments",
    ],
    "gel-pedicure": [
      "Perform gel pedicures with portable foot baths, UV/LED lamps, and premium gel polish systems",
      "Deliver all the pampering of a classic pedicure with the durability and chip-resistance of gel",
      "Manage longer appointment windows for soak, scrub, massage, gel application, and curing",
      "Offer gel removal from previous sets as part of the service or as a standalone add-on",
      "Transport all equipment safely and set up a professional pedicure experience in any client space",
      "Educate clients on gel pedicure maintenance and expected longevity between appointments",
    ],
    "nail-art": [
      "Create custom hand-painted nail art designs including geometric patterns, florals, abstract art, and character work",
      "Consult with clients on design concepts, reference images, and color palettes before starting",
      "Work over gel or acrylic bases to ensure nail art longevity and durability",
      "Specialize in techniques like ombre, chrome, marble, French tip variations, and 3D elements",
      "Bring a full nail art kit with fine brushes, dotting tools, striping tape, foils, and specialty products",
      "Photograph completed nail art for portfolio building and social media promotion on the platform",
    ],
    "acrylic-press-on": [
      "Apply full acrylic nail sets, fills, and professional press-on applications in client homes",
      "Offer a full range of shapes including coffin, stiletto, almond, square, ballerina, and round",
      "Work with acrylic powder, liquid monomer, forms, and tips to build custom sets from scratch",
      "Perform safe removal of previous acrylic sets without damage to the natural nail",
      "Consult with clients on length, shape, and finish options to deliver their ideal set",
      "Maintain proper ventilation awareness and product safety protocols during acrylic application",
    ],
    "dip-powder": [
      "Apply dip powder (SNS) nail systems in client homes for a lightweight, durable, UV-free finish",
      "Work with a full color selection and bring all supplies including base coat, activator, and sealant",
      "Perform proper nail prep and cuticle care before dip powder application for maximum adhesion",
      "Remove previous dip powder sets safely without excessive filing or nail damage",
      "Educate clients on the benefits of dip powder versus gel and acrylic alternatives",
      "Shape and buff finished dip powder nails for a smooth, salon-quality appearance",
    ],
    "full-glam-makeup": [
      "Create camera-ready, event-level glam makeup looks for weddings, galas, photo shoots, and special occasions",
      "Work with professional-grade products from MAC, NARS, Charlotte Tilbury, and Make Up For Ever",
      "Perform full applications including skin prep, primer, full-coverage foundation, contour, highlight, eye makeup, lashes, and lip",
      "Match foundation perfectly to each client's skin tone and undertone in any lighting condition",
      "Apply strip or individual lashes as part of every full glam service",
      "Arrive with a sanitized, fully stocked professional makeup kit ready for any skin type or tone",
    ],
    "natural-everyday-makeup": [
      "Apply polished, natural-looking makeup that enhances features without a heavy or overdone appearance",
      "Use light coverage foundations, tinted moisturizers, and skin-like products for an effortless finish",
      "Teach clients the techniques used during the appointment so they can recreate the look at home",
      "Work efficiently to complete natural makeup applications in 30 to 45 minutes",
      "Consult with clients on their daily routine, skin concerns, and desired level of coverage",
      "Recommend products and tools for clients to maintain their look independently between appointments",
    ],
    "lash-application": [
      "Apply strip lashes and individual cluster lashes for natural, dramatic, or wispy looks",
      "Bring a selection of lash styles in different lengths, volumes, and materials for client choice",
      "Use professional lash adhesive for secure, all-day or all-night hold without irritation",
      "Trim and fit lashes to each client's eye shape for a seamless, comfortable application",
      "Offer lash application as a standalone service or as an add-on to any makeup appointment",
      "Educate clients on lash care, removal techniques, and product recommendations",
    ],
    "express-facial": [
      "Perform express facials in client homes including double cleansing, toner, serum, moisturizer, and SPF",
      "Assess each client's skin type quickly and customize product selection accordingly",
      "Complete the full express facial experience in approximately 30 minutes without rushing",
      "Bring a portable kit with professional-grade skincare products suitable for all skin types",
      "Recommend follow-up treatments and at-home skincare routines based on the skin assessment",
      "Offer express facials as standalone appointments or as add-ons to other beauty services",
    ],
    "deep-cleansing-facial": [
      "Deliver thorough deep cleansing facials with extractions, custom masks, and targeted treatments",
      "Bring a portable steamer and professional-grade skincare products to every appointment",
      "Customize every step based on client skin type and concerns — acne, aging, hyperpigmentation, dryness, or sensitivity",
      "Perform safe, gentle extractions and educate clients on post-extraction care",
      "Apply custom masks, serums, moisturizer, and SPF as part of every deep cleansing facial",
      "Build ongoing client relationships with quarterly or monthly facial treatment plans",
    ],
    "microdermabrasion": [
      "Perform professional microdermabrasion treatments using portable diamond-tip or crystal devices",
      "Customize treatment intensity based on client skin type, sensitivity, and treatment goals",
      "Follow microdermabrasion with soothing serum, moisturizer, and SPF for complete aftercare",
      "Educate clients on treatment series recommendations (4 to 6 sessions) for optimal results",
      "Assess and document client skin condition before and after each session to track progress",
      "Transport and maintain professional-grade microdermabrasion equipment safely between appointments",
    ],
    "light-chemical-peel": [
      "Perform light chemical peels using glycolic acid, lactic acid, or salicylic acid in client homes",
      "Customize peel intensity based on client skin type, concerns, tolerance, and treatment history",
      "Apply neutralizer, calming serum, moisturizer, and SPF after every peel treatment",
      "Educate clients on realistic expectations, minimal downtime, and aftercare requirements",
      "Consult on treatment frequency and recommend complementary skincare products",
      "Maintain proper product storage, safety protocols, and client consent documentation",
    ],
    "brow-wax-and-shape": [
      "Shape and sculpt brows using professional hard wax and precision tweezing techniques",
      "Consult with each client on desired shape based on their natural arch and face shape",
      "Apply soothing aloe and optional brow gel as part of every brow shaping service",
      "Work quickly and precisely to complete brow services in 15 to 20 minutes",
      "Maintain strict sanitation with single-use applicators and fresh wax for every client",
      "Offer brow shaping as a standalone service or as an add-on to other beauty appointments",
    ],
    "lip-and-chin-wax": [
      "Perform quick, clean upper lip and chin waxing using professional hard wax",
      "Use hard wax that adheres to hair rather than skin for minimal irritation on sensitive facial areas",
      "Apply soothing post-wax oil or aloe after every service to reduce redness",
      "Complete lip and chin wax services in 10 to 15 minutes with precision and care",
      "Offer this service as a standalone appointment or as an add-on to any other beauty service",
      "Educate clients on waxing frequency, skin preparation, and aftercare for best results",
    ],
    "full-face-wax": [
      "Perform comprehensive facial waxing covering brows, upper lip, chin, jawline, and sideburns",
      "Use professional hard wax throughout for maximum gentleness on all facial areas",
      "Consult with each client on desired brow shape and overall facial hair removal preferences",
      "Apply post-wax soothing treatment to reduce redness and calm the skin after service",
      "Complete full face wax services in 25 to 35 minutes with efficiency and precision",
      "Maintain single-use applicators and fresh wax for every client to ensure sanitation standards",
    ],
    "bikini-brazilian-wax": [
      "Perform bikini line cleanups and full Brazilian waxing services in the privacy of client homes",
      "Use professional hard wax for minimum discomfort and maximum smoothness on sensitive areas",
      "Bring disposable supplies, sanitization products, and post-wax soothing oil to every appointment",
      "Maintain the highest standards of client comfort, privacy, and professionalism during intimate services",
      "Consult with clients on their preferences — bikini line cleanup versus full Brazilian — before starting",
      "Provide detailed aftercare instructions including exfoliation timing and ingrown hair prevention",
    ],
    "leg-wax": [
      "Perform full leg and half leg waxing services in client homes using professional strip or hard wax",
      "Work efficiently to complete full leg waxes within 30 to 60 minutes depending on hair density",
      "Apply post-wax soothing treatment and provide aftercare instructions after every service",
      "Bring all disposable supplies, towels, and products needed for a clean, professional setup",
      "Offer half leg (knee down) and full leg (ankle to hip) options to accommodate client preferences",
      "Educate clients on waxing frequency, maintenance between appointments, and skin care tips",
    ],
    "underarm-wax": [
      "Perform quick, clean underarm waxing using professional hard wax in client homes",
      "Use hard wax that grips hair without pulling skin for minimal discomfort in the underarm area",
      "Complete underarm wax services in 10 to 15 minutes with precision and care",
      "Apply soothing post-wax care to reduce irritation and calm the skin",
      "Offer underarm wax as a standalone service or as a quick add-on to any other waxing appointment",
      "Maintain strict sanitation with single-use applicators and fresh wax for every client",
    ],
    "mens-haircut-and-style": [
      "Deliver classic and modern men's haircuts in client homes, offices, and hotel rooms across all five boroughs",
      "Specialize in textured crops, pompadours, side parts, undercuts, taper cuts, crew cuts, and more",
      "Bring professional cordless clippers, multiple guards, shears, and styling products to every appointment",
      "Perform a full consultation before each cut to understand the client's desired look and lifestyle",
      "Include neckline cleanup, edge cleanup, and product styling as part of every haircut service",
      "Build a roster of regular clients who book you every two to four weeks for maintenance cuts",
      "Maintain impeccable sanitation with disinfected tools, fresh capes, and neck strips at every appointment",
      "Photograph your work with client permission to build your professional portfolio on our platform",
    ],
    "fade-haircut": [
      "Deliver crisp, precision fades — skin fades, shadow fades, drop fades, burst fades, and temp fades",
      "Master the art of blending with professional cordless clippers, multiple guards, and detailing trimmers",
      "Include lineup, edge up, and neck taper as part of every fade service",
      "Consult with clients on fade height, style, and desired length on top before starting",
      "Complete fade services in 30 to 45 minutes while maintaining barbershop-level precision",
      "Build a base of regular clients who book fades every two to three weeks for a consistently fresh look",
      "Work in client homes, offices, and hotel rooms with a fully portable barber setup",
      "Stay current on trending fade styles and techniques through ongoing training and practice",
    ],
    "line-up-edge-up": [
      "Define and sharpen hairlines using trimmers and straight razors for razor-sharp edges",
      "Create clean lines around the forehead, temples, sideburns, and neckline with precision",
      "Complete lineup services in 15 to 20 minutes as a quick maintenance appointment between full haircuts",
      "Bring professional detailing trimmers and a straight razor to every appointment",
      "Offer lineups as standalone services or as add-ons to other men's grooming appointments",
      "Build a roster of weekly or biweekly lineup clients for consistent, recurring income",
    ],
    "buzz-cut": [
      "Deliver clean, even buzz cuts with consistent guard coverage and precise edges in client homes",
      "Offer various buzz cut options from one guard length all over to slightly longer top with shorter sides",
      "Include lineup, edge cleanup, and neck taper as part of every buzz cut service",
      "Complete buzz cut services in 15 to 20 minutes efficiently without sacrificing quality",
      "Bring professional cordless clippers with multiple guard sizes and a detailing trimmer",
      "Offer buzz cuts as a quick, affordable option for clients who value simplicity and low maintenance",
    ],
    "beard-trim-and-shape": [
      "Trim, shape, and sculpt beards to client-specified length and style in homes and offices across NYC",
      "Clean up necklines with a straight razor and define cheek lines for a polished, intentional look",
      "Blend beard lines with the haircut for a cohesive, seamless appearance from head to chin",
      "Use professional trimmers, shears, and a straight razor for the cleanest lines possible",
      "Finish every beard service with beard oil application and styling",
      "Offer beard trims as standalone services or paired with haircuts for a complete grooming package",
    ],
    "hot-towel-shave": [
      "Perform traditional hot towel straight razor shaves in client homes with full barbershop luxury",
      "Prepare the face with hot towel wraps and pre-shave oil to open pores and soften facial hair",
      "Apply lather with a badger brush and shave with a straight razor — with the grain and against if desired",
      "Close pores with a cold towel wrap and apply aftershave balm for a smooth, comfortable finish",
      "Maintain straight razors, towels, and all tools at the highest sanitation and sharpness standards",
      "Offer hot towel shaves as standalone services or paired with haircuts and beard trims",
    ],
    "beard-oil-treatment": [
      "Apply premium beard oil treatments with warm towel wraps and relaxing beard massage",
      "Assess each client's beard type and select appropriate oils for softening, hydrating, or conditioning",
      "Perform thorough beard and face massage to distribute oil and promote healthy growth",
      "Comb and style the beard after treatment for a polished, healthy finish",
      "Offer beard oil treatments as standalone services or as add-ons to beard trims and shaves",
      "Educate clients on daily beard care routines and product recommendations",
    ],
    "mens-brow-cleanup": [
      "Clean up men's brows using wax, tweezers, or both for a natural, groomed appearance",
      "Remove the unibrow, stray hairs, and overgrowth while maintaining a natural, masculine shape",
      "Complete brow cleanup services in 10 to 15 minutes with precision and minimal discomfort",
      "Apply soothing post-treatment product to reduce redness",
      "Offer men's brow cleanup as a standalone or add-on to haircuts and grooming packages",
      "Consult with clients on the natural look they want — groomed but never overdone",
    ],
    "ear-and-nose-wax": [
      "Perform quick ear and nose hair removal using specialized hard wax designed for these delicate areas",
      "Complete ear and nose wax services in 5 to 10 minutes with minimal discomfort",
      "Apply soothing post-wax product and educate clients on expected results lasting 4 to 6 weeks",
      "Offer ear and nose wax as a quick add-on to any men's grooming appointment",
      "Maintain strict sanitation with single-use applicators and fresh wax for every client",
      "Explain the advantages of waxing over trimming for longer-lasting, cleaner results",
    ],
    "scalp-treatment": [
      "Perform professional scalp treatments including analysis, exfoliation, masks, and massage",
      "Customize scalp treatments based on individual needs — dandruff, dryness, thinning, or product buildup",
      "Use professional-grade products designed to promote healthy hair growth and reduce scalp irritation",
      "Deliver a deeply relaxing scalp massage as part of every treatment session",
      "Track client scalp health across multiple sessions and adjust treatments accordingly",
      "Offer scalp treatments as standalone services or paired with haircuts for added value",
    ],
    "mens-manicure": [
      "Perform men's manicures in client homes with nail trimming, shaping, cuticle care, and buffing",
      "Provide hand exfoliation and a brief hand massage as part of every men's manicure",
      "Deliver a clean, natural finish with buffing — no polish unless the client requests it",
      "Bring sanitized tools, disposable supplies, and a portable nail station to every appointment",
      "Offer men's manicures as standalone services or paired with pedicures for a full grooming package",
      "Market to professionals, executives, and men who value attention to detail in their grooming",
    ],
    "mens-pedicure": [
      "Deliver men's pedicures in client homes with foot soak, callus removal, nail care, and massage",
      "Bring a portable foot basin, sanitized tools, and professional-grade foot care products",
      "Perform thorough callus removal for athletes, runners, and professionals who are on their feet all day",
      "Provide foot and calf massage, exfoliation, and buffing for a clean, refreshed finish",
      "Offer men's pedicures as standalone services or paired with manicures for the complete experience",
      "Maintain strict sanitation with disposable liners, sterilized tools, and fresh towels at every appointment",
    ],
    "back-wax": [
      "Perform full back hair removal from neckline to waistline using professional strip or hard wax",
      "Set up disposable sheets and protective coverings in the client's home for a clean, professional experience",
      "Complete full back wax services in 30 to 45 minutes with efficiency and minimal discomfort",
      "Apply post-wax soothing treatment and provide detailed aftercare instructions",
      "Bring all disposable supplies, sanitization products, and professional wax to every appointment",
      "Offer back wax as a standalone service or paired with other body waxing appointments",
    ],
  };
  return taskMap[slug] || [
    `Perform professional mobile ${slug.replace(/-/g, " ")} services in client homes, offices, and venues across NYC`,
    "Consult with each client before every appointment to understand their goals and preferences",
    "Bring all necessary professional tools, products, and supplies to every appointment",
    "Maintain strict sanitation and hygiene standards between every client",
    "Deliver five-star service that builds your personal reputation and earns repeat bookings",
    "Manage your schedule, travel logistics, and client communication through our booking platform",
  ];
}

/* ── service-specific FAQs ────────────────────────────────────────── */

function getFaqsForService(serviceName: string, slug: string) {
  const isWomens = isWomensService(slug);
  const licenseType = isWomens
    ? (slug.includes("nail") || slug.includes("manicure") || slug.includes("pedicure") || slug.includes("acrylic") || slug.includes("dip") || slug.includes("gel-mani") || slug.includes("gel-pedi"))
      ? "cosmetology or nail specialty"
      : slug.includes("facial") || slug.includes("microderm") || slug.includes("peel")
        ? "esthetics"
        : slug.includes("wax") || slug.includes("bikini") || slug.includes("leg-wax") || slug.includes("underarm")
          ? "esthetics or cosmetology"
          : "cosmetology"
    : slug.includes("fade") || slug.includes("mens-haircut") || slug.includes("buzz") || slug.includes("line-up")
      ? "barbering or cosmetology"
      : slug.includes("beard") || slug.includes("hot-towel") || slug.includes("shave")
        ? "barbering"
        : slug.includes("mens-brow") || slug.includes("ear-and-nose") || slug.includes("back-wax")
          ? "esthetics or cosmetology"
          : slug.includes("scalp")
            ? "cosmetology"
            : slug.includes("mens-mani") || slug.includes("mens-pedi")
              ? "cosmetology or nail specialty"
              : "cosmetology";

  return [
    {
      q: `How much do mobile ${serviceName.toLowerCase()} professionals earn with The NYC Mobile Salon?`,
      a: `Our mobile ${serviceName.toLowerCase()} professionals earn $49 or more per hour. There are no booth rental fees, no product charges, and no overhead costs deducted from your earnings. Tips are 100% yours. Payment is sent via Zelle or Apple Cash within 30 minutes of job completion. On a full-time schedule of 30 to 40 hours per week, that translates to $1,470 to $1,960 in weekly earnings — significantly more than most traditional salon positions in New York City.`,
    },
    {
      q: `What license do I need to do mobile ${serviceName.toLowerCase()} work in NYC?`,
      a: `You must hold a valid New York State ${licenseType} license. We verify every license before onboarding and conduct periodic checks to ensure ongoing compliance. If your license is pending renewal, you may still apply — but you cannot begin accepting bookings until your license is current and verified.`,
    },
    {
      q: `Do I need to bring my own tools and products for mobile ${serviceName.toLowerCase()} appointments?`,
      a: `Yes. All professionals on our platform are expected to arrive at every appointment with their own professional-grade tools, products, and supplies. This includes everything specific to ${serviceName.toLowerCase()} services. You know your tools best, and your clients expect a fully professional setup from the moment you arrive.`,
    },
    {
      q: `How do I get ${serviceName.toLowerCase()} clients through The NYC Mobile Salon?`,
      a: `We handle all client acquisition through marketing, SEO, advertising, and partnerships. When a client in your service area books a ${serviceName.toLowerCase()} appointment, you receive a notification and can accept the booking. Our matching system prioritizes professionals based on location, availability, ratings, and expertise. You never have to hustle for your own clients — we fill your calendar.`,
    },
    {
      q: `Can I do mobile ${serviceName.toLowerCase()} work part-time while keeping my salon job?`,
      a: `Absolutely. Many of our ${serviceName.toLowerCase()} professionals use The NYC Mobile Salon to supplement their existing salon income. You set your own availability — work evenings, weekends, or specific days only. There are no minimum hour requirements. Some professionals start part-time and transition to full-time once they see how much more they earn without booth rent and overhead.`,
    },
    {
      q: `What boroughs and neighborhoods can I offer mobile ${serviceName.toLowerCase()} services in?`,
      a: `We serve all five NYC boroughs: Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. During onboarding, you select the neighborhoods and boroughs where you are willing to travel. You can update your service area at any time. Most professionals choose neighborhoods close to where they live to minimize travel time between appointments.`,
    },
  ];
}

/* ── sparkle icon ──────────────────────────────────────────────────── */

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

/* ── page component ───────────────────────────────────────────────── */

export default async function JoinServicePage({ params }: Props) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();
  const womens = isWomensService(slug);
  const content = serviceContent[slug];
  const tasks = getTasksForService(slug);
  const faqs = getFaqsForService(service.name, slug);

  const heroGradient = womens
    ? "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)"
    : "linear-gradient(135deg, #1E293B 0%, #334155 50%, #475569 100%)";

  const accentColor = womens ? "purple" : "slate";
  const accentBg = womens ? "bg-purple-600" : "bg-slate-800";
  const accentText = womens ? "text-purple-600" : "text-slate-800";
  const accentLightBg = womens ? "bg-purple-50/50" : "bg-slate-50";
  const accentBorder = womens ? "border-purple-100" : "border-slate-200";
  const accentBadgeBg = womens ? "bg-purple-100" : "bg-slate-100";
  const accentButtonBg = womens ? "bg-purple-600 hover:bg-purple-700 shadow-purple-500/20" : "bg-slate-800 hover:bg-slate-900 shadow-slate-500/20";
  const accentHeroButton = womens ? "text-purple-600 hover:bg-purple-50" : "text-slate-800 hover:bg-slate-50";

  /* ── JSON-LD ──────────────────────────────────────────────────────── */

  const jobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: `Mobile ${service.name} Professional — NYC`,
    description: `Join The NYC Mobile Salon as a mobile ${service.name.toLowerCase()} professional. Earn $49+/hour with no booth rental fees, flexible schedule, paid via Zelle or Apple Cash within 30 minutes of job completion, and liability insurance included. Work across all 5 NYC boroughs. Valid NYS license required.`,
    identifier: {
      "@type": "PropertyValue",
      name: "The NYC Mobile Salon",
      value: `nycms-${slug}`,
    },
    datePosted: new Date().toISOString().split("T")[0],
    validThrough: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
    employmentType: ["FULL_TIME", "PART_TIME"],
    hiringOrganization: {
      "@type": "Organization",
      name: "The NYC Mobile Salon",
      sameAs: "https://thenycmobilesalon.com",
      logo: "https://thenycmobilesalon.com/logo.png",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: "150 W 47th St",
        addressLocality: "New York",
        addressRegion: "NY",
        postalCode: "10036",
        addressCountry: "US",
      },
    },
    applicantLocationRequirements: {
      "@type": "City",
      name: "New York",
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        value: 49,
        minValue: 49,
        maxValue: 100,
        unitText: "HOUR",
      },
    },
    directApply: true,
    experienceRequirements: {
      "@type": "OccupationalExperienceRequirements",
      monthsOfExperience: 24,
    },
    qualifications: "Valid New York State cosmetology, barbering, esthetics, or nail specialty license required",
    jobBenefits: "Flexible schedule, no booth rental fees, liability insurance included, paid via Zelle or Apple Cash within 30 minutes of job completion, bonus programs, ongoing training",
  };

  const breadcrumbs = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Join Our Team", url: "/join" },
    { name: `${service.name} Jobs`, url: `/join/${slug}` },
  ]);

  const faqLd = faqSchema(faqs);

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      {/* ── 1. Hero ──────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 py-24 text-white md:py-32"
        style={{ background: heroGradient }}
      >
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
            <Sparkle className="h-3.5 w-3.5 text-yellow-300" />
            Now Hiring
          </span>
          <h1 className="mb-6 font-display text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">
            Mobile {service.name} Jobs in&nbsp;NYC
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90 md:text-xl">
            Earn $49+/hour as a mobile {service.name.toLowerCase()} professional with The NYC Mobile Salon. No booth rental fees. Set your own schedule. Paid via Zelle or Apple Cash within 30 minutes of job completion. Liability insurance included. All five NYC boroughs.
          </p>
          <Link
            href="/join/application"
            className={`inline-block rounded-full bg-white px-10 py-4 text-sm font-bold ${accentHeroButton} shadow-lg transition`}
          >
            Apply Now
          </Link>
        </div>
      </section>

      {/* ── 2. Job Description ───────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className={`mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            <Sparkle className="h-3.5 w-3.5" />
            The Role
          </h2>
          <h3 className="mb-8 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Mobile {service.name} Professional — New York City
          </h3>
          <div className="space-y-5 text-slate-600 leading-relaxed">
            <p>
              The NYC Mobile Salon is actively hiring licensed {service.name.toLowerCase()} professionals to join our growing team of mobile beauty experts serving clients across Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. This is not a traditional salon job. You will not be sitting in a chair waiting for walk-ins or paying hundreds of dollars a week in booth rent. Instead, you will be traveling directly to clients — in their homes, offices, hotel rooms, and event venues — delivering the same high-quality {service.name.toLowerCase()} services you would in any top NYC salon, but with dramatically better pay, total schedule flexibility, and zero overhead costs.
            </p>
            {content && (
              <p>
                {content.intro} As a mobile {service.name.toLowerCase()} professional on our team, you will bring this level of expertise directly to New York City clients who value convenience, quality, and personalized service. {content.details}
              </p>
            )}
            <p>
              A typical day as a mobile {service.name.toLowerCase()} professional might include two to five appointments across your chosen service area. You wake up, check your bookings for the day on our platform, pack your professional kit, and head to your first client. Each appointment is a one-on-one experience where you can focus entirely on your craft without the distractions and noise of a busy salon floor. Between appointments, you travel at your own pace — many of our professionals schedule gaps for lunch, errands, or simply to recharge. Your day ends when you decide it ends.
            </p>
            <p>
              We are looking for {service.name.toLowerCase()} professionals who take pride in their work, who treat every client like their most important one, and who want to build a sustainable, high-earning career in the beauty industry without sacrificing their personal life. Whether you are currently working in a salon and ready for something better, freelancing on your own and tired of hustling for every booking, or re-entering the industry after time away, The NYC Mobile Salon gives you the platform, the clients, and the support to succeed on your terms. Learn more about our <Link href={`/services/${slug}`} className={`${accentText} underline hover:no-underline`}>{service.name.toLowerCase()} services</Link> or explore all <Link href="/join" className={`${accentText} underline hover:no-underline`}>open positions</Link> on our team.
            </p>
            <p>
              Mobile {service.name.toLowerCase()} jobs in NYC are in higher demand than ever. New Yorkers across all five boroughs are choosing the convenience and comfort of at-home beauty services, and that demand translates directly into consistent bookings and strong earnings for the professionals on our roster. If you have the skills, the license, and the drive, we have the clients and the infrastructure to keep your calendar full.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Quick Stats ───────────────────────────────────────── */}
      <section className="bg-charcoal px-4 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { value: "$49+", label: "Per Hour" },
            { value: "Instant", label: "Zelle / Apple Cash" },
            { value: "$0", label: "Booth Rent" },
            { value: "5", label: "NYC Boroughs" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`font-display text-3xl font-black ${womens ? "text-purple-400" : "text-sky-400"} md:text-4xl`}>
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. What You'll Do ────────────────────────────────────── */}
      <section className={`${accentLightBg} px-4 py-20`}>
        <div className="mx-auto max-w-3xl">
          <h2 className={`mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            <Sparkle className="h-3.5 w-3.5" />
            Responsibilities
          </h2>
          <h3 className="mb-8 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            What You&rsquo;ll Do as a Mobile {service.name} Professional
          </h3>
          <div className={`rounded-xl border ${accentBorder} bg-white p-8`}>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">
              As a mobile {service.name.toLowerCase()} professional with The NYC Mobile Salon, your primary responsibility is delivering exceptional, salon-quality {service.name.toLowerCase()} services in client homes, offices, and event venues across New York City. Here is what a typical workload looks like:
            </p>
            <ul className="space-y-4">
              {tasks.map((task, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${accentBg} text-[10px] font-bold text-white`}>
                    &#10003;
                  </span>
                  <span className="text-sm leading-relaxed text-slate-600">{task}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 5. Requirements ──────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className={`mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            <Sparkle className="h-3.5 w-3.5" />
            Requirements
          </h2>
          <h3 className="mb-8 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            What We&rsquo;re Looking For
          </h3>
          <div className={`rounded-xl border ${accentBorder} bg-white p-8`}>
            <ul className="space-y-4">
              {[
                {
                  title: "Valid New York State License",
                  detail: `You must hold a current, valid NYS cosmetology, barbering, esthetics, or nail specialty license appropriate for ${service.name.toLowerCase()} services. We verify every license before onboarding and conduct periodic checks to ensure ongoing compliance.`,
                },
                {
                  title: "Own Professional Tools & Kit",
                  detail: `You are expected to arrive at every ${service.name.toLowerCase()} appointment with your own professional-grade tools, products, and supplies. This includes everything specific to ${service.name.toLowerCase()} services — shears, brushes, lamps, products, and any other equipment required.`,
                },
                {
                  title: "2+ Years Experience (Preferred)",
                  detail: `We strongly prefer ${service.name.toLowerCase()} professionals with at least two years of hands-on experience. This ensures you can handle a wide range of client requests confidently and deliver consistent results in a mobile setting.`,
                },
                {
                  title: "Reliable Transportation",
                  detail: "As a mobile professional, you need reliable transportation to travel between appointments across your chosen service area. Car, subway, rideshare — the method is up to you, but punctuality is non-negotiable.",
                },
                {
                  title: "Smartphone for Booking Management",
                  detail: "All bookings, scheduling, and client communication are managed through our platform. You need a smartphone with reliable internet to receive appointment notifications and manage your calendar.",
                },
                {
                  title: "Professional Attitude & Appearance",
                  detail: `You represent The NYC Mobile Salon every time you walk through a client's door. We expect a polished, professional appearance and a warm, respectful attitude — especially when providing ${service.name.toLowerCase()} services in someone's personal space.`,
                },
              ].map((req) => (
                <li key={req.title} className="flex gap-3">
                  <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${accentBg} text-[10px] font-bold text-white`}>
                    &#10003;
                  </span>
                  <div>
                    <p className="font-display font-bold text-slate-800">{req.title}</p>
                    <p className="text-sm leading-relaxed text-slate-600">{req.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 6. What You Get ──────────────────────────────────────── */}
      <section className={`${accentLightBg} px-4 py-20`}>
        <div className="mx-auto max-w-6xl">
          <h2 className={`mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            <Sparkle className="h-3.5 w-3.5" />
            Benefits
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            What You Get as a Mobile {service.name} Professional
          </h3>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Competitive Pay — $49+/hr",
                description: `Earn $49 or more per hour for every ${service.name.toLowerCase()} appointment. No booth rental fees, no product charges, no overhead costs deducted from your earnings. 100% of tips are always yours. Paid via Zelle or Apple Cash within 30 minutes of job completion. Our mobile ${service.name.toLowerCase()} professionals consistently out-earn their peers in traditional NYC salons.`,
              },
              {
                title: "Flexible Schedule",
                description: `You decide when you work. Morning, evening, weekdays, weekends — accept only the ${service.name.toLowerCase()} appointments that fit your life. No shift assignments, no mandatory hours. Whether you want to work five days a week or pick up extra clients on Saturdays, the flexibility is entirely yours.`,
              },
              {
                title: "We Supply the Clients",
                description: `No more spending evenings on Instagram hustling for bookings. We invest heavily in marketing, SEO, and partnerships to drive a steady stream of ${service.name.toLowerCase()} clients to our platform. You focus on your craft — we focus on filling your calendar with quality bookings.`,
              },
              {
                title: "Liability Insurance Included",
                description: `Every ${service.name.toLowerCase()} professional on our roster is covered by comprehensive general liability insurance at no cost. Focus entirely on delivering great ${service.name.toLowerCase()} service without worrying about costly insurance premiums or coverage gaps.`,
              },
              {
                title: "$0 Booth Rent — Ever",
                description: `Forget paying $300 to $500 a week for a salon chair. With The NYC Mobile Salon, you never pay booth rent, station fees, or any fixed overhead. Your only investment as a mobile ${service.name.toLowerCase()} professional is your time, talent, and tools.`,
              },
              {
                title: "Growth Opportunities",
                description: `Top-performing ${service.name.toLowerCase()} professionals earn priority access to high-value bookings, VIP client lists, and special event opportunities. As our platform grows, the best talent gets rewarded with more bookings, higher-ticket clients, and leadership roles.`,
              },
            ].map((benefit) => (
              <div
                key={benefit.title}
                className={`rounded-xl border ${accentBorder} bg-white p-6`}
              >
                <h4 className="mb-3 font-display text-lg font-bold text-slate-800">
                  {benefit.title}
                </h4>
                <p className="text-sm leading-relaxed text-slate-500">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Earnings Potential ─────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className={`mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            <Sparkle className="h-3.5 w-3.5" />
            Earning Potential
          </h2>
          <h3 className="mb-4 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            How Much Can a Mobile {service.name} Professional Earn?
          </h3>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-slate-600 leading-relaxed">
            Your earnings as a mobile {service.name.toLowerCase()} professional depend on how many hours you choose to work. With a $49/hour rate and zero booth rent or overhead, here is what realistic weekly earnings look like for {service.name.toLowerCase()} professionals on our platform.
          </p>
          <div className={`overflow-hidden rounded-xl border ${accentBorder}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={womens ? "bg-purple-50" : "bg-slate-50"}>
                  <th className="px-6 py-4 text-left font-display font-bold text-slate-800">Schedule</th>
                  <th className="px-6 py-4 text-left font-display font-bold text-slate-800">Hours/Week</th>
                  <th className="px-6 py-4 text-left font-display font-bold text-slate-800">Weekly Earnings</th>
                  <th className="hidden px-6 py-4 text-left font-display font-bold text-slate-800 md:table-cell">Monthly Earnings</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${womens ? "divide-purple-50" : "divide-slate-50"}`}>
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-700">Part-Time (Weekends)</td>
                  <td className="px-6 py-4 text-slate-600">10–15 hrs</td>
                  <td className={`px-6 py-4 font-semibold ${accentText}`}>$490 – $735</td>
                  <td className="hidden px-6 py-4 text-slate-600 md:table-cell">$1,960 – $2,940</td>
                </tr>
                <tr className={womens ? "bg-purple-50/30" : "bg-slate-50/30"}>
                  <td className="px-6 py-4 font-medium text-slate-700">Mid-Range (3–4 Days)</td>
                  <td className="px-6 py-4 text-slate-600">20–25 hrs</td>
                  <td className={`px-6 py-4 font-semibold ${accentText}`}>$980 – $1,225</td>
                  <td className="hidden px-6 py-4 text-slate-600 md:table-cell">$3,920 – $4,900</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-700">Full-Time (5–6 Days)</td>
                  <td className="px-6 py-4 text-slate-600">30–40 hrs</td>
                  <td className={`px-6 py-4 font-semibold ${accentText}`}>$1,470 – $1,960</td>
                  <td className="hidden px-6 py-4 text-slate-600 md:table-cell">$5,880 – $7,840</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            Based on $49/hr rate. Actual earnings vary by experience level and client demand. Tips are additional and 100% yours. {service.name} appointments may run longer for premium services, increasing per-appointment earnings.
          </p>
        </div>
      </section>

      {/* ── 8. Apply in Your Borough ─────────────────────────────── */}
      <section className={`${accentLightBg} px-4 py-20`}>
        <div className="mx-auto max-w-5xl">
          <h2 className={`mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            <Sparkle className="h-3.5 w-3.5" />
            Service Areas
          </h2>
          <h3 className="mb-4 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Mobile {service.name} Jobs by Borough
          </h3>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-slate-600 leading-relaxed">
            We are hiring mobile {service.name.toLowerCase()} professionals in every NYC borough. Choose the area closest to you or explore opportunities across the city. Each borough has dozens of neighborhoods where clients are actively booking {service.name.toLowerCase()} services.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(boroughNames).map(([boroSlug, boroName]) => {
              const hoodCount = neighborhoods[boroSlug]?.length ?? 0;
              return (
                <Link
                  key={boroSlug}
                  href={`/join/${slug}/${boroSlug}`}
                  className={`group rounded-xl border ${accentBorder} bg-white p-6 text-center transition hover:shadow-md hover:-translate-y-0.5`}
                >
                  <h4 className="mb-2 font-display text-lg font-bold text-slate-800 group-hover:text-purple-600 transition">
                    {boroName}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {hoodCount} neighborhoods
                  </p>
                  <p className={`mt-3 text-xs font-semibold ${accentText}`}>
                    View {service.name} jobs &rarr;
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 9. FAQ ───────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className={`mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest ${accentText}`}>
            <Sparkle className="h-3.5 w-3.5" />
            FAQ
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Mobile {service.name} Jobs — Frequently Asked Questions
          </h3>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className={`rounded-xl border ${accentBorder} bg-white p-6`}>
                <h4 className="mb-2 font-display font-bold text-slate-800">{faq.q}</h4>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. CTA ──────────────────────────────────────────────── */}
      <section
        className="px-4 py-24 text-white md:py-32"
        style={{ background: heroGradient }}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 font-display text-4xl font-black tracking-tight md:text-5xl">
            Ready to Join as a Mobile {service.name} Professional?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-white/90">
            Send us your name, your {service.name.toLowerCase()} experience, your availability, and a link to your portfolio or social media. Most applicants hear back within 48 hours. Start earning $49+/hour with no booth rent, no overhead, and total schedule flexibility.
          </p>
          <Link
            href="/join/application"
            className={`inline-block rounded-full bg-white px-10 py-4 text-sm font-bold ${accentHeroButton} shadow-lg transition`}
          >
            Apply Now
          </Link>
          <p className="mt-6 text-sm text-white/70">
            Questions first?{" "}
            <Link href="/contact" className="text-white underline hover:text-white/90">
              Contact us
            </Link>{" "}
            or explore all{" "}
            <Link href="/join" className="text-white underline hover:text-white/90">
              open positions
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
