import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { getTenantFromHeaders, getTenantServices } from '@/lib/tenant-site'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import ShopClient, { type ShopProduct } from '@/app/site/template/_components/ShopClient'
import StreetwearShopGrid, { type StreetwearProduct } from '@/app/site/template/_components/streetwear/StreetwearShopGrid'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const title = `Shop | ${config.identity.name}`
  return {
    title,
    description: `Shop products from ${config.identity.name}.`,
    alternates: { canonical: `${config.identity.url}/shop` },
    openGraph: { title, url: `${config.identity.url}/shop` },
  }
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const config = await getSiteConfig()
  if (!config.storefrontEnabled) notFound()
  const tenant = await getTenantFromHeaders()
  const rows = tenant ? await getTenantServices(tenant.id) : []
  const filtered = rows.filter((r) => r.item_type === 'product' && (r.price_cents || 0) > 0)

  const { page: pageParam } = await searchParams
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(totalPages, Math.max(1, parseInt(pageParam || '1', 10) || 1))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (config.layoutVariant === 'streetwear-editorial') {
    const streetwearProducts: StreetwearProduct[] = pageRows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUrl: r.image_url,
      priceCents: r.price_cents || 0,
      category: r.category || null,
      createdAt: r.created_at || null,
      colorOptions: r.color_options || [],
      sizeOptions: r.size_options || [],
    }))
    return (
      <StreetwearShopGrid
        config={config}
        products={streetwearProducts}
        heading="Shop All"
        subheading={`${filtered.length} item${filtered.length === 1 ? '' : 's'} — the full catalog.`}
        page={page}
        totalPages={totalPages}
        basePath="/shop"
      />
    )
  }

  const products: ShopProduct[] = pageRows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    imageUrl: r.image_url,
    priceCents: r.price_cents || 0,
    category: r.category || null,
    colorOptions: r.color_options || [],
    sizeOptions: r.size_options || [],
  }))
  const isPhotography = industryProfile(config.industry).isPhotography

  return (
    <>
      <ShopClient config={config} products={products} page={page} totalPages={totalPages} basePath="/shop" />
      {isPhotography && (
        <article className="max-w-3xl mx-auto px-6 py-16 md:py-24">
          <section>
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">Real Darkroom Prints, Not Reproductions</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>Every print in this shop is a genuine silver gelatin darkroom print — light through a real black and white negative, exposed onto real photographic paper, developed in real chemistry. Not an inkjet reproduction of a scanned negative, and nothing generated or upscaled by AI at any step.</p>
              <p>Each image started as a real 35mm or medium format frame shot around San Francisco, hand-developed in our own darkroom, then hand-printed under a real safelight — the same process behind every session we shoot for clients. A print from this shop went through the exact same craft as a client&apos;s own portrait or wedding negatives.</p>
            </div>
          </section>
          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">Why We Sell Prints, Not Just Sessions</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>Most people who love a city they don&apos;t live in anymore, or love the specific way San Francisco&apos;s fog rolls over the hills at dusk, don&apos;t need a personal photo session — they need a real, physical print of a place that means something to them. That&apos;s what this shop exists for: the same darkroom process behind every client session, available as a finished object without booking a shoot first.</p>
              <p>We also think a working darkroom studio should have something to show for itself beyond client work. Every print here is a piece we chose to shoot, develop, and print because we thought it was worth doing — not commissioned, not stock, just real film work we&apos;re proud enough of to sell.</p>
            </div>
          </section>
          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">Sizes, Paper, and What You&apos;re Getting</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>Standard sizes run from 5x7 up to 16x20, all hand-printed on archival photo paper rated to resist fading and yellowing for well over a century under normal display conditions. Custom sizing beyond that range is available — text us and we&apos;ll quote it directly.</p>
              <p>Prints ship unframed by default so you can choose framing that fits your own space. If you want the print to hold its tonal range for decades rather than years, acid-free matting and UV-filtering glass are worth the small added cost at framing time — see our <Link href="/blog/how-to-care-for-and-preserve-darkroom-prints" className="underline text-[var(--brand)] hover:text-[var(--accent)]">print care guide</Link> for the full breakdown.</p>
            </div>
          </section>
          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">Where These Prints Come From</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>Every image in this shop was shot at one of our regular <Link href="/blog/best-places-to-shoot-film-photography-in-san-francisco" className="underline text-[var(--brand)] hover:text-[var(--accent)]">San Francisco locations</Link> — the fog rolling over Twin Peaks, the Golden Gate Bridge from Battery Spencer, the Victorian rowhouses at Alamo Square. If you want a print of a specific San Francisco location that isn&apos;t listed here, <Link href="/contact" className="underline text-[var(--brand)] hover:text-[var(--accent)]">reach out</Link> — a custom landscape shoot through our <Link href="/services/black-and-white-landscape-photography" className="underline text-[var(--brand)] hover:text-[var(--accent)]">landscape photography service</Link> is how every print here started.</p>
            </div>
          </section>
          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">Every Print in This Shop, and Why We Shot It</h2>
            <div className="space-y-6 text-gray-600 text-[17px] leading-relaxed">
              <p><strong className="text-[var(--brand)]">Golden Gate Bridge in Fog.</strong> Shot from the Marin side on a morning when the fog bank sat right at deck height — the towers disappear into it and only the roadway shows. This is the version of the bridge locals actually see most days, not the postcard version with clear blue sky behind it. Printed with a longer exposure on the highlights to hold detail in the fog instead of blowing it out to flat white.</p>
              <p><strong className="text-[var(--brand)]">Twin Peaks at Blue Hour.</strong> Shot right after sunset, before the city lights fully come up, when the sky still holds a little residual light and the grade of the hill reads as pure silhouette. Blue hour is a narrow window — maybe ten minutes where the exposure balance between the sky and the city below actually works on black and white film without one or the other going dead.</p>
              <p><strong className="text-[var(--brand)]">Lands End Coastal Silhouette.</strong> Shot from the cliffs near the Sutro Baths ruins, looking out past the cypress trees toward the water. The trees at Lands End grew bent from decades of wind off the Pacific, and on film that bend reads as texture and shape rather than the flat green a color photo would show — this is one of the clearest cases where black and white does more with less.</p>
              <p><strong className="text-[var(--brand)]">Haight-Ashbury Storefronts.</strong> Shot straight down Haight Street on a slow weekday morning before the sidewalks fill up, catching the Victorian storefronts and the overhead wires without a crowd in the frame. The goal was the architecture and the street itself, not a moment of foot traffic — the kind of print that still reads clearly ten years from now, when the storefronts have changed but the buildings haven&apos;t.</p>
              <p><strong className="text-[var(--brand)]">Cable Car on California Street.</strong> Shot from street level as a car crested the hill, framed so the grade of the street itself is part of the composition — California Street is steep enough that the car appears to be climbing straight up out of the frame. Cable cars move slower than people expect, which gives just enough time to get the framing right without a motor drive.</p>
              <p><strong className="text-[var(--brand)]">Painted Ladies, Alamo Square.</strong> The most photographed row of houses in the city, shot deliberately without the skyline behind them that shows up in almost every version of this shot — just the houses, the park in the foreground, and the light on the trim. Black and white strips away the (real, but by now overly familiar) pastel paint colors and forces the eye onto the actual Victorian detailing instead.</p>
              <p><strong className="text-[var(--brand)]">Sutro Tower Through the Fog.</strong> Shot from below on a night the fog was moving fast enough that a long exposure blurs it into streaks around the tower&apos;s red-and-white structure. Sutro Tower reads almost nowhere else in the city&apos;s photography the way it does in black and white — in color the red-and-white paint scheme dominates the frame; stripped to tone, it&apos;s just a stark industrial shape against moving fog.</p>
              <p><strong className="text-[var(--brand)]">Ferry Building Clock Tower.</strong> Shot from the Embarcadero at an angle that keeps the tower&apos;s full height in frame along with a slice of the market crowd below, tying the building to the life actually happening around it rather than isolating it as a monument shot. The clock face was timed deliberately into the frame — check it and you can tell roughly when this was shot.</p>
              <p><strong className="text-[var(--brand)]">Mission District Mural Wall.</strong> Shot on Balmy Alley, one of the Mission&apos;s longest-running mural corridors, framed to hold an entire wall rather than crop into a single piece. Murals are usually shot in color for obvious reasons, so shooting one in black and white is a deliberate choice — it&apos;s a print about the composition and linework of the wall as a whole, not a color reproduction of any single mural.</p>
              <p><strong className="text-[var(--brand)]">Bernal Heights Skyline View.</strong> Shot from the summit of Bernal Hill, one of the few spots in the city where you get the full downtown skyline with open hillside grass in the foreground instead of another building. Bernal Heights doesn&apos;t show up in SF photography nearly as often as Twin Peaks or Dolores Park, despite arguably having the better angle on the skyline — this print is partly an argument for that.</p>
            </div>
          </section>
          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">Choosing What Makes the Cut</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>Not every negative becomes a shop print. A typical outing shooting San Francisco landscapes produces a full roll or two — 24 to 72 frames — and usually one or two frames per roll are actually worth printing and selling. The rest get contact-printed for our own reference and archived with the negative, but they don&apos;t make it to the shop.</p>
              <p>The bar for what makes the cut isn&apos;t just technical (sharp focus, correct exposure, clean development) — plenty of technically clean frames still don&apos;t get sold, because the shot itself doesn&apos;t say anything beyond &ldquo;a competent photo of a landmark.&rdquo; What we&apos;re actually looking for is a frame where the light, the fog, the time of day, or the angle did something the location doesn&apos;t look like in every other photo of it — the fog sitting at exactly the right height on the bridge, the one ten-minute window of blue hour light, the wind bending the cypress trees at Lands End into shape.</p>
            </div>
          </section>
          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">Prints as Gifts</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>A hand-printed photograph is a genuinely uncommon gift in 2026 — almost everyone already has more digital photos than they know what to do with, and almost no one has enough real, physical ones. A print of a favorite San Francisco spot works for a housewarming, an anniversary, or anyone who used to live here and misses it.</p>
              <p>Unlike a session gift certificate, which asks the recipient to schedule and show up, a print is finished the moment it arrives — no coordination required on their end, just something real to unwrap.</p>
            </div>
          </section>
          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">Archival Value — What You&apos;re Actually Buying</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>A properly fixed and washed darkroom print doesn&apos;t depend on a device, a cloud account, or a subscription to still exist in fifty years — it just needs to stay out of direct sun and normal indoor humidity. That&apos;s a meaningfully different kind of object than a digital image, which depends on someone actively maintaining a backup indefinitely.</p>
              <p>We also keep the original negative for every print in this shop archived in our own darkroom, stored flat in archival sleeves away from heat and light. If you ever want the same image in a different size, or a replacement for a print that got damaged, we can reprint from the original negative — no re-shoot required.</p>
            </div>
          </section>
          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">A Print Is Not a File</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>A digital photo lives on a screen, which means it&apos;s always mediated by whatever screen it happens to be on — a phone in a dark room, a laptop in direct sun, a monitor with its brightness set wrong. The same JPEG can look completely different from one device to the next, and it never looks like anything at all until a screen is on and pointed at you.</p>
              <p>A darkroom print doesn&apos;t have that problem. The tonal range was set once, by hand, under a real enlarger, checked against a real test strip until it was right — and it looks the same whether it&apos;s on your wall at nine in the morning or nine at night. You&apos;re not buying a file that renders differently depending on hardware. You&apos;re buying the one physical object the darkroom process actually produced.</p>
              <p>That&apos;s also why we don&apos;t sell digital scans of these images on their own. A scan of a darkroom print is a photo of a photo — one more step removed from the negative, with its own compression and color-space decisions baked in. If you want the image, you want the print.</p>
            </div>
          </section>
          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">Shipping and Turnaround</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>Because every print is hand-printed to order — not pulled from a pre-made stack — expect roughly 5-7 business days before your print ships, the same turnaround as a client session&apos;s darkroom prints. Prints are packaged flat and protected for shipping; local pickup is available if you&apos;d rather not wait on a courier.</p>
              <p>We ship within the continental US as standard; if you&apos;re outside that range, <Link href="/contact" className="underline text-[var(--brand)] hover:text-[var(--accent)]">reach out</Link> before ordering and we&apos;ll confirm cost and timing.</p>
            </div>
          </section>
          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">No AI, Same as Everything Else Here</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>The same standard that governs every client session governs this shop: no AI-generated imagery, no AI upscaling standing in for real resolution, no digital filter dressed up to look like film grain. Every image started as light through a real lens onto real film — the shop exists to sell the physical results of that process, not a shortcut to them.</p>
              <p>If you&apos;ve read anything else on this site, you already know why that matters to us. A print that claims to be a real photograph should actually be one.</p>
            </div>
          </section>
          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">Why These Are Black and White, Not a Missing Color Option</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>People sometimes ask whether we&apos;ll shoot a color version of a print they like — the honest answer is no, and it&apos;s not because color film wasn&apos;t available. Black and white is the actual medium here, not a filter applied after the fact to a color negative, and it changes what the camera is actually looking for in a scene.</p>
              <p>Color photography reads a scene largely through hue — the red of a building, the green of a hillside, the blue of the bay. Black and white strips hue out entirely and forces everything down to tone, contrast, and shape. That&apos;s a real constraint, and it&apos;s exactly what makes certain San Francisco scenes — fog against a dark hillside, the grid of Victorian windows on a flat gray sky, the geometry of a cable car line disappearing up a steep street — work as compositions in a way a color version of the same frame usually doesn&apos;t.</p>
              <p>It also means the darkroom work matters more, not less. Every print in this shop was dodged and burned by hand under the enlarger — lightening some areas, darkening others — to get the tonal range to actually hold together on paper the way it looked in the moment. There&apos;s no hue to fall back on if the tones are flat; black and white either works as a print or it doesn&apos;t, and that&apos;s the standard every image here was held to before it made it into the shop.</p>
              <p>This is also why we&apos;d rather turn down a request for a color version than deliver one that doesn&apos;t hold up. A color print of the same Golden Gate Bridge frame, shot on color film instead, would be a genuinely different image — different film stock, different exposure decisions, different composition choices, because color and black and white aren&apos;t asking the same question of a scene. If you want a color session, our client work covers that; this shop specifically is the black and white darkroom catalog.</p>
            </div>
          </section>
          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">Framing It Yourself</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>Prints ship unframed so you can choose framing that fits your own space and budget — a standard-size mat and frame from any framing shop will fit our 5x7 through 16x20 sizes without custom cutting. If you want the print to hold its full tonal range for decades rather than years, ask your framer for acid-free matting and UV-filtering glass; it&apos;s a small added cost with a real long-term payoff.</p>
            </div>
          </section>
          <section className="mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">Buying Your First Darkroom Print</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>If you&apos;ve never owned a real darkroom print before, the first thing most people notice in person is the surface — the paper itself has a texture and a weight that a printed photo from a drugstore kiosk or an inkjet at home doesn&apos;t have. It&apos;s a physical object made through a chemical process, not a coating of ink sprayed onto stock paper.</p>
              <p>The second thing people usually notice is the tonal range — real silver gelatin prints hold detail in both the deep shadows and the brightest highlights in a way that&apos;s hard to get out of a digital print, because the darkroom process was built around exactly that problem for over a century before digital printing existed at all. Stand close to a real darkroom print and you can usually still make out detail in a shadow area that would&apos;ve gone to solid black on an inkjet print of the same image.</p>
              <p>If you&apos;re ordering your first print from this shop and aren&apos;t sure which location or size to pick, <Link href="/contact" className="underline text-[var(--brand)] hover:text-[var(--accent)]">text us</Link> — we&apos;re glad to talk through what would actually work for the wall or room you have in mind before you order, including sizing it against your actual wall space and the light the room gets during the day.</p>
            </div>
          </section>
          <section className="mt-14 pt-12 border-t border-gray-200">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-8">Common Questions</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">Are these real photographic prints or inkjet reproductions?</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">Real silver gelatin darkroom prints, hand-printed from real black and white negatives. No inkjet, no AI upscaling, no digital reproduction standing in for the real process.</p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">Can I order a size not listed here?</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">Yes — standard sizes run 5x7 to 16x20, with custom sizing available on request. <Link href="/contact" className="underline text-[var(--brand)] hover:text-[var(--accent)]">Text us</Link> with what you need.</p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">Do you offer a custom print of a location not in the shop?</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">Yes — that&apos;s exactly what our <Link href="/services/black-and-white-landscape-photography" className="underline text-[var(--brand)] hover:text-[var(--accent)]">landscape photography service</Link> is for. We&apos;ll shoot and print your specific spot.</p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">How should I care for a print once I have it?</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">Keep it out of direct sunlight and normal indoor humidity, and it&apos;ll hold its tonal range for generations. Full details in our <Link href="/blog/how-to-care-for-and-preserve-darkroom-prints" className="underline text-[var(--brand)] hover:text-[var(--accent)]">print care guide</Link>.</p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">Do you offer a discount for buying multiple prints?</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">Ask when ordering — a small collection of prints from the same shoot or theme is a common request, and we&apos;re glad to talk through options.</p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">Are these limited-edition or numbered prints?</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">Ask when ordering if you&apos;re interested in a numbered, collector-oriented print run — we can discuss options on a per-image basis.</p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">Can I return a print if I&apos;m not happy with it?</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">If a print arrives damaged or isn&apos;t what you expected, <Link href="/contact" className="underline text-[var(--brand)] hover:text-[var(--accent)]">tell us</Link> and we&apos;ll make it right — the same standard we hold every part of this studio to.</p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">Do you sell digital scans of these images instead of physical prints?</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">No — the shop is built around the physical darkroom print itself, not a digital file of it. If you have a specific reason you need a digital scan, <Link href="/contact" className="underline text-[var(--brand)] hover:text-[var(--accent)]">reach out</Link> and we&apos;ll talk through it.</p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">Which print should I start with if I&apos;ve never bought one before?</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">There&apos;s no wrong choice, but Golden Gate Bridge in Fog and Twin Peaks at Blue Hour are the two most requested — both hold a strong tonal range that reads well in person even for someone new to darkroom prints.</p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">Can I see a print in person before I buy?</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed"><Link href="/contact" className="underline text-[var(--brand)] hover:text-[var(--accent)]">Text us</Link> to arrange a local pickup viewing — seeing the actual tonal range and paper texture in person is the best way to know if a print is right for your space.</p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">Will you shoot a custom print at a San Francisco location not shown here?</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">Yes — this shop is a fixed catalog of images we&apos;ve already shot and printed, but if you have a specific spot in mind, our <Link href="/services/black-and-white-landscape-photography" className="underline text-[var(--brand)] hover:text-[var(--accent)]">landscape photography service</Link> exists for exactly that. <Link href="/contact" className="underline text-[var(--brand)] hover:text-[var(--accent)]">Tell us</Link> what you have in mind and we&apos;ll talk through timing and pricing.</p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">Do the prints come with a certificate of authenticity?</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">Every print ships with a signed and dated label on the back identifying it as a hand-printed silver gelatin darkroom print from the original negative, which we keep archived on our end for future reprints.</p>
              </div>
            </div>
          </section>
        </article>
      )}
    </>
  )
}
