import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema, localBusinessSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import CTABlock from '@/components/marketing/CTABlock'

const categories = [
  { id: 'kitchen', name: 'Kitchen', icon: '🍳' },
  { id: 'bathroom', name: 'Bathroom', icon: '🚿' },
  { id: 'bedroom', name: 'Bedroom', icon: '🛏️' },
  { id: 'living', name: 'Living Room', icon: '🛋️' },
  { id: 'floors', name: 'Floors & Surfaces', icon: '✨' },
  { id: 'laundry', name: 'Laundry', icon: '👕' },
  { id: 'nyc', name: 'NYC-Specific', icon: '🏙️' },
  { id: 'green', name: 'Eco-Friendly', icon: '🌿' },
  { id: 'pets', name: 'Pet Owners', icon: '🐾' },
  { id: 'habits', name: 'Daily Habits', icon: '⏰' },
]

const tips: Record<string, { title: string; tip: string }[]> = {
  kitchen: [
    { title: 'Microwave steam clean', tip: 'Heat a bowl of water with lemon slices for 3 minutes. The steam loosens caked-on food — just wipe it out.' },
    { title: 'Clean the garbage disposal', tip: 'Drop in ice cubes and kosher salt, run the disposal for 30 seconds. Follow with lemon halves to deodorize.' },
    { title: 'Degrease cabinets monthly', tip: 'Mix dish soap with warm water and wipe cabinet faces. Grease from cooking builds up invisibly and attracts dust.' },
    { title: 'Clean the dishwasher itself', tip: 'Run an empty cycle with a cup of white vinegar on the top rack. Do this monthly — dishwashers get surprisingly dirty.' },
    { title: 'Baking soda for the sink', tip: 'Sprinkle baking soda in a stainless steel sink, scrub with a damp sponge, rinse. Better than any commercial sink cleaner.' },
    { title: 'Clean behind the stove', tip: 'Pull the stove out every 3 months. What\'s back there will horrify you, and it attracts pests.' },
    { title: 'Wipe the fridge coils', tip: 'Vacuum or brush the coils on the back or bottom of your fridge twice a year. It runs more efficiently and lasts longer.' },
    { title: 'Cutting board refresh', tip: 'Rub half a lemon with coarse salt over wooden cutting boards. Deodorizes, disinfects, and conditions the wood.' },
    { title: 'Stovetop grate soak', tip: 'Soak gas burner grates in hot soapy water for 20 minutes. Scrub with a brush — don\'t put them in the dishwasher.' },
    { title: 'Prevent grease splatter', tip: 'Keep a splatter screen next to the stove. Using one while cooking cuts your stovetop cleaning time by 80%.' },
  ],
  bathroom: [
    { title: 'Squeegee after every shower', tip: 'Takes 30 seconds and prevents 90% of soap scum and hard water buildup. Best single habit for bathroom cleanliness.' },
    { title: 'Vinegar bag for the showerhead', tip: 'Fill a plastic bag with white vinegar, tie it around your showerhead, leave overnight. Dissolves mineral buildup completely.' },
    { title: 'Toilet brush drip-dry hack', tip: 'After scrubbing, rest the brush handle between the seat and bowl so it drip-dries over the toilet, not on your floor.' },
    { title: 'Grout whitening paste', tip: 'Mix baking soda with hydrogen peroxide to form a paste. Apply to grout lines, wait 10 minutes, scrub. Dramatic results.' },
    { title: 'Clean the toilet tank', tip: 'Lift the lid, pour in a cup of vinegar, let it sit for an hour. It prevents mineral buildup and that pink ring in the bowl.' },
    { title: 'Mirror streak-free method', tip: 'Spray vinegar-water, wipe with newspaper or a microfiber cloth in an S-pattern. Never circular — that causes streaks.' },
    { title: 'Bath mat maintenance', tip: 'Wash bath mats every 1–2 weeks in hot water. They harbor more bacteria than your toilet seat. Replace every 6 months.' },
    { title: 'Prevent mold on caulking', tip: 'After recaulking, spray the caulk line weekly with vinegar. Mold can\'t establish itself on surfaces regularly treated with acid.' },
    { title: 'Drain maintenance', tip: 'Pour a half cup of baking soda down the drain monthly, follow with vinegar. Let it fizz, then flush with boiling water.' },
    { title: 'Ventilation is everything', tip: 'Run the bathroom fan for 30 minutes after every shower. If it doesn\'t work, tell your landlord — it\'s required by code in NYC.' },
  ],
  bedroom: [
    { title: 'Wash sheets weekly', tip: 'Hot water, every week. You shed 1.5 grams of skin per day — that\'s dust mite food. Weekly washing is the minimum.' },
    { title: 'Flip your mattress', tip: 'Rotate 180° every 3 months, flip entirely every 6 months (if it\'s double-sided). Prevents sagging and extends mattress life.' },
    { title: 'Vacuum the mattress', tip: 'Use the upholstery attachment quarterly. Removes dust mites, dead skin, and allergens you can\'t see.' },
    { title: 'Dust bedroom surfaces before vacuuming', tip: 'Dust falls. If you vacuum first, you\'re vacuuming twice. Dust nightstands and dressers, then vacuum the floor.' },
    { title: 'Pillow refresh', tip: 'Throw pillows in the dryer with tennis balls for 20 minutes on high heat. Fluffs them up and kills dust mites.' },
    { title: 'Under-bed cleaning', tip: 'Vacuum or Swiffer under the bed monthly. Dust bunnies there circulate every time air moves and affect your sleep quality.' },
    { title: 'Declutter the nightstand', tip: 'Keep only what you actually use before bed. Less stuff = less dust = easier to wipe down = better sleep environment.' },
    { title: 'Curtain cleaning', tip: 'Vacuum curtains with the upholstery attachment monthly. Wash or dry-clean them twice a year — they trap more dust than you realize.' },
    { title: 'Duvet care', tip: 'Use a duvet cover and wash it biweekly. The duvet itself only needs washing 2–3 times a year.' },
    { title: 'Closet floor sweep', tip: 'When you vacuum the bedroom, don\'t skip the closet floor. Dust and lint accumulate in there and transfer to your clothes.' },
  ],
  living: [
    { title: 'Vacuum couch cushions weekly', tip: 'Remove cushions, vacuum the crevices. You\'ll find crumbs, coins, hair ties, and enough pet hair to make a second pet.' },
    { title: 'Dust electronics with dryer sheets', tip: 'Dryer sheets reduce static, which means electronics stay dust-free longer after cleaning. Wipe TVs, monitors, and speakers.' },
    { title: 'Clean remotes and controllers', tip: 'Wipe with a disinfectant wipe weekly. Remote controls are one of the dirtiest objects in any home.' },
    { title: 'Couch fabric refresh', tip: 'Sprinkle baking soda on upholstered furniture, let it sit for 15 minutes, vacuum thoroughly. Removes odors naturally.' },
    { title: 'Baseboards matter', tip: 'Run a damp microfiber cloth along baseboards monthly. They collect dust that gradually makes the whole room look dingy.' },
    { title: 'Light fixture dusting', tip: 'Ceiling lights and sconces collect dead bugs and dust. Clean them quarterly and your room will literally look brighter.' },
    { title: 'Wipe light switches', tip: 'Every light switch and door handle gets touched dozens of times daily. Wipe them with disinfectant weekly.' },
    { title: 'Move furniture occasionally', tip: 'Slide the couch or bookshelf aside and vacuum behind it every 2–3 months. The dust back there is circulating through your air.' },
    { title: 'Window sill maintenance', tip: 'Wipe sills weekly in NYC. City dust and pollution settle there first, and it tracks into the room when you open the window.' },
    { title: 'Throw pillow and blanket wash', tip: 'Wash throw pillow covers and throw blankets monthly. They absorb body oils, pet dander, and food residue.' },
  ],
  floors: [
    { title: 'Sweep before mopping (always)', tip: 'Mopping over grit scratches floors. Always sweep or vacuum first, then mop. This applies to every floor type.' },
    { title: 'Hardwood: barely damp', tip: 'Your mop should be wrung out until it\'s barely damp. Standing water damages hardwood. Bona cleaner is the professional standard.' },
    { title: 'Never use vinegar on hardwood', tip: 'Vinegar is acidic and eats through polyurethane finish over time. It\'s great for many things — hardwood floors is not one of them.' },
    { title: 'Tile grout sealing', tip: 'After deep cleaning grout, seal it with a grout sealer. It prevents stains and makes future cleaning dramatically easier.' },
    { title: 'Area rug vacuuming technique', tip: 'Vacuum rugs from multiple directions — fibers trap dirt in all orientations. One pass doesn\'t cut it.' },
    { title: 'Felt pads on everything', tip: 'Put felt pads on every piece of furniture that touches hardwood. Check them every 6 months — they wear out and trap grit.' },
    { title: 'Swiffer vs. real mop', tip: 'For studios and small apartments, a Swiffer works great. For larger spaces, a proper flat mop with washable microfiber pads is more effective and cheaper long-term.' },
    { title: 'Entry mat strategy', tip: 'A good doormat inside and outside your front door catches 80% of tracked-in dirt. It\'s the cheapest floor-protection investment.' },
    { title: 'Spot clean spills immediately', tip: 'On any floor type, blot spills immediately. Don\'t rub — that spreads the stain. Blot from the outside in.' },
    { title: 'Steam mop rules', tip: 'Only use steam mops on sealed tile and vinyl. Never on hardwood, laminate, or unsealed stone. The heat damages these surfaces.' },
  ],
  laundry: [
    { title: 'Clean your washing machine monthly', tip: 'Run an empty hot cycle with a cup of white vinegar. Mold and mildew grow in the drum and gasket — especially in front-loaders.' },
    { title: 'Don\'t overload the dryer', tip: 'Clothes need room to tumble. Overloading means longer dry times, more wrinkles, and higher energy bills.' },
    { title: 'Clean the lint trap every single load', tip: 'This isn\'t just about efficiency — lint buildup is a fire hazard. Clean it before every load, no exceptions.' },
    { title: 'Cold water for most loads', tip: 'Cold water cleans just as well for most clothes and prevents shrinking and color fading. Save hot water for sheets and towels.' },
    { title: 'Skip fabric softener on towels', tip: 'Fabric softener coats towel fibers and reduces absorbency over time. Use vinegar in the rinse cycle instead — same softness, better absorption.' },
    { title: 'Treat stains immediately', tip: 'The longer a stain sits, the harder it sets. Blot (don\'t rub), apply stain remover, and wash as soon as possible.' },
    { title: 'Zip up zippers before washing', tip: 'Open zippers snag and damage other clothes in the wash. Close them all before throwing clothes in.' },
    { title: 'Wash darks inside out', tip: 'Reduces friction on the visible side of the fabric, which prevents fading. Dark jeans especially benefit from this.' },
    { title: 'Dry clean only? Maybe not', tip: 'Many "dry clean only" items can be hand washed in cold water with mild detergent. Check the fabric — silk and wool usually can handle it.' },
    { title: 'Shared laundry room etiquette', tip: 'In NYC buildings: set a timer, remove clothes promptly, wipe the lint trap, and don\'t leave detergent residue on machines. Your neighbors will appreciate it.' },
  ],
  nyc: [
    { title: 'Cockroach prevention is cleaning', tip: 'In NYC, cockroaches are a fact of life — but a clean kitchen denies them food. Wipe counters nightly, seal food in containers, take trash out daily.' },
    { title: 'Window AC filter cleaning', tip: 'Clean or replace your window AC filter every 2 weeks during summer. A dirty filter circulates dust and allergens and kills efficiency.' },
    { title: 'Radiator cleaning before heating season', tip: 'Clean between the radiator fins in September. That burnt-dust smell when the heat first kicks on? That\'s months of buildup cooking.' },
    { title: 'City dust requires more frequent dusting', tip: 'NYC apartments get dustier than suburban homes due to air pollution and constant construction. Dust weekly minimum, not monthly.' },
    { title: 'Check under the sink for pests', tip: 'Gaps around pipes under kitchen and bathroom sinks are pest highways. Steel wool + caulk these gaps. Clean under sinks monthly.' },
    { title: 'De-icing salt on floors', tip: 'Winter salt ruins floors. Put a boot tray by the door and wipe shoes immediately. Mop the entryway weekly in winter with warm water.' },
    { title: 'Manage building smells', tip: 'Cooking smells from neighbors seep through gaps around pipes and outlets. Seal these with caulk and run an air purifier.' },
    { title: 'Pre-war window track cleaning', tip: 'Old double-hung windows have deep tracks that collect years of grime. Vacuum, then scrub with a toothbrush and soapy water.' },
    { title: 'Fire escape access', tip: 'Keep the area near fire escape windows clean and clear. It\'s a safety requirement and your landlord can fine you for obstructions.' },
    { title: 'Building laundry lint hazard', tip: 'If your building has shared dryers, check the vent ducts. Clogged dryer vents are one of the top causes of apartment fires in NYC.' },
  ],
  green: [
    { title: 'Vinegar is your best friend', tip: 'White vinegar cuts grease, dissolves mineral deposits, deodorizes, and disinfects. It replaces 5+ commercial products.' },
    { title: 'Baking soda for everything else', tip: 'Baking soda scrubs without scratching, deodorizes, and mixes with vinegar for drain cleaning. Keep a big box in the kitchen.' },
    { title: 'Microfiber cloths vs. paper towels', tip: 'One microfiber cloth replaces hundreds of paper towels. They clean better, last years, and save you money.' },
    { title: 'Castile soap for floors', tip: 'A tablespoon of castile soap per gallon of warm water makes the best all-purpose floor cleaner. Safe for kids, pets, and all sealed floors.' },
    { title: 'Hydrogen peroxide as disinfectant', tip: '3% hydrogen peroxide in a spray bottle disinfects surfaces just as well as bleach without the fumes or chemical residue.' },
    { title: 'Avoid "fragrance" on labels', tip: '"Fragrance" is a legal catchall for dozens of undisclosed chemicals. Choose "fragrance-free" or "scented with essential oils" products.' },
    { title: 'Lemon for natural freshness', tip: 'Cut a lemon in half and run it through the disposal, wipe down cutting boards, or leave halves in the fridge. Natural deodorizer.' },
    { title: 'Reusable spray bottles', tip: 'Buy concentrate and dilute into reusable bottles. You save money, reduce plastic waste, and always have product on hand.' },
    { title: 'Steam cleaning without chemicals', tip: 'A handheld steam cleaner uses only water and kills 99.9% of bacteria. Great for grout, tile, and sealed surfaces.' },
    { title: 'Essential oil caution with pets', tip: 'Tea tree, eucalyptus, peppermint, and citrus oils are toxic to cats. If you have pets, skip essential oils in cleaning entirely.' },
  ],
  pets: [
    { title: 'Rubber squeegee for pet hair', tip: 'Drag a rubber squeegee across upholstered furniture to remove pet hair. Works better than lint rollers and costs $3.' },
    { title: 'Enzyme cleaner for accidents', tip: 'Regular cleaners just mask pet urine — enzyme cleaners actually break down the odor molecules. Nature\'s Miracle is the go-to.' },
    { title: 'Vacuum twice weekly minimum', tip: 'With pets, once a week isn\'t enough. Pet hair and dander accumulate fast. A robot vacuum for daily maintenance helps enormously.' },
    { title: 'Wash pet bedding weekly', tip: 'Hot water, no fabric softener. Pet beds harbor bacteria, fleas, and allergens. Rotate between two beds so one\'s always clean.' },
    { title: 'Paw wipe station at the door', tip: 'Keep a shallow pan of water and a towel by the entry. Wipe paws after every walk. Cuts floor-cleaning time in half.' },
    { title: 'Baking soda on carpets', tip: 'Sprinkle baking soda on carpets and rugs, wait 20 minutes, vacuum. Neutralizes pet odors without chemicals or fragrance.' },
    { title: 'Lint roller by every seat', tip: 'Keep a lint roller near the couch, bed, and front door. Quick roll before sitting down keeps clothes fur-free.' },
    { title: 'HEPA filter air purifier', tip: 'A HEPA air purifier removes airborne pet dander and hair. Game-changer for pet owners with allergies.' },
    { title: 'Clean food and water bowls daily', tip: 'Pet bowls develop biofilm (that slimy layer) within a day. Wash with hot soapy water daily — same as your own dishes.' },
    { title: 'De-fur the dryer lint trap', tip: 'If you wash pet bedding or fur-covered clothes, clean the dryer lint trap before AND after the load. Pet hair clogs vents fast.' },
  ],
  habits: [
    { title: 'Make the bed immediately', tip: 'Takes 60 seconds, changes the entire feel of your bedroom, and starts your day with one completed task. No exceptions.' },
    { title: 'One-touch rule for mail', tip: 'Touch mail once: open it, deal with it, recycle or file it. Never set it down "to deal with later." That pile on the counter? This is why.' },
    { title: 'Clean the kitchen before bed', tip: 'Wipe counters, wash dishes, take out trash. 5 minutes at night means waking up to a clean kitchen instead of yesterday\'s mess.' },
    { title: 'Put things back immediately', tip: 'The number one cause of clutter is putting things down instead of putting them away. It takes the same amount of time.' },
    { title: 'Weekly 15-minute purge', tip: 'Walk through your apartment for 15 minutes and grab anything to trash or donate. Consistent small purges prevent big clutter.' },
    { title: 'Deal with dishes immediately', tip: 'Rinse and load the dishwasher (or wash by hand) right after eating. A full sink takes 10 minutes to deal with. One plate takes 30 seconds.' },
    { title: 'Wipe the bathroom sink daily', tip: 'After your morning routine, quick wipe of the sink and counter. 15 seconds. Prevents toothpaste and soap buildup entirely.' },
    { title: 'Shoe-free home', tip: 'Take shoes off at the door. NYC sidewalks carry bacteria, rat poison residue, and general filth. Your floors stay cleaner for days longer.' },
    { title: 'Declutter before you clean', tip: 'Spending 10 minutes putting things away before cleaning means your cleaning time is actually spent cleaning, not organizing.' },
    { title: 'End-of-day reset', tip: 'Before bed, walk through each room for 2 minutes. Straighten pillows, put away stray items, quick counter wipe. Wake up to a reset home.' },
  ],
}

