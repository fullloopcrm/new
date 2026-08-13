import type { SiteConfig } from '@/app/site/template/_config/types'
import { getTenantFromHeaders, getTenantServices } from '@/lib/tenant-site'
import { money } from '@/app/site/template/_lib/money'
import AddToCartButton from './AddToCartButton'
import ZoomImage from './ZoomImage'

// Flagship spotlight for the 212 collection — real photography, not the
// earlier "Coming Soon" placeholder graphic. Editorial 3-up per garment, not
// the compact 3-col grid "What's Hot" uses — larger images and slower
// pacing, the way a DTC flagship drop reads. Two rows: 212H (hoodie), then
// 212T (tee) beneath it.
interface Colorway {
  key: string
  label: string
  swatch: string
  swatchBorder?: boolean
}

const COLORWAYS: Colorway[] = [
  { key: 'black', label: 'Black', swatch: '#111111' },
  { key: 'white', label: 'White', swatch: '#FFFFFF', swatchBorder: true },
  { key: 'beige', label: 'Beige', swatch: '#C9AF87' },
]

interface GarmentColor {
  colorKey: string
  eyebrow: string
  // Undefined until real photography exists for this colorway — renders a
  // "Photo Coming Soon" tile rather than borrowing another garment's shot,
  // which would misrepresent what the customer is buying.
  imageSrc?: string
  imageAlt: string
}

interface Garment {
  key: string
  name: string
  priceCents: number
  description: string
  colors: GarmentColor[]
  comingSoon?: boolean
  // Set at render time from the tenant's real catalog row (matched by name).
  // Undefined means no matching product exists yet — the tile shows price
  // only, no Add to Cart, rather than a button that would fail on click.
  productId?: string
}

const GARMENTS: Garment[] = [
  {
    key: 'hoodie',
    name: 'The 212 H',
    priceCents: 21200,
    description:
      'Extra-long-staple Pima cotton, brushed into a heavyweight 400gsm fleece — softer hand and heavier drape than standard cotton blends, built to hold its shape wash after wash.',
    colors: [
      {
        colorKey: 'black',
        eyebrow: 'Black',
        imageSrc: '/site-assets/urban-co/pima-cotton/urban-co-nyc-212-hoodie-black.jpeg',
        imageAlt: 'Man wearing the Urban Co. black 212H Pima cotton hoodie on a NYC street',
      },
      {
        colorKey: 'white',
        eyebrow: 'White',
        imageSrc: '/site-assets/urban-co/pima-cotton/urban-co-nyc-212-hoodie-white.jpeg',
        imageAlt: 'Woman wearing the Urban Co. white 212H Pima cotton hoodie on a NYC street',
      },
      {
        colorKey: 'beige',
        eyebrow: 'Beige',
        imageSrc: '/site-assets/urban-co/pima-cotton/urban-co-nyc-212-hoodie-beige.jpeg',
        imageAlt: 'Woman wearing the Urban Co. beige 212H Pima cotton hoodie on a NYC street',
      },
    ],
  },
  {
    key: 'tee',
    name: 'The 212 T',
    priceCents: 9900,
    description:
      'Garment-dyed Pima cotton jersey, cut from the same long-staple yarn as the hoodie — soft from the first wear, with a heavier hand than standard tee cotton.',
    colors: [
      {
        colorKey: 'black',
        eyebrow: 'Black',
        imageSrc: '/site-assets/urban-co/pima-cotton/urban-co-nyc-212t-tee-black.jpeg',
        imageAlt: 'Man wearing the Urban Co. black 212T Pima cotton tee on a NYC subway platform',
      },
      {
        colorKey: 'white',
        eyebrow: 'White',
        imageSrc: '/site-assets/urban-co/pima-cotton/urban-co-nyc-212t-tee-white.jpeg',
        imageAlt: 'Man wearing the Urban Co. white 212T Pima cotton tee on a boat with the NYC skyline behind him',
      },
      {
        colorKey: 'beige',
        eyebrow: 'Beige',
        imageSrc: '/site-assets/urban-co/pima-cotton/urban-co-nyc-212t-tee-beige.jpeg',
        imageAlt: 'Woman wearing the Urban Co. beige 212T Pima cotton tee at a Mets game',
      },
    ],
  },
  {
    key: 'hoodie-rubber',
    name: 'The 212 HR',
    priceCents: 21200,
    description:
      'The same 100% Pima cotton fleece as The 212 H, finished with a raised rubber-print logo application instead of flat screen ink — a bolder, dimensional mark on the same heavyweight build.',
    comingSoon: true,
    colors: [
      {
        colorKey: 'black',
        eyebrow: 'Black',
        imageSrc: '/site-assets/urban-co/pima-cotton/urban-co-nyc-212hr-hoodie-black.jpeg',
        imageAlt: 'Man wearing the Urban Co. black 212HR rubber-print Pima cotton hoodie on a NYC street',
      },
      {
        colorKey: 'white',
        eyebrow: 'White',
        imageSrc: '/site-assets/urban-co/pima-cotton/urban-co-nyc-212hr-hoodie-white.jpeg',
        imageAlt: 'Woman wearing the Urban Co. white 212HR rubber-print Pima cotton hoodie on a Brooklyn street',
      },
      {
        colorKey: 'beige',
        eyebrow: 'Beige',
        imageSrc: '/site-assets/urban-co/pima-cotton/urban-co-nyc-212hr-hoodie-beige.jpeg',
        imageAlt: 'Woman wearing the Urban Co. beige 212HR rubber-print Pima cotton hoodie on a NYC rooftop',
      },
    ],
  },
]

