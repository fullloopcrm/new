"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/landscaping-in-nyc/_lib/siteData";

interface Props {
  faqs: { question: string; answer: string }[];
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border-2 border-dashed border-green-300 bg-green-50/60 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-lg">&#127793;</span>
        <div className="text-sm leading-relaxed text-green-900">
          <span className="font-bold uppercase tracking-wider text-green-700 text-xs">Pro Tip</span>
          <p className="mt-1">{children}</p>
        </div>
      </div>
    </div>
  );
}

function ChapterNav() {
  const chapters = [
    { id: "nyc-basics", label: "1. NYC Landscaping Basics" },
    { id: "choosing-plants", label: "2. Choosing Plants (Zone 7a/7b)" },
    { id: "permits", label: "3. Permits & Regulations" },
    { id: "rooftop-gardens", label: "4. Rooftop Gardens" },
    { id: "seasonal-care", label: "5. Seasonal Maintenance" },
    { id: "irrigation", label: "6. Irrigation Systems" },
    { id: "lighting", label: "7. Landscape Lighting" },
    { id: "hardscaping", label: "8. Hardscaping Basics" },
    { id: "common-mistakes", label: "9. Common Mistakes" },
    { id: "hiring", label: "10. Hiring a Landscaper" },
    { id: "faq", label: "11. FAQ" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-lg font-bold text-slate-900 font-heading">What You&apos;ll Learn</h2>
      <nav className="mt-4 space-y-1">
        {chapters.map((ch) => (
          <a key={ch.id} href={`#${ch.id}`} className="block rounded-lg px-3 py-2 text-sm text-green-700 transition-colors hover:bg-green-50 hover:text-green-900 font-cta">
            {ch.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

export default function Landscaping101Client({ faqs }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl animate-blob" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-200 font-cta">
            The Complete NYC Guide
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Landscaping <span className="text-green-200">101</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Everything you need to know about landscaping in New York City — from plant selection and permits to rooftop gardens and seasonal care. No jargon, just practical advice for NYC property owners.
          </motion.p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
            {/* Main Content */}
            <div className="space-y-16">

              {/* Chapter 1 */}
              <div id="nyc-basics">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">1. NYC Landscaping Basics</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    Landscaping in New York City is fundamentally different from landscaping anywhere else. <strong>Space is limited, access is complicated, regulations are strict, and the environment is harsh</strong> — but the payoff is enormous.
                  </p>
                  <p>
                    A well-designed outdoor space in NYC isn&apos;t just aesthetically pleasing — it dramatically increases property value, improves quality of life, and creates a private retreat in the most densely populated city in America. Whether you&apos;re working with a 200 sq ft backyard in Brooklyn or a 2,000 sq ft rooftop in Manhattan, the principles are the same.
                  </p>
                  <p>
                    NYC landscaping encompasses everything from <strong>garden design and planting</strong> to <strong>hardscaping</strong> (patios, walkways, retaining walls), <strong>irrigation systems</strong>, <strong>outdoor lighting</strong>, <strong>rooftop gardens</strong>, and <strong>year-round maintenance</strong>. The best NYC landscapes work with the city&apos;s unique constraints rather than fighting them.
                  </p>
                  <p>
                    Key factors that make NYC landscaping unique: limited sunlight in many backyards due to building shadows, restricted vehicle access for material delivery, building codes and DOB permit requirements, weight limitations on rooftops and terraces, and four distinct seasons that demand year-round planning.
                  </p>
                  <Tip>Before starting any project, assess three things: (1) how much sun your space gets throughout the day, (2) how materials and equipment will access the site, and (3) whether you need any permits. These three factors drive every design decision.</Tip>
                </div>
              </div>

              {/* Chapter 2 */}
              <div id="choosing-plants">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">2. Choosing Plants for Zone 7a/7b</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    New York City falls in <strong>USDA Hardiness Zones 7a and 7b</strong>, meaning minimum winter temperatures range from 0&deg;F to 10&deg;F. This determines which plants can survive outdoors year-round. Choosing the right plants for your zone is the single most important decision in any landscaping project.
                  </p>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-6">
                    <p className="text-sm font-bold text-slate-900 font-heading">NYC Plant Selection Guide by Light Condition</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <p><strong>Full Sun (6+ hours):</strong> Lavender, echinacea, black-eyed Susans, ornamental grasses, daylilies, roses, salvia, catmint, sedum, butterfly bush</p>
                      <p><strong>Partial Shade (3-6 hours):</strong> Hydrangeas, astilbe, Japanese anemone, heuchera, bleeding heart, foxglove, hellebores, Japanese forest grass</p>
                      <p><strong>Full Shade (under 3 hours):</strong> Hostas, ferns, brunnera, Solomon&apos;s seal, lily of the valley, sweet woodruff, wild ginger, dead nettle</p>
                      <p><strong>Evergreen Structure:</strong> Boxwood, holly, arborvitae, yew, juniper, rhododendron, pieris, mountain laurel</p>
                    </div>
                  </div>
                  <p>
                    <strong>Native plants</strong> are increasingly popular in NYC landscaping and for good reason — they&apos;re adapted to local conditions, require less water and fertilizer, support pollinators, and resist local pests. Top native picks include Eastern red columbine, Joe-Pye weed, New England aster, switchgrass, and Virginia sweetspire.
                  </p>
                  <p>
                    For <strong>container gardens</strong> (essential on rooftops and terraces), choose plants rated one zone hardier than your area (Zone 6 plants for NYC containers) since container soil freezes harder than ground soil. Alternatively, use frost-proof containers with insulation liners.
                  </p>
                  <Tip>The biggest mistake in NYC gardens: choosing plants that need full sun for a shaded backyard. Most NYC backyards get 3-4 hours of direct sun at best. Embrace shade gardening — shade gardens can be stunning with the right plant palette.</Tip>
                  <p>
                    Browse our <Link href="/services" className="text-green-600 underline underline-offset-2 hover:text-green-800">landscaping services</Link> to see how we can help with plant selection and garden design.
                  </p>
                </div>
              </div>

              {/* Chapter 3 */}
              <div id="permits">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">3. NYC Permits & Regulations</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>NYC has specific regulations that affect landscaping projects. Here&apos;s what requires a permit and what doesn&apos;t:</p>
                  <div className="space-y-4">
                    {[
                      { type: "Planting, mulching, garden beds", permit: "No permit needed", note: "Standard landscaping on your own property is unrestricted." },
                      { type: "Fences under 6 feet", permit: "No permit needed", note: "Must be on your property line. Good neighbor practice: nice side faces out." },
                      { type: "Fences over 6 feet", permit: "DOB permit required", note: "Requires plans filed with the Department of Buildings." },
                      { type: "Retaining walls under 4 feet", permit: "No permit needed", note: "Standard landscape retaining walls are fine without permit." },
                      { type: "Retaining walls over 4 feet", permit: "DOB permit required", note: "Requires engineering calculations and filed plans." },
                      { type: "Decks and pergolas", permit: "DOB permit required", note: "Any attached or elevated structure needs a building permit." },
                      { type: "Rooftop gardens", permit: "Usually required", note: "Structural engineering review, waterproofing certification, and DOB filing typically needed." },
                      { type: "Tree removal (trunk over 6\" diameter)", permit: "Parks Dept permit required", note: "NYC Parks issues Tree Removal Permits. Fines up to $15,000 for unauthorized removal." },
                      { type: "Street tree planting", permit: "Parks Dept approval", note: "Contact NYC Parks for free street tree planting through the MillionTreesNYC program." },
                      { type: "Drainage and grading changes", permit: "May require DOB/DEP approval", note: "Changes affecting stormwater flow or neighboring properties need review." },
                    ].map((item) => (
                      <div key={item.type} className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-4">
                          <h4 className="text-sm font-bold text-slate-900 font-heading">{item.type}</h4>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.permit.includes("No") ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                            {item.permit}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{item.note}</p>
                      </div>
                    ))}
                  </div>
                  <Tip>When in doubt, check with DOB before starting work. Permit violations in NYC carry hefty fines and can require you to tear out completed work. We handle all permit filings for our clients.</Tip>
                </div>
              </div>

              {/* Chapter 4 */}
              <div id="rooftop-gardens">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">4. Rooftop Gardens</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    Rooftop gardens are one of the most rewarding — and most complex — landscaping projects in NYC. They transform unused space into private gardens, entertaining areas, and green retreats above the skyline. But they require careful planning.
                  </p>
                  <p><strong>Critical considerations for NYC rooftop gardens:</strong></p>
                  <div className="space-y-4">
                    {[
                      { factor: "Structural load capacity", detail: "A structural engineer must verify your roof can support the weight of soil, plants, containers, water, furniture, and people. Saturated soil weighs 100-120 lbs per cubic foot. Most NYC roofs need reinforcement for extensive gardens." },
                      { factor: "Waterproofing protection", detail: "The existing waterproofing membrane must be protected. We install root barriers, drainage mats, and protection boards before any soil or containers go down. Damaging the membrane means leaks into the building below — an expensive mistake." },
                      { factor: "Wind exposure", detail: "NYC rooftops experience 2-3x the wind speeds at ground level. Plants must be wind-tolerant, containers must be weighted or secured, and structures (pergolas, screens) must be engineered for wind loads. Tall, top-heavy plants will not survive." },
                      { factor: "Irrigation access", detail: "You need a reliable water source. Most rooftop gardens connect to the building's water supply with a dedicated line and backflow preventer. Manual watering is impractical for anything beyond a few containers." },
                      { factor: "Building approval", detail: "Co-op/condo boards and building management must approve the project. Plans typically need to show structural engineering approval, installation methods, maintenance plans, and insurance coverage." },
                      { factor: "Lightweight growing media", detail: "Standard garden soil is too heavy for rooftops. We use engineered lightweight growing media that weighs 40-60% less than soil while providing proper drainage and root support." },
                    ].map((item) => (
                      <div key={item.factor} className="rounded-lg border border-slate-200 bg-white p-4">
                        <h4 className="text-sm font-bold text-slate-900 font-heading">{item.factor}</h4>
                        <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                  <Tip>NYC offers property tax abatements for qualifying green roofs through the Green Roof Tax Abatement program. A certified green roof can reduce your property tax bill by $5.23 per square foot of green roof area, up to $200,000. This can offset a significant portion of installation costs.</Tip>
                </div>
              </div>

              {/* Chapter 5 */}
              <div id="seasonal-care">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">5. Seasonal Maintenance Calendar</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>NYC&apos;s four distinct seasons require a proactive maintenance approach. Here&apos;s your month-by-month guide:</p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead><tr className="bg-slate-50">
                        <th className="px-5 py-3.5 font-semibold text-slate-900">Season</th>
                        <th className="px-5 py-3.5 font-semibold text-slate-900">Months</th>
                        <th className="px-5 py-3.5 font-semibold text-slate-900">Key Tasks</th>
                      </tr></thead>
                      <tbody>
                        {[
                          { season: "Early Spring", months: "Mar–Apr", tasks: "Spring cleanup, prune shrubs, divide perennials, apply pre-emergent, soil testing, fresh mulch, early annuals" },
                          { season: "Late Spring", months: "May–Jun", tasks: "Plant annuals & tropicals, start irrigation, first mowing, fertilize lawns, install new plantings, pest monitoring" },
                          { season: "Summer", months: "Jul–Aug", tasks: "Regular mowing, deep watering, deadheading, pest & disease management, container care, hedge trimming" },
                          { season: "Early Fall", months: "Sep–Oct", tasks: "Overseed lawns, aerate, plant bulbs, transplant perennials, fall fertilization, begin cleanup" },
                          { season: "Late Fall", months: "Nov", tasks: "Leaf removal, cut back perennials, winterize irrigation, wrap tender shrubs, apply winter mulch" },
                          { season: "Winter", months: "Dec–Feb", tasks: "Snow removal, de-icing, check for winter damage, plan spring projects, order materials" },
                        ].map((row, i) => (
                          <tr key={row.season} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                            <td className="px-5 py-3 font-medium text-slate-900">{row.season}</td>
                            <td className="px-5 py-3 text-slate-600">{row.months}</td>
                            <td className="px-5 py-3 text-slate-600">{row.tasks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Tip>The most neglected season in NYC landscaping is fall. What you do in September-November determines how your garden looks the following spring. Fall is the best time to plant trees, shrubs, and perennials because roots establish over winter without the stress of summer heat.</Tip>
                </div>
              </div>

              {/* Chapter 6 */}
              <div id="irrigation">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">6. Irrigation Systems</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    Proper irrigation is essential for NYC landscapes, especially during July-August heat waves when temperatures regularly exceed 90&deg;F. Manual watering is inconsistent and time-consuming — an automated system pays for itself in plant survival alone.
                  </p>
                  <div className="space-y-4">
                    {[
                      { type: "Drip Irrigation", best: "Garden beds, borders, containers", detail: "Delivers water directly to root zones through emitters. Uses 30-50% less water than sprinklers. Ideal for NYC gardens where overspray onto neighbors, sidewalks, or buildings is unacceptable." },
                      { type: "Micro-Sprinklers", best: "Lawn areas, ground covers", detail: "Low-volume spray heads for areas needing broader coverage. Good for small lawn sections common in NYC backyards." },
                      { type: "Smart Controllers", best: "Any system", detail: "WiFi-connected controllers adjust watering based on weather data, soil moisture, and rain sensors. Saves 30-50% on water usage. Can be monitored and adjusted remotely." },
                      { type: "Rooftop Systems", best: "Rooftop and terrace gardens", detail: "Custom drip systems connected to building water supply with backflow prevention. Timer-controlled for consistent coverage. Essential for rooftop container gardens." },
                    ].map((item) => (
                      <div key={item.type} className="rounded-lg border border-slate-200 bg-white p-4">
                        <h4 className="text-sm font-bold text-slate-900 font-heading">{item.type}</h4>
                        <p className="text-xs font-medium text-green-600 mt-0.5">Best for: {item.best}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                  <Tip>NYC water costs roughly $0.015 per gallon. A smart irrigation system for a typical backyard garden costs $1,500-$3,000 to install and saves $200-$500/year in water while keeping plants healthier. ROI is typically under 3 years.</Tip>
                </div>
              </div>

              {/* Chapter 7 */}
              <div id="lighting">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">7. Landscape Lighting</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    Landscape lighting transforms outdoor spaces from daytime-only areas into year-round living spaces. In NYC, where outdoor space is precious, extending usability into evening hours effectively doubles the value of your landscape investment.
                  </p>
                  <p><strong>Key lighting techniques:</strong></p>
                  <ul className="ml-6 space-y-2 list-disc">
                    <li><strong>Path Lighting:</strong> Low fixtures along walkways and garden paths for safety and ambiance. Use 12-18&quot; tall fixtures spaced 6-8 feet apart.</li>
                    <li><strong>Uplighting:</strong> Ground-mounted fixtures aimed up at trees, architectural features, or textured walls. Creates dramatic shadows and depth.</li>
                    <li><strong>Downlighting (Moonlighting):</strong> Fixtures mounted in trees aimed downward to simulate natural moonlight. Soft, atmospheric effect.</li>
                    <li><strong>Accent Lighting:</strong> Spotlights highlighting focal points — specimen plants, water features, sculptures, or architectural elements.</li>
                    <li><strong>Deck & Patio Lighting:</strong> Recessed lights in steps, built-in bench lighting, and post cap lights for safety and atmosphere.</li>
                    <li><strong>String Lights:</strong> Classic overhead string lights for dining areas and entertaining spaces. Use commercial-grade LED strings for durability.</li>
                  </ul>
                  <p>
                    All our installations use <strong>low-voltage LED systems</strong> (12V) for safety and energy efficiency. LEDs use 75% less energy than halogen, last 50,000+ hours, and generate minimal heat. Low-voltage systems don&apos;t require an electrician for installation.
                  </p>
                  <Tip>The #1 rule of landscape lighting: less is more. Overlighting makes spaces feel like a parking lot. Use warm white (2700K) LEDs and aim for pools of light with areas of shadow between them. The contrast creates depth and drama.</Tip>
                </div>
              </div>

              {/* Chapter 8 */}
              <div id="hardscaping">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">8. Hardscaping Basics</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    Hardscaping — the non-plant elements of your landscape — is especially critical in NYC. With limited space, hardscaping creates usable outdoor living areas that maximize every square foot.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { type: "Patios", note: "Bluestone, flagstone, pavers, or concrete. The foundation of any outdoor living space. Typical NYC patio costs $25-$60/sq ft installed." },
                      { type: "Walkways", note: "Connect spaces and guide traffic. Natural stone, pavers, or gravel with edging. $15-$40/sq ft." },
                      { type: "Retaining Walls", note: "Essential for sloped properties. Natural stone, block, or poured concrete. $30-$80/sq ft of wall face." },
                      { type: "Steps & Staircases", note: "Bluestone or flagstone treads with stone or block risers. Critical for grade changes common in NYC." },
                      { type: "Pergolas & Arbors", note: "Shade structures for seating areas. Cedar, composite, or aluminum. DOB permit required." },
                      { type: "Fire Pits & Fireplaces", note: "Gas-fueled (wood-burning generally prohibited in NYC). Built-in or portable options." },
                      { type: "Outdoor Kitchens", note: "Built-in grills, countertops, sinks. Requires gas line and possibly plumbing permits." },
                      { type: "Water Features", note: "Fountains, bubblers, pondless waterfalls. Mask city noise and add tranquility. Recirculating systems." },
                      { type: "Fencing & Privacy Screens", note: "Wood, composite, metal panels, or living screens. Up to 6' without permit in most cases." },
                      { type: "Permeable Pavers", note: "Allow rainwater infiltration, reducing runoff. NYC offers incentives for stormwater management." },
                    ].map((item) => (
                      <div key={item.type} className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                        <h4 className="text-sm font-bold text-slate-900 font-heading">{item.type}</h4>
                        <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                      </div>
                    ))}
                  </div>
                  <Tip>In small NYC spaces, the ratio of hardscape to softscape (plants) matters. A common guideline: 60% hardscape / 40% plants for entertainment-focused spaces, or 40% hardscape / 60% plants for garden-focused spaces. Balance is key.</Tip>
                </div>
              </div>

              {/* Chapter 9 */}
              <div id="common-mistakes">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">9. Common Mistakes to Avoid</h2>
                <div className="mt-6 space-y-4">
                  {[
                    { mistake: "Planting sun-loving plants in a shaded NYC backyard", fix: "Assess actual sunlight hours before selecting plants. Most NYC backyards are shadier than you think due to surrounding buildings." },
                    { mistake: "Ignoring drainage before installing hardscaping", fix: "Always address drainage first. A beautiful patio that floods after every rain is useless. Slope surfaces away from buildings and install proper drainage." },
                    { mistake: "Overloading a rooftop without structural assessment", fix: "ALWAYS get a structural engineer's assessment before adding weight to a roof. Saturated soil is incredibly heavy. Structural failure is catastrophic and expensive." },
                    { mistake: "Choosing high-maintenance plants without a maintenance plan", fix: "If you won't maintain it yourself and don't have a maintenance contract, choose low-maintenance plants. A neglected garden looks worse than no garden." },
                    { mistake: "Skipping the permit process for structural work", fix: "DOB violations carry heavy fines and can require you to remove completed work. File permits before starting. The cost is minimal compared to penalties." },
                    { mistake: "Not planning for all four seasons", fix: "A garden that looks amazing in June but dead in January wastes half its potential. Include evergreen structure, winter-interest plants, and hardscaping that looks good year-round." },
                    { mistake: "Underestimating material delivery logistics in NYC", fix: "Getting pavers, soil, and stone to a Brooklyn backyard through a narrow brownstone hallway is a real challenge. Plan access routes and delivery logistics before ordering materials." },
                  ].map((item, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 bg-white p-5">
                      <h4 className="text-sm font-bold text-red-700">&#10007; {item.mistake}</h4>
                      <p className="mt-2 text-sm text-slate-500"><span className="font-semibold text-green-700">&#10003; Fix:</span> {item.fix}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chapter 10 */}
              <div id="hiring">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">10. Hiring a Landscaper in NYC</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>Choosing the right landscaping company in NYC is critical. Here&apos;s what to look for:</p>
                  <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="rounded-xl border border-green-200 bg-green-50/50 p-6">
                      <h3 className="text-base font-bold text-green-800 font-heading">Green Flags</h3>
                      <ul className="mt-4 space-y-2">
                        {[
                          "Licensed and insured (verify coverage)",
                          "NYC-specific experience (permits, access, codes)",
                          "Written contracts with detailed scope",
                          "Portfolio of local NYC projects",
                          "References from NYC property owners",
                          "Transparent pricing with detailed estimates",
                          "Warranty on plants and workmanship",
                          "Handles permit filings",
                          "Year-round availability for maintenance",
                          "Carries workers' compensation insurance",
                        ].map((pro) => (
                          <li key={pro} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-green-600 shrink-0">&#10003;</span> {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
                      <h3 className="text-base font-bold text-red-800 font-heading">Red Flags</h3>
                      <ul className="mt-4 space-y-2">
                        {[
                          "No insurance or won't provide certificate",
                          "Cash-only with no written contract",
                          "Demands large upfront payment (over 30%)",
                          "No physical address or business license",
                          "Can't show NYC-specific project examples",
                          "Unfamiliar with NYC permit requirements",
                          "Won't provide references",
                          "Significantly underbids all competitors",
                        ].map((con) => (
                          <li key={con} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-red-500 shrink-0">&#10007;</span> {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Tip>Always get at least 3 written estimates for any project over $5,000. Compare not just price but scope, materials specified, timeline, warranty terms, and payment schedule. The cheapest bid is rarely the best value.</Tip>
                </div>
              </div>

              {/* Chapter 11 — FAQ */}
              <div id="faq">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">11. Frequently Asked Questions</h2>
                <div className="mt-8 space-y-3">
                  {faqs.map((faq, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white transition-colors hover:border-green-300">
                      <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                        <span className="pr-4 text-sm font-semibold text-slate-800 font-heading">{faq.question}</span>
                        <svg className={`h-4 w-4 shrink-0 text-green-500 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <AnimatePresence>
                        {openFaq === i && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                            <p className="px-5 pb-4 text-sm leading-relaxed text-slate-500">{faq.answer}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Sidebar — sticky chapter nav */}
            <div className="hidden lg:block">
              <div className="sticky top-28 space-y-6">
                <ChapterNav />
                <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
                  <p className="text-sm font-bold text-green-800">Ready for a free estimate?</p>
                  <Link href="/get-a-free-estimate" className="mt-3 block rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 font-cta">
                    Get a Free Estimate
                  </Link>
                  <a href={PHONE_HREF} className="mt-2 block text-sm font-semibold text-green-700 hover:text-green-900">{PHONE}</a>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                  <Link href="/estimate" className="block rounded-lg bg-white border border-green-300 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 font-cta">
                    Cost Estimator
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-green-700 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">Now You Know NYC Landscaping</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            You&apos;ve got the knowledge. Now get a free estimate, explore our services, or browse landscaping in your area.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/estimate">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-green-700 shadow-lg hover:bg-green-50 font-cta">
                Cost Estimator
              </motion.span>
            </Link>
            <Link href="/get-a-free-estimate">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
                Get a Free Estimate
              </motion.span>
            </Link>
            <Link href="/areas">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
                Browse NYC Areas
              </motion.span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
