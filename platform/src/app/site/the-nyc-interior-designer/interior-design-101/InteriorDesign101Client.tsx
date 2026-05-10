// @ts-nocheck
"use client";

import { useState } from "react";
import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/the-nyc-interior-designer/_lib/siteData";

interface Props {
  faqs: { question: string; answer: string }[];
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-lg">&#9733;</span>
        <div className="text-sm leading-relaxed text-blue-900">
          <span className="font-bold uppercase tracking-wider text-blue-700 text-xs">Pro Tip</span>
          <p className="mt-1">{children}</p>
        </div>
      </div>
    </div>
  );
}

function ChapterNav() {
  const chapters = [
    { id: "nyc-basics", label: "1. NYC Design Basics" },
    { id: "understanding-space", label: "2. Understanding Your Space" },
    { id: "working-with-designers", label: "3. Working With Designers" },
    { id: "coop-condo", label: "4. Co-op & Condo Considerations" },
    { id: "materials", label: "5. Material Selection" },
    { id: "color-theory", label: "6. Color Theory for Interiors" },
    { id: "lighting", label: "7. Lighting Fundamentals" },
    { id: "budgeting", label: "8. Budgeting Your Project" },
    { id: "common-mistakes", label: "9. Common Mistakes" },
    { id: "hiring", label: "10. Hiring a Designer" },
    { id: "faq", label: "11. FAQ" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-lg font-bold text-slate-900">What You&apos;ll Learn</h2>
      <nav className="mt-4 space-y-1">
        {chapters.map((ch) => (
          <a key={ch.id} href={`#${ch.id}`} className="block rounded-lg px-3 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-900">
            {ch.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

export default function InteriorDesign101Client({ faqs }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 bg-[url('/og-image.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-200">
            The Complete NYC Guide
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            Interior Design <span className="text-blue-200">101</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Everything you need to know about interior design in New York City — from understanding your space and working with designers to co-op board processes and budgeting. No jargon, just practical advice for NYC property owners.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
            {/* Main Content */}
            <div className="space-y-16">

              {/* Chapter 1 */}
              <div id="nyc-basics">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">1. NYC Interior Design Basics</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    Interior design in New York City is fundamentally different from interior design anywhere else. <strong>Space is limited, building rules are strict, access is complicated, and the cost of everything is higher</strong> — but the results can be extraordinary.
                  </p>
                  <p>
                    A well-designed NYC interior is not just about aesthetics — it dramatically increases property value, improves daily quality of life, and creates a personal sanctuary in the most densely populated city in America. Whether you are working with a 500 sq ft studio in Murray Hill or a 3,000 sq ft brownstone in Park Slope, thoughtful design transforms how you live.
                  </p>
                  <p>
                    NYC interior design encompasses <strong>space planning</strong> (making every square foot count), <strong>material selection</strong> (finishes, flooring, cabinetry), <strong>furniture procurement</strong> (trade showrooms and custom pieces), <strong>lighting design</strong> (layered, functional, atmospheric), <strong>color consultation</strong>, and <strong>renovation management</strong> (permits, contractors, building logistics).
                  </p>
                  <p>
                    Key factors that make NYC design unique: limited natural light in many apartments due to neighboring buildings, strict co-op and condo board requirements for renovations, restricted freight elevator access for deliveries, pre-war building quirks (uneven floors, plaster walls, limited electrical), and four distinct seasons that affect material choices.
                  </p>
                  <Tip>Before starting any project, understand three things: (1) your building&apos;s rules and restrictions, (2) your budget including a 15-20% contingency, and (3) your realistic timeline. These three factors drive every design decision in NYC.</Tip>
                </div>
              </div>

              {/* Chapter 2 */}
              <div id="understanding-space">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">2. Understanding Your Space</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    Every great interior design project starts with deeply understanding the space you have. In NYC, this means more than just measuring rooms — it means understanding how light moves through your apartment throughout the day, how traffic flows between rooms, where storage is needed most, and how the space actually gets used.
                  </p>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-6">
                    <p className="text-sm font-bold text-slate-900">Key Space Assessment Factors</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <p><strong>Natural Light:</strong> Track how sunlight enters each room at different times of day. North-facing rooms get cool, consistent light. South-facing rooms get warm, bright light. This affects paint colors, fabric choices, and furniture placement.</p>
                      <p><strong>Traffic Flow:</strong> Map how you move through your home. Identify bottlenecks, wasted space, and areas that could serve multiple functions. In NYC, circulation paths are often the biggest space wasters.</p>
                      <p><strong>Storage Needs:</strong> Inventory everything you need to store. NYC apartments rarely have enough closets. Custom storage solutions (built-ins, under-bed drawers, wall-mounted systems) are essential.</p>
                      <p><strong>Ceiling Height:</strong> Standard NYC ceilings are 8 feet, but pre-war buildings often have 9-10 foot ceilings. Higher ceilings allow for taller furniture, dramatic lighting, and vertical storage.</p>
                    </div>
                  </div>
                  <Tip>Measure your rooms in the morning, afternoon, and evening to understand how light changes. Take photos at each time. The difference between a north-facing and south-facing room determines everything from paint sheen to fabric durability.</Tip>
                </div>
              </div>

              {/* Chapter 3 */}
              <div id="working-with-designers">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">3. Working With Designers</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    The designer-client relationship is the most important factor in a successful project. A good designer listens more than they talk, understands how you actually live (not just how you want to live), and translates your vision into a cohesive, functional design.
                  </p>
                  <p><strong>What to expect from the design process:</strong></p>
                  <div className="space-y-3">
                    {[
                      { phase: "Discovery (Weeks 1-2)", detail: "Initial consultation, space assessment, lifestyle interview, inspiration review, and project scope definition. This is where your designer learns about you." },
                      { phase: "Concept Design (Weeks 3-6)", detail: "Mood boards, preliminary layouts, color direction, and initial material selections. You will review 2-3 concept directions and choose one to develop." },
                      { phase: "Design Development (Weeks 6-12)", detail: "Detailed floor plans, furniture selections, material specifications, lighting plans, and cost estimates. Every item is specified with exact products, dimensions, and pricing." },
                      { phase: "Procurement (Weeks 12-24)", detail: "Ordering furniture, materials, and fixtures. Custom pieces take 8-16 weeks. Your designer manages all purchasing, tracking, and delivery coordination." },
                      { phase: "Installation (Weeks 20-30+)", detail: "Construction (if applicable), furniture delivery, styling, and final adjustments. Your designer is on-site to ensure everything is placed and styled perfectly." },
                    ].map((item) => (
                      <div key={item.phase} className="rounded-lg border border-slate-200 bg-white p-4">
                        <h4 className="text-sm font-bold text-slate-900">{item.phase}</h4>
                        <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                  <Tip>The best thing you can do for your designer is be honest — about your budget, your timeline, your habits, and your dealbreakers. Designers work best with clear constraints and honest feedback, not unlimited budgets and vague preferences.</Tip>
                </div>
              </div>

              {/* Chapter 4 */}
              <div id="coop-condo">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">4. Co-op & Condo Considerations</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    If you live in a co-op or condo in NYC, your building&apos;s board has significant control over what renovations you can do. Understanding these requirements before you start designing saves months of delays and thousands in wasted fees.
                  </p>
                  <div className="space-y-4">
                    {[
                      { type: "Alteration Agreement", detail: "Most co-ops and condos require a formal alteration agreement for any work beyond cosmetic changes. This document outlines the scope of work, contractor insurance requirements, working hours, and neighbor notification procedures. Budget 1-3 months for board review." },
                      { type: "Insurance Requirements", detail: "Contractors must carry specific insurance levels (typically $1-2M general liability, $1M workers comp). Your building may also require additional insured status. Verify requirements before hiring any contractor." },
                      { type: "Working Hours", detail: "Most NYC buildings restrict renovation work to Monday-Friday, 8:30 AM - 4:30 PM. No weekends, no holidays. Some buildings have additional blackout periods. This affects your project timeline significantly." },
                      { type: "Noise Restrictions", detail: "Jackhammering, drilling, and other loud work may be limited to specific hours. Some buildings require sound mitigation measures. Wet work (plumbing, tiling) may require extra notice." },
                      { type: "Material Delivery", detail: "Buildings control when and how materials are delivered. Freight elevator reservations must be scheduled in advance. Large items may require special handling fees. Plan deliveries carefully." },
                      { type: "Security Deposit", detail: "Many buildings require a renovation security deposit ($5,000-$50,000) held in escrow until work is complete and inspected. This protects common areas from damage during your renovation." },
                    ].map((item) => (
                      <div key={item.type} className="rounded-lg border border-slate-200 bg-white p-4">
                        <h4 className="text-sm font-bold text-slate-900">{item.type}</h4>
                        <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                  <Tip>Request your building&apos;s alteration agreement package before hiring a designer. Understanding the rules upfront prevents designing something your board will reject. A good NYC designer knows the common board requirements and designs within them from the start.</Tip>
                </div>
              </div>

              {/* Chapter 5 */}
              <div id="materials">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">5. Material Selection</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    Material selection is where design vision becomes reality. In NYC, material choices must balance aesthetics, durability, maintenance, cost, and practicality. The wrong material in the wrong application is an expensive mistake.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { type: "Flooring", note: "Hardwood (white oak is king in NYC), engineered wood for below-grade, porcelain tile for wet areas, natural stone for luxury. Budget: $8-$50/sq ft installed." },
                      { type: "Countertops", note: "Quartz (most popular, low maintenance), marble (luxurious but requires sealing), quartzite (durable natural stone), butcher block (warm, requires care). Budget: $50-$200/sq ft." },
                      { type: "Cabinetry", note: "Stock (affordable, limited options), semi-custom (good value, more choices), custom (unlimited options, premium price). NYC kitchens typically need custom solutions. Budget: $500-$2,000/linear ft." },
                      { type: "Tile", note: "Ceramic (budget-friendly), porcelain (durable, water-resistant), natural stone (marble, travertine), zellige (artisanal, on-trend). Budget: $5-$50/sq ft plus installation." },
                      { type: "Paint", note: "Flat/matte for ceilings and low-traffic areas, eggshell for living areas, satin for kitchens/baths, semi-gloss for trim. Benjamin Moore and Farrow & Ball are NYC designer favorites." },
                      { type: "Fixtures", note: "Plumbing fixtures (Kohler, Brizo, Waterworks), cabinet hardware (Emtek, Rejuvenation), door hardware. Budget 2-5% of total renovation cost for fixtures." },
                    ].map((item) => (
                      <div key={item.type} className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                        <h4 className="text-sm font-bold text-slate-900">{item.type}</h4>
                        <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                      </div>
                    ))}
                  </div>
                  <Tip>Always order material samples and live with them for a week before committing. Tape paint samples to the wall, lay tile samples on the floor, and drape fabric over furniture. Materials look completely different in your space than in a showroom.</Tip>
                </div>
              </div>

              {/* Chapter 6 */}
              <div id="color-theory">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">6. Color Theory for NYC Interiors</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    Color is the most powerful (and most affordable) design tool you have. In NYC apartments, where rooms are often small and light is limited, the right color choices can make spaces feel dramatically larger, brighter, and more sophisticated.
                  </p>
                  <p><strong>Key principles for NYC apartments:</strong></p>
                  <ul className="ml-6 space-y-2 list-disc">
                    <li><strong>Light colors expand space:</strong> Whites, creams, and light neutrals make small rooms feel larger. This does not mean everything must be white — warm whites and greiges are more inviting than stark white.</li>
                    <li><strong>Dark colors add drama:</strong> Deep navies, forest greens, and charcoals create intimacy and sophistication. Use them in rooms with good light or as accent walls.</li>
                    <li><strong>Warm vs. cool undertones:</strong> North-facing rooms benefit from warm tones (yellow-based whites, warm grays). South-facing rooms can handle cooler tones (blue-based whites, cool grays).</li>
                    <li><strong>Flow between rooms:</strong> In open-plan apartments, use a cohesive palette that flows room to room. Vary the intensity (lighter in main areas, deeper in bedrooms) rather than changing the color family.</li>
                    <li><strong>The 60-30-10 rule:</strong> 60% dominant color (walls, large furniture), 30% secondary color (upholstery, rugs), 10% accent color (pillows, art, accessories). This creates balance without monotony.</li>
                  </ul>
                  <Tip>Test paint colors with large samples (at least 12x12 inches) on multiple walls in the room. Paint looks different on every wall because of how light hits it. Check your samples in morning light, afternoon light, and evening lamplight before deciding.</Tip>
                </div>
              </div>

              {/* Chapter 7 */}
              <div id="lighting">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">7. Lighting Fundamentals</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    Lighting is the most underrated element of interior design. Good lighting makes everything in a room look better — your furniture, your art, your finishes, and even you. Bad lighting makes even beautiful spaces feel flat, harsh, or depressing.
                  </p>
                  <p><strong>The three layers of lighting:</strong></p>
                  <ul className="ml-6 space-y-2 list-disc">
                    <li><strong>Ambient (general):</strong> Overhead fixtures, recessed lights, flush mounts. Provides overall illumination. Use dimmers on everything — non-negotiable in good design.</li>
                    <li><strong>Task:</strong> Under-cabinet lights, desk lamps, reading lights. Provides focused light where you need it for specific activities.</li>
                    <li><strong>Accent:</strong> Picture lights, uplights, decorative sconces. Highlights art, architecture, and creates atmosphere. This is what separates designed spaces from regular rooms.</li>
                  </ul>
                  <p>
                    In NYC apartments, where ceiling heights are often limited and many units lack overhead light fixtures in living rooms (a common pre-war issue), creative lighting solutions are essential. Table lamps, floor lamps, and plug-in wall sconces can transform a room without any electrical work.
                  </p>
                  <Tip>Use 2700K (warm white) bulbs throughout your home for a cohesive, warm glow. Avoid mixing color temperatures — 3000K in the kitchen and 2700K in the living room creates a jarring difference when rooms are visible to each other. Dimmers are the single best investment in any lighting plan.</Tip>
                </div>
              </div>

              {/* Chapter 8 */}
              <div id="budgeting">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">8. Budgeting Your Project</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    Budget is the most important conversation in any design project. Being honest about your budget from the start allows your designer to make smart allocation decisions and prevents the heartbreak of falling in love with a design you cannot afford.
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead><tr className="bg-slate-50">
                        <th className="px-5 py-3.5 font-semibold text-slate-900">Project Type</th>
                        <th className="px-5 py-3.5 font-semibold text-slate-900">Budget Range</th>
                        <th className="px-5 py-3.5 font-semibold text-slate-900">What It Includes</th>
                      </tr></thead>
                      <tbody>
                        {[
                          { type: "Room Refresh", budget: "$5K-$25K", includes: "Paint, new furniture, accessories, lighting updates. No construction." },
                          { type: "Kitchen Renovation", budget: "$25K-$150K+", includes: "Cabinetry, countertops, appliances, tile, plumbing, electrical, lighting." },
                          { type: "Bathroom Renovation", budget: "$15K-$75K+", includes: "Tile, fixtures, vanity, shower/tub, plumbing, lighting, ventilation." },
                          { type: "Full Apartment Design", budget: "$50K-$250K", includes: "All rooms designed and furnished. Custom pieces, window treatments, art." },
                          { type: "Gut Renovation (2BR)", budget: "$200K-$500K+", includes: "Complete demolition and rebuild. New layout, plumbing, electrical, finishes, furniture." },
                        ].map((row, i) => (
                          <tr key={row.type} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                            <td className="px-5 py-3 font-medium text-slate-900">{row.type}</td>
                            <td className="px-5 py-3 text-blue-700 font-semibold">{row.budget}</td>
                            <td className="px-5 py-3 text-slate-600">{row.includes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Tip>Always include a 15-20% contingency in your budget. NYC renovations consistently uncover surprises behind walls — old plumbing, outdated wiring, asbestos, structural issues. Without contingency, these discoveries blow your budget and stall your project.</Tip>
                </div>
              </div>

              {/* Chapter 9 */}
              <div id="common-mistakes">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">9. Common Interior Design Mistakes</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>After designing hundreds of NYC interiors, here are the mistakes we see most often:</p>
                  <div className="space-y-3">
                    {[
                      { mistake: "Buying furniture before measuring", detail: "That beautiful sofa you found online? It will not fit through your apartment door. Measure doorways, hallways, elevator openings, and stairwell turns before purchasing anything. NYC delivery challenges are real." },
                      { mistake: "Ignoring scale and proportion", detail: "Oversized furniture in a small room makes it feel cramped. Undersized furniture makes it feel like a waiting room. Every piece should be proportional to the room and to other pieces." },
                      { mistake: "Treating each room independently", detail: "Your apartment should feel like a cohesive home, not a series of unrelated rooms. Carry common colors, materials, or design elements throughout." },
                      { mistake: "Skipping the lighting plan", detail: "A single overhead fixture is not a lighting plan. Layer ambient, task, and accent lighting. Add dimmers to everything. Bad lighting ruins even the most beautiful design." },
                      { mistake: "Underestimating storage needs", detail: "NYC apartments have notoriously little storage. Custom closets, built-in shelving, and multi-functional furniture should be part of every design plan." },
                      { mistake: "Not accounting for building logistics", detail: "Material delivery, contractor access, noise restrictions, and board approvals all take time. Building logistics add 20-40% to project timelines in NYC." },
                    ].map((item) => (
                      <div key={item.mistake} className="rounded-lg border border-red-200 bg-red-50/50 p-4">
                        <h4 className="text-sm font-bold text-red-900">{item.mistake}</h4>
                        <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chapter 10 */}
              <div id="hiring">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">10. Hiring an Interior Designer</h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
                  <p><strong>What to look for when hiring a designer in NYC:</strong></p>
                  <ul className="ml-6 space-y-2 list-disc">
                    <li><strong>Portfolio alignment:</strong> Their previous work should resonate with your style. If you love modern minimalism, do not hire a designer whose portfolio is all traditional.</li>
                    <li><strong>NYC experience:</strong> NYC design requires specific knowledge of building codes, co-op processes, contractor networks, and delivery logistics. Experience matters here more than in any other market.</li>
                    <li><strong>Clear fee structure:</strong> Understand exactly how they charge — hourly, flat fee, percentage, or cost-plus. Get it in writing before work begins.</li>
                    <li><strong>Project management capability:</strong> A designer who can manage contractors, vendors, and timelines saves you enormous stress and often money.</li>
                    <li><strong>Communication style:</strong> You will work closely with this person for months. Make sure your communication styles are compatible and they are responsive.</li>
                    <li><strong>References:</strong> Talk to at least 2-3 previous clients. Ask about budget adherence, timeline management, and how problems were handled.</li>
                  </ul>
                  <div className="mt-6 rounded-2xl bg-gray-800 p-6 text-center">
                    <h3 className="text-xl font-bold text-white">Ready to Start Your Project?</h3>
                    <p className="mt-2 text-gray-300">Book a free consultation and let&apos;s discuss your vision.</p>
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                      <a href={SMS_HREF} className="inline-block rounded-lg bg-white px-6 py-3 text-sm font-bold text-blue-800 hover:bg-blue-50 transition-colors">
                        Text Us
                      </a>
                      <a href={PHONE_HREF} className="inline-block rounded-lg border-2 border-white/30 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors">
                        Call {PHONE}
                      </a>
                      <Link href="/get-a-free-consultation" className="inline-block rounded-lg border-2 border-white/30 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors">
                        Free Consultation
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chapter 11 - FAQ */}
              <div id="faq">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">11. Frequently Asked Questions</h2>
                <div className="mt-6 space-y-3">
                  {faqs.map((faq, i) => (
                    <div key={i} className="rounded-xl border border-blue-200/60 bg-white transition-colors hover:border-blue-300">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="flex w-full items-center justify-between px-6 py-5 text-left"
                      >
                        <span className="pr-4 text-base font-semibold text-slate-800">{faq.question}</span>
                        <svg
                          className={`h-5 w-5 shrink-0 text-blue-500 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openFaq === i && (
                        <div className="px-6 pb-5">
                          <p className="text-sm leading-relaxed text-slate-500">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-28 space-y-6">
                <ChapterNav />
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Need Help?</p>
                  <a href={SMS_HREF} className="mt-3 block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors">
                    Text Us
                  </a>
                  <a href={PHONE_HREF} className="mt-2 block text-sm font-bold text-blue-800 hover:text-blue-900">
                    Call {PHONE}
                  </a>
                  <Link href="/get-a-free-consultation" className="mt-2 block text-sm font-semibold text-blue-700 hover:text-blue-800">
                    Free Consultation
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gray-800 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to Transform Your Space?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Now that you know the basics, let our team help you create the interior you have been dreaming of.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-blue-800 shadow-lg transition-colors hover:bg-blue-50">
              Text Us
            </a>
            <a href={PHONE_HREF} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60">
              Call {PHONE}
            </a>
            <Link href="/get-a-free-consultation" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60">
              Free Consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