function ColorSwatches({ activeKey }: { activeKey: string }) {
  return (
    <div className="flex items-center gap-2 mt-4" role="group" aria-label="Available colors">
      {COLORWAYS.map((c) => (
        <span
          key={c.key}
          title={c.label}
          className={`h-5 w-5 rounded-full ${c.swatchBorder ? 'border border-black/20' : ''} ${
            c.key === activeKey ? 'ring-2 ring-offset-2 ring-black' : ''
          }`}
          style={{ backgroundColor: c.swatch }}
        />
      ))}
    </div>
  )
}

function FlagshipTile({ garment, color }: { garment: Garment; color: GarmentColor }) {
  return (
    <div className="group">
      <div className="relative overflow-hidden bg-black/5 aspect-[4/5]">
        {garment.comingSoon && (
          <span className="absolute top-4 left-4 z-10 bg-black text-white text-[11px] font-bold tracking-[0.15em] uppercase px-2.5 py-1.5">
            Coming Soon
          </span>
        )}
        {color.imageSrc ? (
          <ZoomImage src={color.imageSrc} alt={color.imageAlt} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-center px-6 text-black/30 text-[11px] font-bold tracking-[0.2em] uppercase font-[family-name:var(--font-plex-mono)]">
            Photo Coming Soon
          </div>
        )}
      </div>
      <div className="pt-5 pb-2">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/60 mb-2 font-[family-name:var(--font-plex-mono)]">
          {color.eyebrow}
        </p>
        <h3 className="font-[family-name:var(--font-anton)] text-2xl sm:text-3xl uppercase tracking-wide leading-[0.95]">
          {garment.name}
        </h3>
        <p className="mt-3 text-black/60 text-sm leading-relaxed max-w-xs">{garment.description}</p>
        <div className="flex items-center justify-between mt-4">
          <ColorSwatches activeKey={color.colorKey} />
          <span className="font-[family-name:var(--font-plex-mono)] text-black font-semibold text-base">
            {money(garment.priceCents)}
          </span>
        </div>
        {!garment.comingSoon && garment.productId && (
          <div className="mt-4">
            <AddToCartButton
              product={{
                id: garment.productId,
                name: garment.name,
                priceCents: garment.priceCents,
                imageUrl: color.imageSrc ?? null,
                colorOptions: ['Black', 'White', 'Beige'],
                sizeOptions: ['S', 'M', 'L', 'XL', 'XXL'],
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Matches real catalog rows (created for "The 212 H" / "The 212 T") onto the
// hardcoded GARMENTS so Add to Cart uses a real product id instead of
// linking/adding against nothing. 212HR intentionally has no catalog row
// yet — comingSoon garments never get a productId.
async function withRealProductIds(): Promise<Garment[]> {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return GARMENTS
  const products = await getTenantServices(tenant.id)
  const byName = new Map(products.map((p) => [p.name, p]))
  return GARMENTS.map((g) => {
    if (g.comingSoon) return g
    const match = byName.get(g.name)
    return match ? { ...g, productId: match.id } : g
  })
}

export default async function PimaCottonFlagship({ config }: { config: SiteConfig }) {
  const garments = await withRealProductIds()
  return (
    <section className="bg-white text-black py-16 sm:py-24 border-t border-black/10">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8">
        <div className="mb-12 sm:mb-16">
          <span className="inline-block bg-black text-white text-[11px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 mb-6">
            The Flagship
          </span>
          <h2 className="font-[family-name:var(--font-anton)] text-4xl sm:text-6xl uppercase tracking-wide leading-[0.95] mb-5">
            100% Pima Cotton.
          </h2>
          <p className="text-black/70 text-base sm:text-lg leading-relaxed max-w-4xl">
            The three pieces {config.identity.name} is built on, each in three launch colorways. Longer staple, softer hand, heavier drape than standard cotton — made to be worn every day and outlast a season.
          </p>
        </div>

        <div className="space-y-16 sm:space-y-24">
          {garments.map((garment) => (
            <div key={garment.key} className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-14 lg:gap-x-10">
              {garment.colors.map((color) => (
                <FlagshipTile key={`${garment.key}-${color.colorKey}`} garment={garment} color={color} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
