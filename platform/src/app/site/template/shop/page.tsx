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
              <p>We also keep the original negative for every print in this shop archived in our own darkroom. If you ever want the same image in a different size, or a replacement for a print that got damaged, we can reprint from the original negative — no re-shoot required.</p>
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
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">Framing It Yourself</h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>Prints ship unframed so you can choose framing that fits your own space and budget — a standard-size mat and frame from any framing shop will fit our 5x7 through 16x20 sizes without custom cutting. If you want the print to hold its full tonal range for decades rather than years, ask your framer for acid-free matting and UV-filtering glass; it&apos;s a small added cost with a real long-term payoff.</p>
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
            </div>
          </section>
        </article>
      )}
    </>
  )
}
