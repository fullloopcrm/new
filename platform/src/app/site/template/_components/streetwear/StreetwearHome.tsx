import Link from 'next/link'
import Image from 'next/image'
import type { SiteConfig } from '@/app/site/template/_config/types'
import { getTenantFromHeaders, getTenantServices } from '@/lib/tenant-site'
import JsonLd from '@/app/site/template/_components/JsonLd'
import { buildBusiness, productItemListSchema } from '@/app/site/template/_lib/seo/schema'
import { money } from '@/app/site/template/_lib/money'
import AddToCartButton from './AddToCartButton'
import ZoomImage from './ZoomImage'
import HeroTabs, { type HeroTab } from './HeroTabs'
import PimaCottonFlagship from './PimaCottonFlagship'
import CityMontage from './CityMontage'

interface FeaturedProduct {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  priceCents: number
  category: string | null
  createdAt: string | null
  colorOptions: string[]
  sizeOptions: string[]
}

const NEW_WINDOW_DAYS = 14
function isNew(createdAt: string | null): boolean {
  if (!createdAt) return false
  const ageMs = Date.now() - new Date(createdAt).getTime()
  return ageMs >= 0 && ageMs <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

// "What's Hot" is a hand-curated mix of real clothing, not a random top-N
// slice and not accessories — leads with what's actually popular in urban
// fashion right now (hoodies, tees, jackets, joggers). No rompers: none
// exist in the catalog (Printify's blank apparel line doesn't carry them,
// and none were imported), so that category is left out rather than faked.
function bucket(name: string): 'hoodie' | 'tee' | 'jacket' | 'jogger' | 'other' {
  const n = name.toLowerCase()
  if (n.includes('hoodie') || n.includes('hooded')) return 'hoodie'
  if (n.includes('tee') || n.includes('t-shirt') || n.includes('tank')) return 'tee'
  if (n.includes('bomber') || n.includes('varsity') || n.includes('windbreaker') || n.includes('puffer') || n.includes('jacket')) return 'jacket'
  if (n.includes('jogger') || n.includes('sweatpant')) return 'jogger'
  return 'other'
}

async function loadFeatured(): Promise<FeaturedProduct[]> {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return []
  const rows = await getTenantServices(tenant.id)
  const toFeatured = (r: (typeof rows)[number]): FeaturedProduct => ({
    id: r.id,
    name: r.name,
    description: r.description,
    imageUrl: r.image_url,
    priceCents: r.price_cents || 0,
    category: r.category || null,
    createdAt: r.created_at || null,
    colorOptions: r.color_options || [],
    sizeOptions: r.size_options || [],
  })
  const products = rows
    .filter((r) => r.item_type === 'product' && r.active && (r.price_cents || 0) > 0 && r.category !== 'Accessories')
    .map(toFeatured)

  const hoodies = products.filter((p) => bucket(p.name) === 'hoodie').slice(0, 2)
  const tees = products.filter((p) => bucket(p.name) === 'tee').slice(0, 2)
  const jackets = products.filter((p) => bucket(p.name) === 'jacket').slice(0, 1)
  const joggers = products.filter((p) => bucket(p.name) === 'jogger').slice(0, 1)

  const curated = [...hoodies, ...tees, ...jackets, ...joggers]
  const usedIds = new Set(curated.map((p) => p.id))
  const backfill = products.filter((p) => !usedIds.has(p.id)).slice(0, Math.max(0, 6 - curated.length))
  return [...curated, ...backfill].slice(0, 6)
}

// Editorial, grid-breaking homepage for the streetwear-editorial variant.
// Deliberately not a themed reskin of the service-business GenericHome —
// full-bleed dark hero, oversized display type, asymmetric product bento
// instead of the uniform 3-col card grid every other tenant's Shop uses.
export default async function StreetwearHome({ config }: { config: SiteConfig }) {
  const products = await loadFeatured()
  const featured = products.slice(0, 6)
  const business = buildBusiness(config)

  // Sample hero backgrounds — swap-in lifestyle shots to see how a photo
  // band behind the tabs reads, one per tab. Placeholder source images,
  // not final photography.
  const heroTabs: HeroTab[] = [
    { key: 'fellas', label: 'Fellas', imageUrl: '/site-assets/urban-co/hero/hero-1.jpeg' },
    { key: 'ladies', label: 'Ladies', imageUrl: '/site-assets/urban-co/hero/hero-2.webp' },
    { key: 'accessories', label: 'Accessories', imageUrl: '/site-assets/urban-co/hero/hero-3.webp' },
    { key: 'whats-hot', label: "What's Hot", imageUrl: '/site-assets/urban-co/hero/hero-4.webp' },
    { key: 'about', label: 'About', imageUrl: null },
  ]

  return (
    <>
      {featured.length > 0 && <JsonLd data={productItemListSchema(business, featured)} />}

      {/* Hero — image-only, no copy. The tab row is the only UI on top of the
          photo (it's the primary nav, not decorative), pinned to the bottom
          of a full-bleed frame instead of stacked under a wordmark. */}
      <section className="relative isolate bg-black text-white overflow-hidden min-h-[70vh] sm:min-h-[85vh] flex flex-col justify-end">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-screen"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
          }}
        />
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 pb-10 sm:pb-14 w-full">
          <HeroTabs tabs={heroTabs} />
        </div>
      </section>

      {/* Welcome/About — rubber logo left (30%), content right (70%). */}
      <section className="bg-white text-black py-16 sm:py-24">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-[30%_70%] gap-10 items-center">
          <div className="flex justify-start lg:justify-center">
            <Image
              src="/logos/urban-co/logo-rubber-black-white.jpeg"
              alt={`${config.identity.name} rubber-patch street-grid logo`}
              width={800}
              height={800}
              className="w-40 h-40 sm:w-56 sm:h-56 object-contain"
            />
          </div>
          <div>
            <span className="inline-block bg-black text-white text-[11px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 mb-6">
              NYC Streetwear
            </span>
            <h2 className="font-[family-name:var(--font-anton)] text-3xl sm:text-5xl uppercase tracking-wide leading-[0.95] mb-5">
              Welcome to Urban Co. NYC, local drip.
            </h2>
            <p className="text-black/70 text-base sm:text-lg leading-relaxed max-w-3xl mb-4">
              {config.brandCopy?.heroLine || 'Global Drip, Local Roots — Where Hype Meets Culture.'}
            </p>
            <p className="text-black/70 text-base sm:text-lg leading-relaxed max-w-3xl mb-8">
              Born and based in Midtown — 150 West 47th Street, Diamond District. Drip sourced globally, worn locally, made for all five boroughs. No mood boards, no seasonal gimmicks — just heavyweight fabric and hard-edged graphics built for the block, not the boardroom.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-lg mb-8 pt-6 border-t border-black/10">
              <div>
                <p className="font-[family-name:var(--font-anton)] text-2xl sm:text-3xl uppercase leading-none">100%</p>
                <p className="text-[11px] text-black/50 tracking-[0.1em] uppercase mt-1 font-[family-name:var(--font-plex-mono)]">Pima Cotton</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-anton)] text-2xl sm:text-3xl uppercase leading-none">NYC</p>
                <p className="text-[11px] text-black/50 tracking-[0.1em] uppercase mt-1 font-[family-name:var(--font-plex-mono)]">Diamond District</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-anton)] text-2xl sm:text-3xl uppercase leading-none">5</p>
                <p className="text-[11px] text-black/50 tracking-[0.1em] uppercase mt-1 font-[family-name:var(--font-plex-mono)]">Boroughs Served</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <Link href="/shop" className="inline-block bg-black text-white text-sm font-bold tracking-wide uppercase px-6 py-3 hover:bg-[var(--accent)] hover:text-black transition-colors">
                Shop Now
              </Link>
              <Link href="/about" className="inline-block text-black text-sm font-semibold tracking-wide uppercase border-b border-black/40 hover:border-black transition-colors">
                Learn More &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PimaCottonFlagship config={config} />

      {/* Featured drop — alternates to WHITE, asymmetric bento not a uniform grid */}
      <section className="bg-white text-black py-16 sm:py-24">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8">
          <div className="flex items-end justify-between mb-10 gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.25em] uppercase mb-2 font-[family-name:var(--font-plex-mono)] text-[var(--accent)]">Latest Drop</p>
              <h2 className="font-[family-name:var(--font-anton)] text-4xl sm:text-5xl uppercase tracking-wide">What&apos;s Hot</h2>
            </div>
            <Link href="/shop" className="hidden sm:inline-block text-black/50 hover:text-black text-sm font-semibold tracking-wide uppercase transition-colors">
              View All &rarr;
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="border border-black/15 p-12 text-center text-black/60">No products live yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 lg:gap-x-10 lg:gap-y-20">
              {featured.map((p) => (
                <div key={p.id} className="group relative">
                  <Link href={`/shop/${p.id}`} className="block">
                    <div className="relative overflow-hidden bg-black/5 aspect-[3/4]">
                      {isNew(p.createdAt) && (
                        <span className="absolute top-4 left-4 z-10 bg-black text-white text-[11px] font-bold tracking-[0.15em] uppercase px-2.5 py-1.5">
                          New
                        </span>
                      )}
                      {p.imageUrl && <ZoomImage src={p.imageUrl} alt={p.name} />}
                    </div>
                  </Link>
                  <div className="pt-5 pb-2">
                    {p.category && <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/60 mb-2 font-[family-name:var(--font-plex-mono)]">{p.category}</p>}
                    <Link href={`/shop/${p.id}`}>
                      <h3 className="font-[family-name:var(--font-anton)] text-2xl sm:text-3xl uppercase tracking-wide leading-[0.95] hover:text-[var(--accent)] transition-colors">{p.name}</h3>
                    </Link>
                    <div className="flex items-center justify-between mt-4">
                      <span className="font-[family-name:var(--font-plex-mono)] text-black font-semibold text-base">{money(p.priceCents)}</span>
                      <AddToCartButton product={p} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 sm:hidden">
            <Link href="/shop" className="inline-block text-black/50 hover:text-black text-sm font-semibold tracking-wide uppercase transition-colors">
              View All &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Editorial brand statement — alternates to GRAY, third tone in rotation */}
      <section className="bg-[var(--accent)] text-black py-16 sm:py-24">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-2 flex justify-start lg:justify-center">
            {config.identity.logo && (
              <Image
                src="/logos/urban-co/logo-black-on-white.png"
                alt={`${config.identity.name} street-grid mark`}
                width={140}
                height={140}
                className="w-24 h-24 sm:w-32 sm:h-32"
              />
            )}
          </div>
          <div className="lg:col-span-10">
            <h2 className="font-[family-name:var(--font-anton)] text-3xl sm:text-5xl uppercase tracking-wide leading-[0.95] mb-5">
              Founded on the block that never stops moving.
            </h2>
            <p className="text-black/70 text-base sm:text-lg leading-relaxed max-w-3xl">
              {config.identity.name} runs out of {config.geo.placename !== 'Your City' ? config.geo.placename : 'New York City'} — 150 West 47th Street, deep in the Diamond District. No mood boards, no seasonal gimmicks. Heavyweight fabric, hard graphics, and a street-grid mark that doesn&apos;t apologize for where it&apos;s from.
            </p>
          </div>
        </div>
      </section>

      <CityMontage />
    </>
  )
}
