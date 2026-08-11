import type { SiteConfig } from '@/app/site/template/_config/types'

// Flagship spotlight for the two branded Pima cotton pieces (hoodie + tee) —
// these don't exist as real catalog products yet, so this is a placeholder
// section: real photography/pricing/copy drop in later without touching the
// layout. Editorial two-up, not the compact 3-col grid "What's Hot" uses —
// deliberately larger and slower-paced, the way a DTC flagship drop reads.
const NOISE_BG =
  'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")'

interface FlagshipItem {
  eyebrow: string
  name: string
  label: string
  invert: boolean
}

const ITEMS: FlagshipItem[] = [
  { eyebrow: 'The Hoodie', name: 'Pima Cotton Hoodie', label: 'Heavyweight Fleece', invert: false },
  { eyebrow: 'The Tee', name: 'Pima Cotton Tee', label: 'Garment-Dyed Jersey', invert: true },
]

// No real photography yet -- rather than fake a product shot or fade the
// name into near-invisibility, the placeholder IS the composition: a
// full-bleed material stat treated as the hero graphic, one tile inverted
// to white so the pair reads as a deliberate pairing, not a blank box.
function PlaceholderTile({ item, index, total }: { item: FlagshipItem; index: number; total: number }) {
  const bg = item.invert ? 'bg-white' : 'bg-black'
  const fg = item.invert ? 'text-black' : 'text-white'
  const fgFaint = item.invert ? 'text-black/30' : 'text-white/30'
  const border = item.invert ? 'border-black/10' : 'border-white/10'
  const tagBg = item.invert ? 'bg-black text-white' : 'bg-white text-black'

  return (
    <div className="group">
      <div className={`relative overflow-hidden ${bg} ${fg} aspect-[4/5] border ${border}`}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{ backgroundImage: NOISE_BG }}
        />

        <span className={`absolute top-4 left-4 z-10 text-[11px] font-bold tracking-[0.15em] uppercase px-2.5 py-1.5 ${tagBg}`}>
          Coming Soon
        </span>

        <div className={`absolute inset-0 flex flex-col justify-between p-6 sm:p-8 transition-transform duration-500 ease-out group-hover:scale-[1.02]`}>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="font-[family-name:var(--font-anton)] text-[26vw] sm:text-[7.5vw] leading-none tracking-tight">
              100%
            </span>
            <span className="font-[family-name:var(--font-anton)] uppercase text-2xl sm:text-4xl tracking-wide -mt-1 sm:-mt-2">
              Pima Cotton
            </span>
          </div>
          <div className={`flex items-end justify-between pt-4 border-t ${border}`}>
            <span className="font-[family-name:var(--font-plex-mono)] text-[11px] tracking-[0.2em] uppercase">
              {item.label}
            </span>
            <span className={`font-[family-name:var(--font-plex-mono)] text-[11px] tracking-[0.2em] uppercase ${fgFaint}`}>
              {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
      <div className="pt-5 pb-2">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-black/40 mb-2 font-[family-name:var(--font-plex-mono)]">
          {item.eyebrow}
        </p>
        <h3 className="font-[family-name:var(--font-anton)] text-2xl sm:text-3xl uppercase tracking-wide leading-[0.95]">
          {item.name}
        </h3>
        <p className="mt-3 text-black/50 text-sm leading-relaxed max-w-xs">
          100% Pima cotton. Details drop with the launch.
        </p>
      </div>
    </div>
  )
}

export default function PimaCottonFlagship({ config }: { config: SiteConfig }) {
  return (
    <section className="bg-white text-black py-16 sm:py-24 border-t border-black/10">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-12 sm:mb-16">
          <span className="inline-block bg-black text-white text-[11px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 mb-6">
            The Flagship
          </span>
          <h2 className="font-[family-name:var(--font-anton)] text-4xl sm:text-6xl uppercase tracking-wide leading-[0.95] mb-5">
            100% Pima Cotton.
          </h2>
          <p className="text-black/70 text-base sm:text-lg leading-relaxed">
            The two pieces {config.identity.name} is built on. Longer staple, softer hand, heavier drape than standard cotton — made to be worn every day and outlast a season.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-14 lg:gap-x-14">
          {ITEMS.map((item, i) => (
            <PlaceholderTile key={item.name} item={item} index={i} total={ITEMS.length} />
          ))}
        </div>
      </div>
    </section>
  )
}
