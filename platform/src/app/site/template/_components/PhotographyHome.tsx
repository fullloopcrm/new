import Image from 'next/image'
import Link from 'next/link'
import JsonLd from '@/app/site/template/_components/JsonLd'
import type { SiteConfig } from '@/app/site/template/_config/types'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { homeContent } from '@/app/site/template/_lib/content/longform'
import { Badge, FramedPhoto, FilmStripEdge, Scanlines, RetroSun } from '@/app/site/template/_components/photography/PhotographyUI'
import { SERVICE_DESCRIPTIONS, SF_NEIGHBORHOODS, FILM_STATS, photographyExtraFaq, slugifyService } from '@/app/site/template/_lib/seo/photography-services'

/**
 * Bespoke photography-industry homepage: Hero → About → Services → Reviews →
 * FAQ, each carrying a badge (exact-match keyword) / heading (long-tail
 * keyword) / description (short + long-tail blend) for on-page SEO, plus a
 * real photo. This is its own structure (not GenericHome + decoration) for
 * the same reason StreetwearHome exists separately — this vertical needed a
 * genuinely different composition. Dispatched from page.tsx only when
 * industryProfile(config.industry).isPhotography. Shared visual primitives
 * (Badge/FramedPhoto/FilmStripEdge/Scanlines/RetroSun) and service data live
 * in photography/PhotographyUI + seo/photography-services so the
 * /services/[slug] detail pages reuse the exact same source, not a copy.
 */

