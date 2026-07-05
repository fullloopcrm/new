import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, SITE_URL, EMAIL, ADDRESS } from "@/app/site/fla-dumpster-rentals/_lib/seo";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import CTABanner from "@/app/site/fla-dumpster-rentals/_components/CTABanner";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

export const metadata: Metadata = {
  title: "How It Works | Florida Dumpster Rentals",
  description:
    "Renting a dumpster in Florida is simple: text or call for a quote, we deliver, you fill it, we pick it up. Same-day delivery available. Call 954-710-2332.",
  alternates: { canonical: `${SITE_URL}/how-it-works` },
};

const phonePlain = PHONE.replace(/-/g, "");

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-stone-950 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
            Simple Process
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            How Dumpster Rental Works
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-stone-400">
            Renting a dumpster in Florida should be as simple as ordering a
            pizza: tell us what you need, we give you a price, we deliver it,
            and we pick it up when you are done. That is exactly how we operate.
            No complicated forms, no long wait times, no voicemail runaround.
            Here is the entire process from start to finish.
          </p>
          <CTAGroup variant="hero" />
        </div>
      </section>

      {/* Step 1 */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-600 text-3xl font-bold text-white">
                1
              </div>
            </div>
            <div className="lg:col-span-4">
              <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
                Contact Us for a Quote
              </h2>
              <p className="mt-3 text-lg text-zinc-600">
                Text or call us at {PHONE} with your project details. We will
                recommend a dumpster size and give you an instant, all-inclusive
                quote. The entire ordering process takes 2-3 minutes.
              </p>
              <div className="mt-6 space-y-4 text-zinc-600 leading-7">
                <p>
                  When you contact us, here is what we need to know: what type of
                  project you are doing (renovation, cleanout, construction,
                  landscaping, etc.), your delivery address, and your preferred
                  delivery date. That is it. From those three pieces of
                  information, we can recommend the right dumpster size and give
                  you a flat-rate price that includes everything.
                </p>
                <p>
                  If you are not sure what size you need, describe your project and
                  we will recommend the right container. Better yet, text us a
                  photo of the space you are cleaning out or the materials you are
                  disposing of. A picture lets us dial in the perfect size faster
                  than a 10-minute phone conversation. We have sized thousands of
                  dumpster orders from photos alone.
                </p>
                <p>
                  Your quote will include the dumpster size, the delivery date, the
                  flat-rate price (which covers delivery, a 7-day rental period,
                  pickup, and disposal up to the weight limit), and any relevant
                  notes about your specific delivery situation. There are no hidden
                  fees. The price we quote is the price on your invoice.
                </p>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  Tell us your project type (renovation, cleanout, construction, etc.)
                </li>
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  Share your delivery address and preferred delivery date
                </li>
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  We recommend the right dumpster size (10, 20, or 30 yard)
                </li>
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  Get a transparent, all-inclusive price with no hidden fees
                </li>
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  Confirm your order via text, phone, or our online booking form
                </li>
              </ul>
              <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm text-orange-800">
                  <span className="font-semibold">Pro Tip:</span> Not sure what
                  size you need? Text us a photo of what you are removing and we
                  will recommend the right container. A picture is worth a
                  thousand cubic yards.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-600 text-3xl font-bold text-white">
                2
              </div>
            </div>
            <div className="lg:col-span-4">
              <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
                We Deliver the Dumpster
              </h2>
              <p className="mt-3 text-lg text-zinc-600">
                We drop off the dumpster at your location on your scheduled
                date. Same-day delivery is available when you order before noon.
                Next-day delivery is guaranteed for all orders placed by 5 PM.
              </p>
              <div className="mt-6 space-y-4 text-zinc-600 leading-7">
                <p>
                  On delivery day, our driver arrives during your scheduled
                  window with the dumpster loaded on a specialized roll-off
                  truck. The driver backs the truck into your driveway or
                  placement area and rolls the container off the back of the
                  truck onto the ground. The entire delivery process takes about
                  10 minutes from arrival to departure.
                </p>
                <p>
                  You do not need to be home for delivery. As long as the
                  placement area is clear of vehicles, trash cans, bikes, and
                  other obstacles, our driver can deliver without you being
                  present. We send a photo confirmation after placement so you
                  can verify the dumpster is exactly where you want it, even if
                  you are at work or running errands during delivery.
                </p>
                <p>
                  Our drivers place dumpsters on driveways, concrete pads,
                  asphalt parking lots, gravel surfaces, and even grass or dirt
                  if necessary. If you are concerned about driveway damage, we
                  can place plywood boards under the wheels to distribute the
                  weight. Just mention it when you order and our driver will come
                  prepared with boards. For the record, damage from properly
                  placed dumpsters is extremely rare — but we understand the
                  concern and are happy to take the extra precaution.
                </p>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  Driver arrives during your scheduled delivery window
                </li>
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  Dumpster placed exactly where you specify
                </li>
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  You do not need to be home — just clear the area
                </li>
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  Photo confirmation sent after delivery
                </li>
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  Driveway protection boards available on request
                </li>
              </ul>
              <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm text-orange-800">
                  <span className="font-semibold">Pro Tip:</span> Have your
                  placement spot clear before delivery. The truck needs about 60
                  feet of straight-line clearance and 23 feet of overhead
                  clearance. Move cars, trim low branches, and check for power
                  lines.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 3 */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-600 text-3xl font-bold text-white">
                3
              </div>
            </div>
            <div className="lg:col-span-4">
              <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
                You Load at Your Own Pace
              </h2>
              <p className="mt-3 text-lg text-zinc-600">
                Your dumpster is yours for 7 days. Load it on your schedule —
                whether that is one intense weekend or a little each evening
                after work. No rush, no pressure.
              </p>
              <div className="mt-6 space-y-4 text-zinc-600 leading-7">
                <p>
                  Once the dumpster is in your driveway, the clock starts on your
                  7-day rental period. But there is no pressure to fill it
                  quickly. Some customers load their dumpster in a single
                  afternoon during a demolition blitz. Others take the full week,
                  tackling one room or one area each day. The dumpster is there
                  when you are ready to use it and stays out of your way when
                  you are not.
                </p>
                <p>
                  For best results, load the dumpster from back to front,
                  placing heavy items on the bottom and lighter items on top.
                  Break down large items before loading — disassemble furniture,
                  flatten cardboard boxes, cut long boards into manageable
                  lengths. Use the rear swing door for walk-in loading of heavy
                  items like concrete, tile, and appliances. The door makes it
                  easy to roll a dolly or wheelbarrow directly into the
                  dumpster.
                </p>
                <p>
                  Keep the load level and below the top edge of the dumpster
                  walls. Nothing can extend above the rim — this is a DOT
                  safety requirement for transport. An overfilled dumpster
                  cannot be legally hauled on public roads, which means our
                  driver cannot pick it up until the excess is removed. Load
                  level with the top and you will have no issues.
                </p>
                <p>
                  If you finish loading before day 7, great — call or text us
                  and we will schedule pickup early at no extra charge. If you
                  need more than 7 days, just let us know before the period
                  ends. Extensions are available at $15/day for 10 yard,
                  $20/day for 20 yard, and $25/day for 30 yard dumpsters.
                </p>
              </div>
              <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm text-orange-800">
                  <span className="font-semibold">Pro Tip:</span> Cover your
                  dumpster with a tarp between loading sessions, especially
                  during Florida&apos;s rainy season. An afternoon thunderstorm can
                  add hundreds of pounds of water weight to absorbent materials
                  like drywall and cardboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 4 */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-600 text-3xl font-bold text-white">
                4
              </div>
            </div>
            <div className="lg:col-span-4">
              <h2 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
                We Pick Up and Haul Away
              </h2>
              <p className="mt-3 text-lg text-zinc-600">
                When you are done loading, text or call us. We schedule pickup
                within 24 hours and haul everything to a licensed disposal
                facility. You get a confirmation when pickup is complete.
              </p>
              <div className="mt-6 space-y-4 text-zinc-600 leading-7">
                <p>
                  Pickup works the same way as delivery but in reverse. Our
                  driver arrives, hooks the full dumpster onto the truck, and
                  hauls it to the nearest licensed disposal facility. The entire
                  pickup process takes about 10-15 minutes. Your driveway is
                  clear, your debris is gone, and your project is one step
                  closer to done.
                </p>
                <p>
                  At the disposal facility, the dumpster is weighed on a
                  certified scale. If the load is within your included weight
                  limit (2 tons for 10 yard, 3 tons for 20 yard, 4 tons for 30
                  yard), there is no additional charge. If the load exceeds the
                  limit, we will communicate the overage amount before billing.
                  Overage fees are $40-$60 per additional ton depending on the
                  dumpster size and disposal facility.
                </p>
                <p>
                  We send a pickup confirmation once the dumpster has been
                  removed from your property. If you need another dumpster for
                  the next phase of your project, we can schedule delivery of a
                  fresh container — often same-day. Many contractors run
                  continuous rotation: when one dumpster fills up, we swap it
                  for an empty one so the work never stops.
                </p>
              </div>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  Text or call when finished — pickup scheduled within 24 hours
                </li>
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  Load weighed at certified facility
                </li>
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  Recyclable materials diverted from landfill when possible
                </li>
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  Pickup confirmation sent when complete
                </li>
                <li className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 text-orange-600">&#10003;</span>
                  Need another dumpster? Same-day swap available
                </li>
              </ul>
              <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm text-orange-800">
                  <span className="font-semibold">Pro Tip:</span> Do not
                  overfill the dumpster above the rim. If debris extends above
                  the top edge, our driver cannot legally haul it. Keep the load
                  level and you will have zero issues with pickup.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mid CTA */}
      <CTABanner
        title="Ready to Get Started?"
        subtitle="Text or call us right now for an instant quote. We can often deliver same-day."
      />

      {/* What to Expect */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">What to Expect Throughout the Process</h2>
          <p className="mt-3 text-lg text-stone-500">
            Here is what a typical dumpster rental experience looks like from your first text to final pickup.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Transparent Pricing",
                desc: "Your quote includes delivery, pickup, disposal, and the rental period. No surprise fees, no hidden charges. The number we quote is the number on your invoice.",
              },
              {
                title: "Flexible Scheduling",
                desc: "Same-day and next-day delivery available across most of Florida. Need a specific time window? Just ask and we will accommodate when possible.",
              },
              {
                title: "7-Day Rental Period",
                desc: "Every rental includes 7 full days. Finish early and we pick up sooner at no charge. Need more time? Daily extensions are available at $15-$25/day.",
              },
              {
                title: "Clean Delivery",
                desc: "Our haulers place dumpsters carefully on your property. Plywood boards under the wheels are available on request to protect driveways and surfaces.",
              },
              {
                title: "Responsive Communication",
                desc: "Text, call, or email. We respond within minutes and keep you updated on delivery and pickup status with photo confirmations at each step.",
              },
              {
                title: "Responsible Disposal",
                desc: "All debris is taken to licensed disposal facilities that comply with Florida DEP regulations. Recyclable materials are diverted from landfills when possible.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-zinc-200 bg-white p-6">
                <h3 className="font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Placement Tips */}
      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-zinc-900">Dumpster Placement Tips</h2>
          <p className="mt-3 text-lg text-stone-500">
            Getting the placement right makes your entire project smoother.
            Here are the key things to consider before your dumpster arrives.
          </p>

          <div className="mt-8 space-y-6">
            {[
              {
                title: "Choose a Flat, Hard Surface",
                desc: "Driveways, concrete pads, and asphalt parking lots are ideal placement surfaces. The dumpster will sit level and load evenly. Soft ground like grass or dirt works in a pinch, but the dumpster may settle or leave indentations under the weight of a full load. If you must place on grass, consider putting plywood sheets down first.",
              },
              {
                title: "Clear the Placement Area",
                desc: "Move cars, bicycles, trash cans, potted plants, and anything else out of the delivery area. The roll-off truck needs approximately 60 feet of straight-line clearance to back in and roll the container off. If your driveway is shorter than the truck approach, let us know and our driver will plan an alternate approach.",
              },
              {
                title: "Check Overhead Clearance",
                desc: "The delivery truck raises the bed to roll the dumpster off, requiring about 23 feet of vertical clearance. Check for power lines, tree branches, basketball hoops, carport roofs, and any other overhead obstructions along the truck's path. Low branches can be trimmed before delivery day to avoid issues.",
              },
              {
                title: "Position Close to Your Work Area",
                desc: "The closer the dumpster is to where the debris is being generated, the less time you spend hauling materials. Renovating the kitchen? Put the dumpster near the back door or closest exterior door. Cleaning out the garage? Position the dumpster at the end of the driveway near the garage opening. For roofing, place it directly adjacent to the house under the section being torn off.",
              },
              {
                title: "Consider Street Placement If Needed",
                desc: "If your driveway cannot accommodate the dumpster or if you need the driveway clear for contractor vehicles, street placement is an option. Most Florida municipalities require a permit for dumpsters placed on public streets, sidewalks, or right-of-way. Permits typically cost $25-$150 and take 1-3 business days to process. We know the rules for your area and can guide you through it.",
              },
              {
                title: "Protect Your Driveway Surface",
                desc: "Standard dumpster placement on a concrete or asphalt driveway in good condition rarely causes damage. If you have a newer driveway, decorative pavers, or a thin asphalt surface, ask us to place plywood boards under the dumpster wheels. The boards distribute the weight over a larger area and prevent any indentation.",
              },
            ].map((item) => (
              <div key={item.title} className="border-b border-zinc-100 pb-6">
                <h3 className="text-lg font-semibold text-zinc-900">{item.title}</h3>
                <p className="mt-2 text-zinc-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Loading Best Practices */}
      <section className="bg-stone-950 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold">
            Loading Best Practices
          </h2>
          <p className="mt-3 text-stone-400">
            How you load your dumpster affects how much fits, whether you stay
            within the weight limit, and whether pickup goes smoothly.
          </p>
          <div className="mt-8 space-y-4 leading-7 text-stone-300">
            <p>
              <strong className="text-white">Load heavy items first.</strong>{" "}
              Concrete, tile, brick, and heavy appliances go on the bottom of
              the dumpster. This keeps the center of gravity low and distributes
              weight evenly across the container. Lighter items — furniture,
              drywall, lumber, cardboard — go on top.
            </p>
            <p>
              <strong className="text-white">Break down large items.</strong>{" "}
              Disassemble furniture (remove table legs, take apart bed frames).
              Flatten cardboard boxes. Cut long boards to fit flat rather than
              sticking up at angles. Every item that lies flat instead of
              sticking up creates more usable space for the next item.
            </p>
            <p>
              <strong className="text-white">Use the rear swing door.</strong>{" "}
              All of our roll-off dumpsters have a rear door that swings open
              for walk-in loading. Use it. Rolling a wheelbarrow of concrete
              chunks through the door is dramatically easier than lifting them
              over the 4-6 foot sides. The door is also great for loading
              heavy appliances with a dolly.
            </p>
            <p>
              <strong className="text-white">Fill from back to front.</strong>{" "}
              Start loading at the back of the dumpster and work toward the
              front. This gives you a clear loading path and prevents you from
              having to climb over debris to reach empty space. It also
              distributes weight more evenly for safe transport.
            </p>
            <p>
              <strong className="text-white">Stay below the fill line.</strong>{" "}
              Debris cannot extend above the top edge of the dumpster walls.
              This is not our rule — it is a DOT safety regulation. Overfilled
              containers cannot be legally transported on public roads. If your
              dumpster is overfilled, our driver will need to level or remove
              excess material before pickup.
            </p>
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "Text Us a Photo of Your Mess",
            body: "Seriously — snap a picture of whatever you're getting rid of and text it to us. We can usually recommend the right dumpster size and give you a quote faster from a photo than a 10-minute phone call. A picture is worth a thousand cubic yards.",
          },
          {
            title: "Book Early for Hurricane Season",
            body: "June through November is hurricane season in Florida, and after a big storm, dumpster demand spikes 300-500%. If you see a storm coming, book your dumpster before it hits. Post-storm availability disappears fast.",
          },
          {
            title: "Clear a Path for the Truck",
            body: "The delivery truck needs about 60 feet of straight clearance to roll the dumpster off. Move cars out of the driveway, trim any low-hanging branches, and make sure there are no obstacles overhead. A little prep saves a lot of hassle on delivery day.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </>
  );
}