const faqData = [
  { q: 'How often should I deep clean my apartment?', a: 'Every 4–6 weeks is ideal for most NYC apartments. If you have pets or cook frequently, monthly deep cleaning keeps things manageable. Regular weekly maintenance between deep cleans keeps your space consistently comfortable.' },
  { q: 'What\'s the most important cleaning habit?', a: 'Making your bed and wiping kitchen counters daily. These two habits take under 2 minutes combined and have the biggest visual and psychological impact on how clean your home feels.' },
  { q: 'Are eco-friendly cleaning products as effective?', a: 'Yes. White vinegar, baking soda, and castile soap handle 90% of household cleaning. For disinfecting, hydrogen peroxide (3%) is as effective as bleach without the toxic fumes. The main exception is truly stubborn mold — that sometimes needs stronger treatment.' },
  { q: 'How do I keep my NYC apartment clean between professional cleanings?', a: 'Follow the daily habits section above — make the bed, wipe counters, deal with dishes immediately, and take shoes off at the door. These 5 habits keep your apartment presentable between professional visits.' },
  { q: 'What cleaning products should I avoid with pets?', a: 'Avoid bleach, ammonia, phenol-based products (Lysol, Pine-Sol), and anything with essential oils — especially tea tree, eucalyptus, and citrus, which are toxic to cats. Stick with vinegar, castile soap, and enzyme cleaners.' },
]

