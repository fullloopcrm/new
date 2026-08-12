// Editorial bento collage of brand-lifestyle shots — games, bars, bridges, a
// car, a cop, a bike ride — deliberately not the clean on-model product
// photography used in the 212H/212T/212HR sections above. This is "the
// brand lives here" texture, not a listing.
interface MontageTile {
  src: string
  alt: string
  span: string
}

const TILES: MontageTile[] = [
  { src: '/site-assets/urban-co/montage/times-square.jpeg', alt: 'Urban Co. billboard in Times Square, NYC', span: 'sm:col-span-2 sm:row-span-2' },
  { src: '/site-assets/urban-co/montage/brooklyn-bridge-group.jpeg', alt: 'Five people wearing Urban Co. hoodies on the Brooklyn Bridge at night', span: 'sm:col-span-2' },
  { src: '/site-assets/urban-co/montage/knicks.jpeg', alt: 'Man wearing an Urban Co. white hoodie at a Knicks game, Madison Square Garden', span: '' },
  { src: '/site-assets/urban-co/montage/mets.jpeg', alt: 'Woman wearing an Urban Co. beige tee at a Mets game', span: '' },
  { src: '/site-assets/urban-co/montage/rooftop-bar.jpeg', alt: 'Woman wearing an Urban Co. beige tee at a NYC rooftop bar', span: 'sm:row-span-2' },
  { src: '/site-assets/urban-co/montage/luxury-car.jpeg', alt: 'Man wearing an Urban Co. black hoodie driving on Fifth Avenue', span: '' },
  { src: '/site-assets/urban-co/montage/nypd-officer.jpeg', alt: 'NYPD officer wearing an Urban Co. white tee under his uniform', span: '' },
  { src: '/site-assets/urban-co/montage/bike-ride.jpeg', alt: 'Woman wearing an Urban Co. white tee riding a bike through NYC traffic', span: '' },
  { src: '/site-assets/urban-co/montage/brooklyn-bridge-solo.jpeg', alt: 'Man wearing an Urban Co. black hoodie on the Brooklyn Bridge', span: '' },
  { src: '/site-assets/urban-co/montage/rooftop-sunset.jpeg', alt: 'Woman wearing an Urban Co. beige hoodie on a NYC rooftop at sunset', span: 'sm:col-span-2' },
]

export default function CityMontage() {
  return (
    <section className="bg-black text-white py-16 sm:py-24">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-10 sm:mb-14">
          <span className="inline-block bg-white text-black text-[11px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 mb-6">
            On The Block
          </span>
          <h2 className="font-[family-name:var(--font-anton)] text-4xl sm:text-6xl uppercase tracking-wide leading-[0.95]">
            Worn All Over The City.
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 auto-rows-[160px] sm:auto-rows-[220px] gap-2 sm:gap-3">
          {TILES.map((tile) => (
            <div key={tile.src} className={`relative overflow-hidden ${tile.span}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- fixed-height bento grid, plain img avoids next/image's fill-container ceremony for a collage this size */}
              <img src={tile.src} alt={tile.alt} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