export default function PhotographyHome({ config }: { config: SiteConfig }) {
  const p = industryProfile(config.industry)
  const c = homeContent(config)
  const services = config.services.filter((s) => !s.emergency)
  const smsHref = `sms:${config.contact.phoneDigits}`
  const place = config.geo.placename

  const reviewCount = Number(config.reviewCount)
  const hasRealReviews = Number.isInteger(reviewCount) && reviewCount > 0

  const cta =
    config.funnelMode === 'lead_only'
      ? { label: 'Get in touch', href: '/contact' }
      : config.funnelMode === 'pipeline'
        ? { label: 'Request a quote', href: '/book/new' }
        : { label: 'Book now', href: '/book/new' }

  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: config.identity.name,
    url: config.identity.url,
    telephone: config.contact.phone,
    ...(config.identity.logo ? { image: config.identity.logo } : {}),
    areaServed: place,
    ...(hasRealReviews
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: config.rating.toFixed(1), reviewCount } }
      : {}),
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [...c.faq, ...photographyExtraFaq(place)].map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <div>
      <JsonLd data={orgLd} />
      <JsonLd data={faqLd} />

      <FilmStripEdge />

      {/* ============ 1. HERO ============ */}
      <section className="relative overflow-hidden bg-[var(--brand)] text-white">
        <Scanlines />
        <div className="relative z-10 max-w-[1700px] mx-auto px-6 py-16 md:py-20 grid md:grid-cols-[1fr_1fr] gap-10 items-center">
          <div>
            <Badge>Film Photographer {place}</Badge>
            <h1 className="font-[family-name:var(--font-bebas)] tracking-wide leading-[0.88] text-[clamp(3.5rem,8vw,7rem)] mb-5">
              {place}&apos;s Black &amp; White Film Photography Studio
            </h1>
            <p className="text-white/80 text-lg md:text-xl mb-8 max-w-lg">
              Real film, real darkroom, real photographer — <strong className="text-white">no AI, ever</strong>. Black and white portrait, wedding, corporate headshot, and black-and-white corporate photography shot on 35mm film in {place}.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href={cta.href} className="inline-flex items-center bg-[var(--accent)] text-[var(--accent-fg)] px-8 py-4 text-base font-bold tracking-widest uppercase hover:brightness-110 transition-all">
                {cta.label}
              </Link>
              <a href={smsHref} className="inline-flex items-center border border-white/40 text-white px-8 py-4 text-base font-bold tracking-widest uppercase hover:bg-white/10 transition-colors">
                Text {config.contact.phone}
              </a>
            </div>
          </div>
          {/* Big Polaroid — the whole visual weight of the hero, not a small
              framed thumbnail next to a decorative shape. */}
          <div className="justify-self-center rotate-[2deg] bg-white p-4 pb-16 shadow-[16px_16px_0_0_var(--accent)] w-full max-w-[520px]">
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image src="/photos/photography-sf/street-scenes/the-film-photographer-of-san-francisco-70s-haight-street-group.jpg" alt={`Vintage-styled film photography, ${place} street style`} fill sizes="(max-width: 768px) 90vw, 520px" className="object-cover grayscale" priority />
            </div>
            <p className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-[var(--brand)] text-center mt-4">
              Kodak 35mm
            </p>
          </div>
        </div>
      </section>

      <FilmStripEdge />

      {/* ============ 2. ABOUT ============ */}
      <section className="bg-white">
        <div className="max-w-[1700px] mx-auto px-6 py-16 md:py-24 grid md:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
          <FramedPhoto src="/photos/photography-sf/photographer-at-work.jpg" alt={`${config.identity.name} shooting on film in the studio`} caption="No AI. Real hands, real camera." className="rotate-[-1.5deg]" />
          <div>
            <Badge>100% Human Photographer</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-5xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              The Non-AI Film Photographer Serving {place}
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                Every photo {config.identity.name} delivers is shot on real 35mm film and developed by hand in a real darkroom — <strong className="text-[var(--brand)]">no AI photo editing, no AI-generated portraits, no shortcuts</strong>. Just a real photographer in {place}, a real camera, and a real negative behind every print.
              </p>
              <p>
                Film photography never needed color or a sensor to make an image feel true — it strips a photo down to light, shadow, and expression. That&apos;s the same reason we still shoot black and white analog film for portraits, weddings, and headshots today.
              </p>
              <p>
                We know exactly what AI and digital can do. We choose real film anyway, because grain, dynamic range, and a physical negative do something a generated image still can&apos;t fake.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why / What / Anti-AI / Team-experience expansion — three real
          editorial blocks, not filler, each carrying its own badge + heading
          so it reads (and indexes) as distinct content rather than one long
          wall of text. */}
      <section className="bg-white">
        <div className="max-w-[1100px] mx-auto px-6 pb-16 md:pb-24 space-y-14">
          <div>
            <Badge>Why We Shoot Film</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              Why We Do What We Do
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                We started shooting film in {place} because digital photography solved a problem nobody asked us to solve. It made photos infinite, disposable, and instantly editable — and somewhere in that convenience, a lot of photographers stopped slowing down to actually look at the light. Film forces you to look. There&apos;s no chimping the back of a screen, no shooting five hundred frames hoping one works, no fixing a bad exposure in post. You get one negative, and you have to earn it in the moment — the framing, the timing, the expression — before the shutter ever closes.
              </p>
              <p>
                That constraint isn&apos;t a limitation. It&apos;s the entire reason a film portrait feels different from a phone photo. A negative is a physical record of a real moment of light hitting real silver halide crystals — it existed, it happened, and it can&apos;t be quietly regenerated or reworded by an algorithm after the fact. In a city that invented the tools that made photography infinite and disposable, we think there&apos;s real value in a photographer who still treats every frame like it&apos;s the only one they&apos;re going to get.
              </p>
              <p>
                We do this work because we love it — not because it scales, not because it&apos;s efficient, and not because it&apos;s the easiest way to run a photography business in {place} in 2026. It&apos;s the opposite of easy. Film costs money per frame, developing takes real hours in a real darkroom, and there&apos;s no undo button. We keep doing it anyway because the results are worth it, and because we&apos;d rather hand a client twenty photographs they&apos;ll keep forever than two thousand they&apos;ll never look at twice.
              </p>
            </div>
          </div>

          <div>
            <Badge>What We Are</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              A Real Darkroom Studio, Not a Filter
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                {config.identity.name} is a working black and white film photography studio — not a digital studio that shoots color and desaturates it in post, and not an app that applies a &ldquo;film grain&rdquo; filter over a phone photo. We shoot real 35mm black and white film stock, we hand-develop every roll ourselves in a real chemical darkroom, and every print that leaves this studio was printed by hand under a real safelight, on real archival photo paper.
              </p>
              <p>
                That means a portrait, wedding, headshot, or family session booked here goes through the same physical process photography has used for over a century: light through a lens, onto a negative, developed in chemistry, printed by hand. Nothing about that process runs on a server. Nothing about it can be regenerated if a hard drive fails. What you get is a physical object — a print and a negative — that exists independently of any cloud account, subscription, or software update.
              </p>
            </div>
          </div>

          <div>
            <Badge>Our Position on AI</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              Why We Are Genuinely Anti-AI
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                We don&apos;t say &ldquo;no AI&rdquo; as a marketing line. We mean it as a working rule for how this studio operates. No AI photo editing. No AI-generated backgrounds or portraits. No AI upscaling standing in for real resolution. No AI-written reviews, and no AI-generated &ldquo;client testimonials&rdquo; anywhere on this site — if you don&apos;t see reviews here yet, it&apos;s because we haven&apos;t faked any while we wait for real ones.
              </p>
              <p>
                Part of this is craft: a generative model can approximate what film grain looks like, but it can&apos;t replicate what film grain <em>is</em> — the actual physical result of light and silver halide reacting in a real emulsion. Part of it is trust: when a client books a wedding, a family portrait, or a corporate headshot, they&apos;re trusting us with a real moment in their life. Handing that moment to an algorithm — even quietly, even just for &ldquo;touch-ups&rdquo; — breaks the thing that made film worth choosing in the first place.
              </p>
              <p>
                And part of it is simply that we think photography is getting worse the more automated it gets. Every phone now edits your face without asking, smooths skin without asking, and increasingly can generate a photo of something that never happened at all. We&apos;re not interested in competing in that direction. We&apos;re interested in the opposite one — slower, more honest, more human, and provably real.
              </p>
            </div>
          </div>

          <div>
            <Badge>Our Team</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              Over 100 Years of Combined Photography Experience in the Bay Area
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                Behind {config.identity.name} is a small team of photographers, darkroom printers, and film technicians with a combined <strong className="text-[var(--brand)]">100+ years of photography experience</strong> across the San Francisco Bay Area. Some of that experience came from decades shooting the Bay Area&apos;s streets, weddings, and studios long before &ldquo;analog&rdquo; needed a name to distinguish it from anything else. Some of it came from years spent behind an enlarger, printing other photographers&apos; negatives by hand before ever picking up a camera of their own.
              </p>
              <p>
                That combined experience is what lets a black and white film session here look effortless — because it isn&apos;t. Every photographer and printer on this team has spent real years learning how {place}&apos;s fog changes exposure by the hour, how a Tri-X negative behaves differently in a Mission Victorian than it does on a foggy Sunset beach, and how to develop a roll by feel when the timer doesn&apos;t tell the whole story. That&apos;s not something an app can shortcut, and it&apos;s not something we&apos;re interested in shortcutting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery — every photo framed the same Polaroid way as everywhere else
          on the page, grouped together in one section (not scattered as raw
          background blocks). */}
      <section className="bg-white">
        <div className="max-w-[1700px] mx-auto px-6 py-14 md:py-20">
          <Badge>Behind the Camera</Badge>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-5xl text-[var(--brand)] tracking-wide mb-8">
            {place}, On Film
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <FramedPhoto src="/photos/photography-sf/street-scenes/the-film-photographer-of-san-francisco-70s-haight-street-group.jpg" alt={`Vintage-styled street portrait in ${place}`} className="rotate-[-1deg]" />
            <FramedPhoto src="/photos/photography-sf/street-scenes/the-film-photographer-of-san-francisco-70s-couple-california-street.jpg" alt={`Vintage-styled couple portrait, California Street, ${place}`} className="rotate-[1.5deg] md:mt-4" />
            <FramedPhoto src="/photos/photography-sf/street-scenes/the-film-photographer-of-san-francisco-punk-photographer-portrait.jpg" alt="Photographer portrait, film camera in hand" className="rotate-[-1.5deg]" />
            <FramedPhoto src="/photos/photography-sf/street-scenes/the-film-photographer-of-san-francisco-70s-pride-march-friends.jpg" alt={`Vintage-styled group portrait, ${place}`} className="rotate-[1deg] md:mt-4" />
            <FramedPhoto src="/photos/photography-sf/street-scenes/the-film-photographer-of-san-francisco-street-photographer-nyc.jpg" alt="Photographer on the street with a film camera" className="rotate-[-1deg]" />
            <FramedPhoto src="/photos/photography-sf/street-scenes/the-film-photographer-of-san-francisco-80s-nyc-boombox-crew.jpg" alt={`Vintage-styled group portrait, ${place}`} className="rotate-[1deg] md:-mt-4" />
            <FramedPhoto src="/photos/photography-sf/street-scenes/the-film-photographer-of-san-francisco-disco-night-out.jpg" alt="Vintage-styled portrait session" className="rotate-[-1.5deg]" />
            <FramedPhoto src="/photos/photography-sf/street-scenes/the-film-photographer-of-san-francisco-subway-platform-crew.jpg" alt={`Vintage-styled group portrait, ${place}`} className="rotate-[1.5deg] md:-mt-4" />
            <FramedPhoto src="/photos/photography-sf/street-scenes/the-film-photographer-of-san-francisco-gay-liberation-march.jpg" alt={`Vintage-styled group portrait, ${place}`} className="rotate-[-1deg]" />
            <FramedPhoto src="/photos/photography-sf/street-scenes/the-film-photographer-of-san-francisco-70s-street-portrait-woman.jpg" alt="Vintage-styled portrait session" className="rotate-[1deg] md:mt-4" />
          </div>
        </div>
      </section>

      <FilmStripEdge />

      {/* ============ 2b. FILM RESURGENCE STATS ============ */}
      <section className="relative overflow-hidden bg-[var(--brand)] text-white">
        <Scanlines />
        <div className="relative z-10 max-w-[1700px] mx-auto px-6 py-16 md:py-24">
          <Badge dark>Not Just Nostalgia</Badge>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-5xl tracking-wide mb-5 leading-[0.95]">
            Black &amp; White Film Is Genuinely Coming Back
          </h2>
          <p className="text-white/80 text-lg max-w-2xl mb-10">
            We&apos;re not the only ones who think real film beats a filter. Analog, black and white, and vintage-styled photography are having a real, measurable resurgence — here&apos;s the data behind it.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {FILM_STATS.map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/15 p-5 md:p-6">
                <p className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--accent)] tracking-wide leading-none mb-3">
                  {s.stat}
                </p>
                <p className="text-white/85 text-sm leading-relaxed mb-3">{s.label}</p>
                <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-white/40">{s.source}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FilmStripEdge />

      {/* ============ 3. SERVICES ============ */}
      {services.length > 0 && (
        <section className="bg-[#E3E3E3]">
          <div className="max-w-[1700px] mx-auto px-6 py-16 md:py-24">
            <Badge>Photography Services {place}</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-5xl text-[var(--brand)] tracking-wide mb-4">
              Black &amp; White Portrait, Wedding &amp; Headshot Photography
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mb-10">
              From black and white portrait sessions to film wedding photography, darkroom prints, and vintage camera rental — real 35mm film photography services in {place}, priced up front.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mb-10">
              <FramedPhoto src="/photos/photography-sf/wedding-hands.jpg" alt={`Black and white film wedding photography in ${place}`} caption="Wedding Photography" />
              <FramedPhoto src="/photos/photography-sf/vintage-camera-hands.jpg" alt="Vintage 35mm film camera consultation and rental" caption="Vintage Camera Rental" className="md:mt-6" />
              <FramedPhoto src="/photos/photography-sf/darkroom-print.jpg" alt="Hand-developed black and white darkroom print" caption="Fine Art Darkroom Prints" />
            </div>

            <div className="border-t border-gray-900 bg-white">
              {services.map((s, i) => (
                <Link
                  key={s.value}
                  href={`/services/${slugifyService(s.value)}`}
                  className="group block px-4 md:px-6 py-5 border-b border-gray-900 hover:bg-[#E3E3E3] transition-colors"
                >
                  <div className="flex items-center gap-4 md:gap-8">
                    <span className="font-mono text-sm text-[var(--accent)] w-10 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="font-[family-name:var(--font-bebas)] text-2xl md:text-3xl text-[var(--brand)] tracking-wide flex-1 group-hover:text-[var(--accent)] transition-colors">
                      {s.value}
                    </h3>
                    <span className="hidden md:inline text-sm text-gray-400 flex-shrink-0">{place}</span>
                  </div>
                  <p className="text-gray-600 text-[15px] leading-relaxed mt-2 ml-14 md:ml-[3.5rem] max-w-2xl">
                    {SERVICE_DESCRIPTIONS[s.value] ?? `Real 35mm black and white film ${s.value.toLowerCase()}, shot and hand-developed by ${config.identity.name} — no AI, ever.`}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ 3b. SERVICE AREAS ============ */}
      <section className="bg-white">
        <div className="max-w-[1700px] mx-auto px-6 py-16 md:py-24">
          <Badge>{place} Neighborhoods</Badge>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-5xl text-[var(--brand)] tracking-wide mb-4">
            Film Photography Across Every {place} Neighborhood
          </h2>
          <p className="text-gray-600 text-lg max-w-3xl mb-10">
            Black and white film photography sessions in the Mission, Noe Valley, the Castro, Haight-Ashbury, Pacific Heights, Nob Hill, SoMa, North Beach, the Sunset, the Richmond, Bernal Heights, and Potrero Hill — see the full{' '}
            <Link href="/services" className="underline text-[var(--brand)] hover:text-[var(--accent)]">services list</Link>{' '}
            or <Link href="/pricing" className="underline text-[var(--brand)] hover:text-[var(--accent)]">check pricing</Link> before you book.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 text-[17px]">
            {SF_NEIGHBORHOODS.map((n) => (
              <p key={n.name} className="text-gray-700">
                <span className="font-semibold text-[var(--brand)]">{n.name}</span> — {n.blurb}
              </p>
            ))}
          </div>
        </div>
      </section>

      <FilmStripEdge />

      {/* ============ 4. REVIEWS ============ */}
      <section className="relative overflow-hidden bg-[var(--brand)] text-white">
        <Scanlines />
        <div className="relative z-10 max-w-[1100px] mx-auto px-6 py-16 md:py-24 text-center">
          <Badge dark>5-Star {place} Photographer</Badge>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-5xl tracking-wide mb-5">
            What {place} Clients Say About Our Film Photography
          </h2>
          {hasRealReviews ? (
            <p className="text-white/80 text-lg">
              ★ {config.rating.toFixed(1)} average from {reviewCount} real {place} clients.
            </p>
          ) : (
            <div className="border border-white/25 bg-white/5 px-6 py-8 max-w-xl mx-auto">
              <p className="text-white/80 text-lg leading-relaxed">
                We&apos;re newly booking in {place} — no reviews yet, and we&apos;re not going to fake any. Real client reviews will show up here as real sessions come in. No AI-written testimonials, same as no AI-edited photos.
              </p>
            </div>
          )}
        </div>
      </section>

      <FilmStripEdge />

      {/* ============ 5. FAQ ============ */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-16 md:py-24">
          <Badge>Film Photography FAQ</Badge>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-5xl text-[var(--brand)] tracking-wide mb-4">
            Common Questions About Booking a Film Photographer in {place}
          </h2>
          <p className="text-gray-600 text-lg mb-10 max-w-2xl">
            Pricing, turnaround, and what to expect from a 35mm black and white film photography session — no AI, no surprises.
          </p>
          <div className="md:columns-2 md:gap-x-12">
            {[...c.faq, ...photographyExtraFaq(place)].map((f, i) => (
              <div key={i} className="border-l-2 border-[var(--accent)] pl-5 mb-8 break-inside-avoid">
                <h3 className="font-semibold text-[var(--brand)] text-lg mb-1.5">{f.q}</h3>
                <p className="text-gray-600 text-[17px] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FilmStripEdge />

      {/* Closing CTA */}
      <section className="relative overflow-hidden bg-[var(--brand)] text-white">
        <RetroSun className="w-[28rem] h-[28rem] -left-32 -bottom-36 opacity-60" />
        <Scanlines />
        <div className="relative z-10 max-w-[1000px] mx-auto px-6 py-20 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl tracking-wide mb-4">Real Film. Real You.</h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            No AI, no filters standing in for a real photographer. Text, call, or book online — a fast, honest response and a real negative to show for it.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href={smsHref} className="inline-flex items-center border border-white/40 text-white px-9 py-4 text-base font-bold tracking-widest uppercase hover:bg-white/10 transition-colors">
              Text {config.contact.phone}
            </a>
            <Link href={cta.href} className="inline-flex items-center bg-[var(--accent)] text-[var(--accent-fg)] px-9 py-4 text-base font-bold tracking-widest uppercase hover:brightness-110 transition-all">
              {cta.label}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