export const metadata: Metadata = {
  title: 'The 100 Best Cleaning Tips for NYC Apartments | The NYC Maid',
  description: 'The definitive list — 100 expert cleaning tips for NYC apartments from professional cleaners. Kitchen, bathroom, floors, pets & more. From $49/hr. (212) 202-8400',
  alternates: { canonical: 'https://www.thenycmaid.com/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid' },
  openGraph: {
    title: '100 Best Cleaning Tips | The NYC Maid',
    description: 'The definitive cleaning tips guide for NYC apartments — 100 expert tips organized by room.',
    url: 'https://www.thenycmaid.com/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid',
  },
}

export default function TipsPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '100 Cleaning Tips for NYC Apartments',
    description: 'The definitive guide to keeping your NYC apartment clean — 100 expert tips organized by room and category.',
    step: categories.map((cat, i) => ({
      '@type': 'HowToSection',
      name: cat.name,
      position: i + 1,
      itemListElement: tips[cat.id].map((tip, j) => ({
        '@type': 'HowToStep',
        position: j + 1,
        name: tip.title,
        text: tip.tip,
      })),
    })),
  }

  let tipNumber = 0

  return (
    <>
      <JsonLd data={[
        localBusinessSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thenycmaid.com' },
          { name: '100 Cleaning Tips', url: 'https://www.thenycmaid.com/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid' },
        ]),
        faqSchema,
        howToSchema,
      ]} />

      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#A8F0DC] tracking-[0.25em] uppercase mb-4">From the Pros Who Clean NYC Every Day</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-4">The 100 Best Cleaning Tips for NYC Apartments</h1>
          <p className="text-white/60 text-lg max-w-3xl mx-auto">No fluff, no sponsored products — just the tips our professional cleaning team actually uses in real NYC apartments every single day.</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: '100 Cleaning Tips', href: '/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid' }]} />

        {/* Table of contents */}
        <nav className="border border-gray-200 rounded-xl p-6 md:p-8 mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide mb-4">Jump to a Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {categories.map(cat => (
              <a key={cat.id} href={`#${cat.id}`} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-[#A8F0DC]/20 hover:text-[#1E2A4A] transition-colors">
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </a>
            ))}
          </div>
        </nav>

        {/* All tips by category */}
        {categories.map(cat => (
          <section key={cat.id} id={cat.id} className="mb-16 scroll-mt-24">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{cat.icon}</span>
              <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide">{cat.name}</h2>
            </div>
            <div className="space-y-4">
              {tips[cat.id].map(tip => {
                tipNumber++
                return (
                  <div key={tip.title} className="flex gap-4 items-start p-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1E2A4A] text-white text-sm font-bold flex items-center justify-center">{tipNumber}</span>
                    <div>
                      <h3 className="font-semibold text-[#1E2A4A]">{tip.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{tip.tip}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Mid-page CTA every 3 categories */}
            {(cat.id === 'bedroom' || cat.id === 'laundry' || cat.id === 'pets') && (
              <div className="bg-[#A8F0DC]/15 border border-[#A8F0DC]/30 rounded-xl p-6 mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-[#1E2A4A] font-medium">Rather have a pro handle it? We start at $49/hr.</p>
                <a href="tel:2122028400" className="border-2 border-[#1E2A4A] text-[#1E2A4A] px-6 py-2.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A] hover:text-white transition-colors flex-shrink-0">
                  (212) 202-8400
                </a>
              </div>
            )}
          </section>
        ))}

        {/* FAQ section */}
        <section className="mt-20 mb-16">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqData.map(f => (
              <div key={f.q} className="border-b border-gray-200 pb-6">
                <h3 className="font-semibold text-[#1E2A4A] text-lg mb-2">{f.q}</h3>
                <p className="text-gray-600">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center">
          <p className="text-gray-600">
            Want more in-depth articles? Check out our <Link href="/nyc-maid-service-blog" className="text-[#1E2A4A] font-semibold hover:underline">blog</Link> for detailed cleaning guides.
          </p>
        </div>
      </div>

      <CTABlock title="Done Reading? Let Us Handle the Cleaning." />
    </>
  )
}
