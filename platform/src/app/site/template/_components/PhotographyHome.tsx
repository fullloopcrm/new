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
        : { label: 'Book Your Service', href: '/book/new' }

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
              Real film, real darkroom, real photographer — <strong className="text-white">no AI, ever</strong>. Black and white portrait, wedding, corporate headshot, and black-and-white corporate photography shot on 35mm film in {place}. Every session is shot on real Kodak or Ilford film stock, hand-developed in a real chemical darkroom, and hand-printed by a real person under a real safelight — no algorithm, no AI upscaling, and no generated &ldquo;film look&rdquo; filter anywhere in the process, ever.
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
                {config.identity.name} is a working black and white film photography studio — not a digital studio that shoots color and desaturates it in post, and not an app that applies a &ldquo;film grain&rdquo; filter over a phone photo. We shoot real 35mm black and white film stock, we hand-develop every roll ourselves in a real chemical darkroom, and every print that leaves this studio was printed by hand under a real safelight, on real archival photo paper. Every part of that description is checkable — the camera, the film, the chemistry, the paper, the darkroom itself — because none of it is a claim about vibe or aesthetic. It&apos;s a description of an actual physical process a real print goes through before it ever reaches you.
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
              <p>
                We&apos;re a small team on purpose. A darkroom studio doesn&apos;t scale the way a digital operation does — there&apos;s only one enlarger running at a time, only one person&apos;s hands on a print at once — and we&apos;d rather stay small and good than grow past the point where every print still gets real attention. If you book with {config.identity.name}, a real person who has spent years learning this craft is the one handling your film, start to finish, not a rotating roster of contractors and not an algorithm queue.
              </p>
            </div>
          </div>

          <div>
            <Badge>A Note From Behind the Camera</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              Why This Studio Exists At All
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                Every few years, someone predicts film photography is finally, truly dead. It hasn&apos;t happened yet, and we don&apos;t think it will — not because of nostalgia, but because film solves a problem digital and AI photography created rather than fixed. When every photo can be taken infinitely, edited infinitely, and now generated from nothing at all, the thing that actually feels valuable is the opposite: an image that can only exist once, made by a real person, at a real moment, that cannot be quietly regenerated after the fact.
              </p>
              <p>
                We opened {config.identity.name} in {place} because this city has always had a strange, specific relationship with photography — it&apos;s the place that helped build the tools that made photography automatic and disposable, and it&apos;s also a place with a long, stubborn tradition of photographers who slowed down anyway. We wanted to be part of that second tradition, not the first.
              </p>
              <p>
                That&apos;s not an argument against technology in general — it&apos;s a specific argument about what a photograph is supposed to be. A photograph is supposed to be evidence that something happened. The moment a camera (or worse, a text prompt) can generate a photograph of something that never happened, that evidence stops meaning anything. We think that matters more now than it ever has, and we built this studio around protecting it, one roll of film at a time.
              </p>
            </div>
          </div>

          <div>
            <Badge>How a Session Actually Works</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              From Booking to Print: The Real Process
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                <strong className="text-[var(--brand)]">1. You reach out.</strong> Text <a href={smsHref} className="underline hover:text-[var(--brand)]">{config.contact.phone}</a>, call, or book online and tell us what you need — a portrait, a wedding, a headshot batch for your team, a landscape print for your wall. We ask a few real questions so the quote and the plan are accurate, not a guess.
              </p>
              <p>
                <strong className="text-[var(--brand)]">2. We plan around the light.</strong> {place}&apos;s fog and light change fast and unevenly across neighborhoods — a golden-hour session in the Presidio behaves nothing like the same hour in the Mission. We pick timing, location, and film stock based on what the session actually needs, not a fixed template.
              </p>
              <p>
                <strong className="text-[var(--brand)]">3. We shoot on real film.</strong> No chimping the back of a screen after every frame, no burning five hundred shots hoping one works. Every frame on a roll of 35mm is composed with intent, because film doesn&apos;t give you a free retake.
              </p>
              <p>
                <strong className="text-[var(--brand)]">4. Your roll goes into the darkroom.</strong> Development is a hand process — a timed developer bath, a stop bath, a fixer, then a wash — done by feel as much as by the clock, because every roll behaves slightly differently depending on the light it was exposed to that day.
              </p>
              <p>
                <strong className="text-[var(--brand)]">5. We print by hand, under a real safelight.</strong> Once negatives are dry, selected frames go under a real enlarger. Dodging and burning is done with hands and cardboard cutouts, not a slider — the same way it&apos;s been done for over a century, because it still produces something a screen can&apos;t.
              </p>
              <p>
                <strong className="text-[var(--brand)]">6. You get a real object.</strong> Darkroom prints are typically ready in 5-7 business days. If you added the Digital Scans Add-On, high-resolution scans of your negatives usually land in your inbox in 2-3 business days — useful for sharing online while the physical prints are still being made by hand.
              </p>
            </div>
          </div>

          <div>
            <Badge>Film Stock &amp; Gear</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              What We Actually Shoot With
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                Most sessions here are shot on <strong className="text-[var(--brand)]">Kodak Tri-X 400</strong>, the black and white stock that&apos;s defined the look of street and documentary photography for over sixty years — real grain structure, a wide tonal range, and a way of handling {place}&apos;s fog and shifting light that a digital sensor simply renders differently. For sessions that call for a slightly cleaner, finer-grain look, we shoot <strong className="text-[var(--brand)]">Ilford HP5</strong> instead, and we&apos;ll tell you honestly which stock fits your specific session rather than defaulting to one for every job.
              </p>
              <p>
                Camera bodies vary by session type. Portrait and headshot work is often shot on medium-format bodies — the larger negative holds more real detail and a more forgiving tonal range for a face than 35mm can. Street, documentary, and location work leans on 35mm rangefinders and SLRs for speed and discretion, since a smaller, quieter camera lets a photographer stay close to a real moment without the subject performing for a big lens pointed at them.
              </p>
              <p>
                Every body in rotation is a real, mechanically serviced film camera — not a digital camera with a film-look preset, and not a phone. If you book the Vintage Camera Consultation &amp; Rental service, you&apos;re getting the same caliber of working gear we use on paid sessions, with real guidance on how to load, meter, and shoot it.
              </p>
            </div>
          </div>

          <div>
            <Badge>Inside the Darkroom</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              What &ldquo;Hand-Printed&rdquo; Actually Means
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                &ldquo;Hand-printed&rdquo; isn&apos;t a marketing word here — it describes an actual physical process. A dried negative goes into an enlarger, which projects it onto a sheet of light-sensitive photo paper under a red safelight (the only light black and white paper doesn&apos;t react to). The exposure time, the contrast filter, and any dodging or burning — holding back light from one part of the print, adding extra light to another — is judged and executed by hand, print by print, based on what that specific negative needs.
              </p>
              <p>
                The exposed paper then goes through the same three-bath chemistry as the film itself: a developer to bring out the image, a stop bath to halt development, and a fixer to make the image permanent and light-stable. After a thorough wash to clear residual chemistry — critical for archival longevity — the print is dried and, for fine art and gallery-quality work, mounted on <strong className="text-[var(--brand)]">archival fiber-based paper</strong> rated to last well over a century without fading or yellowing.
              </p>
              <p>
                None of this can be batch-automated the way a digital export can. A darkroom printer working on ten portraits from the same session will still make ten individual exposure and dodge/burn decisions, because no two negatives — even from the same roll, same light — print identically. That&apos;s slower than clicking export. It&apos;s also why a real darkroom print has a depth and tonal range a digital or inkjet print, however good, still can&apos;t fully replicate.
              </p>
            </div>
          </div>

          <div>
            <Badge>Who Books Us</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              The Kind of Clients We Work With
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                <strong className="text-[var(--brand)]">Individuals</strong> booking a portrait or headshot who are tired of AI headshot generators and want a photo that actually looks like them — asymmetries, real expression, and all. <strong className="text-[var(--brand)]">Couples</strong> who want engagement or wedding photography that won&apos;t look dated to a filter trend in five years. <strong className="text-[var(--brand)]">Families</strong> who want one real print worth framing instead of another folder of digital photos nobody prints.
              </p>
              <p>
                <strong className="text-[var(--brand)]">{place} startups and small businesses</strong> that need a team headshot page which actually looks like a real company, not ten mismatched selfies and a couple of AI-generated avatars. <strong className="text-[var(--brand)]">Designers, architects, and hospitality businesses</strong> looking for genuine black and white fine art prints of the city — for a lobby, an office, a restaurant — instead of a stock photo everyone else in town already has on their wall.
              </p>
              <p>
                And a growing number of people who simply want to work with a photographer who isn&apos;t going to hand any part of the job to an algorithm. If that&apos;s you, you&apos;re exactly who this studio was built for.
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
          <p className="text-white/70 text-[15px] max-w-3xl mb-10 leading-relaxed">
            None of these numbers are secondhand blog claims — each figure below traces back to reporting from Fortune, Kodak&apos;s own quarterly investor results, PetaPixel, or Ilford Photo&apos;s own published survey data. We left out a couple of more dramatic-sounding statistics that were floating around because we couldn&apos;t verify them against a real primary source, and we&apos;d rather show you four honest numbers than ten unverifiable ones. That&apos;s the same standard we hold the photography itself to.
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

      {/* ============ 3a-extra. GUIDE + WEDDINGS + PRINTS + STARTUPS + SHOP TEASER ============ */}
      <section className="bg-white">
        <div className="max-w-[1100px] mx-auto px-6 py-16 md:py-24 space-y-14">
          <div>
            <Badge>Not Sure Which Session You Need?</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              A Quick Guide to Choosing the Right Session
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                If you want <strong className="text-[var(--brand)]">a photo of yourself</strong> for a personal project, a gift, or just because it&apos;s time — the Black &amp; White Portrait Session is the default choice. If that photo needs to work specifically for LinkedIn, a company site, or a professional bio, the Black &amp; White Headshot Session is built for exactly that, individually or for a whole team at once.
              </p>
              <p>
                If you&apos;re <strong className="text-[var(--brand)]">photographing a relationship</strong> — engaged or not — the Couples &amp; Engagement Session is the right fit, and doubles as a genuine test run if you&apos;re also considering us for a wedding. Full black and white film Wedding Photography is its own dedicated service with its own scope, pricing, and full-day coverage.
              </p>
              <p>
                If you want <strong className="text-[var(--brand)]">a group</strong> — parents, kids, grandparents, any combination — the Family Portrait Session is built around real group dynamics, not a stiff studio lineup. Seniors specifically have their own Senior Portrait Session, built for that particular moment.
              </p>
              <p>
                If what you actually want is <strong className="text-[var(--brand)]">art for a wall</strong> rather than a portrait of people, Black &amp; White Landscape Photography and Fine Art Darkroom Prints cover that — either a custom shoot of a {place} location you love, or a print from an existing negative. And if you want the experience of shooting film yourself rather than being photographed, the Vintage Camera Consultation &amp; Rental service hands you real, working gear and real guidance.
              </p>
            </div>
          </div>

          <div>
            <Badge>Weddings</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              A Wedding Day Shot Entirely on Real Film
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                A wedding only happens once, which is exactly why we think it&apos;s the last place an AI batch-editing pass or an algorithm-smoothed skin filter belongs. Full-day black and white film wedding coverage here means a real photographer shooting real film through the entire day — getting ready, ceremony, reception — with every roll developed and printed by hand afterward, the same process used for every other session, just extended across a full day.
              </p>
              <p>
                Film changes the rhythm of a wedding day in a way most couples notice and appreciate once they experience it: no photographer hovering behind a screen checking shots, no interruption to re-shoot something that didn&apos;t look right on a preview. Just a photographer staying present in the room, trusting the camera, and letting the day unfold in front of it. What comes back afterward is a real, physical record of the day — negatives that will outlast every phone, cloud account, and hard drive that photographs from the same weekend, taken on someone&apos;s phone, will eventually be lost to.
              </p>
            </div>
          </div>

          <div>
            <Badge>{place} Startups &amp; Small Businesses</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              Real Team Headshots for a City Full of AI-Generated Ones
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                {place} has more startups per capita than almost anywhere else in the country, and most of them eventually assemble a team page out of whatever headshots people happened to already have — different lighting, different backgrounds, different quality, sometimes an AI-generated avatar sitting right next to a real photo. It reads as exactly what it is: unplanned.
              </p>
              <p>
                One real session fixes that permanently, not just until the next redesign. We schedule a full team back-to-back in a single sitting, one consistent lighting setup, one consistent black and white tone across everyone — the difference between a team page that looks assembled and one that looks like a real company that took its own presentation seriously.
              </p>
            </div>
          </div>

          <div>
            <Badge>Print Sizes &amp; Framing</Badge>
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
              What Your Print Actually Looks Like When It Arrives
            </h2>
            <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
              <p>
                Standard darkroom prints run from 5x7 up to 16x20, hand-printed on archival photo paper, with custom sizing available on request for a specific frame or wall space. Every print is a genuine silver gelatin print — light through a negative, exposed onto real photographic paper, developed in real chemistry — not an inkjet reproduction of a scanned negative.
              </p>
              <p>
                Prints ship unframed by default so you can choose framing that fits your own space, though we&apos;re happy to point you toward acid-free matting and UV-filtering glass if you want the print to hold its tonal range for decades rather than just years. See our <Link href="/shop" className="underline text-[var(--brand)] hover:text-[var(--accent)]">print shop</Link> for ready-to-order fine art prints of {place}, or book a custom session if you want a specific view or subject shot just for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FilmStripEdge />

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 text-[17px] mb-14">
            {SF_NEIGHBORHOODS.map((n) => (
              <p key={n.name} className="text-gray-700">
                <span className="font-semibold text-[var(--brand)]">{n.name}</span> — {n.blurb}
              </p>
            ))}
          </div>

          <div className="max-w-[1100px] space-y-14">
            <div>
              <Badge>{place}&apos;s Photographic History</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Why {place} Is Still One of the Best Places in the World to Shoot Film
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  The Bay Area has a genuinely deep photographic lineage that predates every filter app by decades. Ansel Adams learned and taught photography here, and the tradition he helped build — patient, technical, deeply attentive to real light — is baked into how a lot of local photographers still think about the craft, whether or not they shoot landscapes for a living. That same city later became the backdrop for some of the most-photographed street culture in American history, from the Haight&apos;s counterculture years to the Castro&apos;s pride marches to the Mission&apos;s ongoing mural scene. All of it happened in front of real cameras loaded with real film, because that was the only kind of camera there was.
                </p>
                <p>
                  What makes {place} unusual today is that it&apos;s simultaneously the city that helped build the technology that made photography automatic, disposable, and now generative — and a city that still has an active, working analog photography community: labs, darkrooms, camera shops, and photographers who never stopped shooting film even when it was unfashionable to admit it. We think that tension is part of what makes shooting here interesting. This is a city built on cameras, in every sense of the word, and we like being one of the studios still doing it the way it&apos;s always actually been done.
                </p>
                <p>
                  There&apos;s also a practical reason {place} is genuinely excellent for black and white film specifically: the light. Marine fog rolling through in the morning and evening softens and diffuses direct sun in a way few American cities experience daily, which is exactly the kind of even, wide-range light black and white film handles best. Add in the hard architectural lines of the city&apos;s Victorians, its hills, and its bridges, and you get a place custom-built for high-contrast, high-character black and white work — not by accident, but because the fog and the architecture are doing real work for the photographer before the shutter ever opens.
                </p>
              </div>
            </div>

            <div>
              <Badge>An Honest Comparison</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Film vs. Digital vs. AI — What You&apos;re Actually Choosing Between
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  <strong className="text-[var(--brand)]">Digital photography</strong> is faster, cheaper per frame, and gives you an instant preview — genuinely useful tradeoffs for a lot of work. What it doesn&apos;t give you is a physical negative, and it makes &ldquo;just fix it later&rdquo; a real temptation at every stage, from a slightly missed exposure to a face someone doesn&apos;t love. A digital photo is also infinitely editable after the fact, by anyone with the file, forever — which is convenient right up until it isn&apos;t.
                </p>
                <p>
                  <strong className="text-[var(--brand)]">AI-generated or AI-edited photography</strong> goes a step further than digital editing — it doesn&apos;t just adjust a real photo, it can invent detail, faces, or entire scenes that were never actually in front of a lens. An AI headshot generator doesn&apos;t photograph you; it produces a statistically plausible image of a generic face wearing your general likeness. We think that&apos;s a fundamentally different product from a photograph, and we don&apos;t think it should be sold as one.
                </p>
                <p>
                  <strong className="text-[var(--brand)]">Film photography</strong>, the way we shoot it, is slower and more expensive per frame, and there&apos;s no instant preview to check on-site. In exchange, you get something the other two options structurally can&apos;t provide: a physical negative that is direct, unbroken physical evidence a real moment of light hit real silver halide crystals in a real camera. It can be reprinted identically in twenty years. It can&apos;t be quietly regenerated, upscaled, or reworded by a future model update. That tradeoff — slower and pricier for something structurally more real — is the entire premise this studio is built on, and we think it&apos;s worth it.
                </p>
              </div>
            </div>

            <div>
              <Badge>Archival Value</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                What Happens to Your Negatives After the Session
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  Every roll we shoot for you is developed, and the resulting negatives are archived — sleeved, labeled by date and session, and stored properly so they don&apos;t degrade. That matters because a negative isn&apos;t just the source of the prints you order today; it&apos;s a permanent master file that can be reprinted, at any size, years or decades later, without ever needing to reshoot.
                </p>
                <p>
                  That&apos;s a meaningfully different relationship than the one most people have with their digital photos. A digital file lives on a device, in a cloud account, or in a backup service — all of which can fail, lapse, or simply get lost in a phone upgrade. A negative doesn&apos;t need a subscription, a password, or a working device to still exist. It just needs a dry, dark drawer, and it&apos;ll outlast most of the technology in this sentence.
                </p>
                <p>
                  If you ever want a reprint — a different size, an extra copy for a family member, a replacement for a print that got damaged — reach out and we can print from your existing negative without a new session. That&apos;s part of why we think of film photography less as a one-time purchase and more as creating a small physical archive that&apos;s genuinely yours.
                </p>
              </div>
            </div>

            <div>
              <Badge>Caring For Your Print</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                How to Make a Darkroom Print Last a Lifetime
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  A properly fixed and washed archival darkroom print, on fiber-based paper, is rated to resist fading and yellowing for well over a hundred years under normal conditions — but &ldquo;normal conditions&rdquo; still matters. Direct, prolonged sunlight is the biggest real threat to any photographic print, film or digital; a print hung out of direct sun, or behind UV-filtering glass if it&apos;s in a bright room, will hold its tonal range far longer than one baking in a south-facing window all day.
                </p>
                <p>
                  Humidity is the other real factor — a damp basement or an un-climate-controlled attic is a worse home for a print than a normal living space. If you&apos;re framing a print, acid-free matting and backing board keep the paper itself from slowly yellowing from contact with lower-quality materials over the decades, which is a small detail that makes a real difference on a multi-generational timeline.
                </p>
                <p>
                  None of this is complicated — it&apos;s the same basic care any physical photograph has always needed. The reward for that small amount of care is a print that genuinely can become a family object, handed down the way a grandparent&apos;s photographs get handed down, still legible and still real a hundred years from now.
                </p>
              </div>
            </div>

            <div>
              <Badge>Prints as Gifts</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Giving a Real Print Instead of Another Digital File
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  A gift certificate for a session, or a framed darkroom print of a favorite {place} view, are both genuinely common requests here — and for a reason worth saying out loud: almost everyone already has more digital photos than they know what to do with, and almost no one has enough real, physical ones. A hand-printed photograph is a rare kind of gift in 2026 specifically because it&apos;s not another file added to a pile that never gets opened again.
                </p>
                <p>
                  Gift certificates are available for any session type, and fine art prints from our existing {place} landscape work can be ordered directly, sized for framing, without booking a full session. Both are handled through a real conversation — text or call us, tell us who it&apos;s for and what occasion, and we&apos;ll help you land on the right session or print.
                </p>
              </div>
            </div>

            <div>
              <Badge>Booking Logistics</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Weather, Deposits, and What to Expect Before You Book
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  {place}&apos;s weather is genuinely part of the planning — fog, wind, and microclimates that shift block to block mean an outdoor session gets scheduled around real conditions, not a rigid slot picked weeks in advance with no flexibility. For weather that would ruin a shoot, we reschedule at no charge; a studio session, by contrast, is unaffected either way, which is worth knowing if your date can&apos;t move.
                </p>
                <p>
                  A deposit secures your date once you book, with the balance due at the session itself — exact terms are confirmed when you reach out, and self-booking online applies the standard $20 discount automatically, no code required. Most sessions run 60-90 minutes for individual work and up to a full day for wedding coverage; darkroom prints typically take 5-7 business days after the shoot, with digital scans (if added) usually landing in 2-3.
                </p>
              </div>
            </div>

            <div>
              <Badge>Common Misconceptions</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                What People Get Wrong About Film Photography
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  <strong className="text-[var(--brand)]">&ldquo;Film photography is basically dead / a novelty.&rdquo;</strong> The data says otherwise — see the resurgence numbers above. It&apos;s a small but genuinely growing market, driven largely by people under 35 who never shot film the first time around and are choosing it now specifically because it isn&apos;t digital or AI.
                </p>
                <p>
                  <strong className="text-[var(--brand)]">&ldquo;It&apos;s basically the same as an Instagram filter.&rdquo;</strong> A digital filter simulates the visual pattern of film grain, uniformly, across a whole image. Real film grain is physical — it comes from actual silver halide crystals reacting to actual light, and it varies naturally by exposure and development in ways a filter algorithm doesn&apos;t replicate, especially visible in shadow detail and highlight rolloff on a real print.
                </p>
                <p>
                  <strong className="text-[var(--brand)]">&ldquo;You can&apos;t retouch or improve a film photo at all.&rdquo;</strong> Not true — traditional darkroom retouching (dodging, burning, spotting) has existed for over a century. What we don&apos;t do is digital face-smoothing, feature reshaping, or generative AI editing. The retouching that does happen is done by hand, on the print, by a person who can explain exactly what they changed and why.
                </p>
                <p>
                  <strong className="text-[var(--brand)]">&ldquo;It must take forever and be really inconvenient.&rdquo;</strong> Booking, shooting, and communicating with us works exactly like any modern service business — text us, get a fast reply, book online. The only part that&apos;s intentionally slower is development and printing, because that part is a real physical process, not a rendering queue.
                </p>
              </div>
            </div>

            <div>
              <Badge>Visiting {place}</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Booking a Session If You&apos;re Just In Town
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  A real share of our clients aren&apos;t local — they&apos;re visiting {place} for a trip, a proposal, a work conference, or a wedding and want real photography to mark it, not another phone photo taken by a stranger on the street. If that&apos;s you, mention your travel dates when you reach out; we&apos;ll work around a tight visiting schedule and can usually confirm a session within a day or two of your trip if timing is flexible.
                </p>
                <p>
                  Because film development takes real time, out-of-town clients typically choose the Digital Scans Add-On alongside their darkroom prints, so you have shareable digital images before you leave, with the physical prints shipped to you once they&apos;re hand-printed. It&apos;s a small logistics adjustment, not a compromise on how the session itself is shot.
                </p>
              </div>
            </div>

            <div>
              <Badge>The Studio</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                A Real Working Darkroom, Not a Rented Backdrop
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  {config.identity.name} isn&apos;t a studio space rented by the hour with a printer that lives somewhere else — the darkroom is a working part of the studio itself, which is part of why turnaround stays consistent and why every print gets handled by someone who understands exactly how that day&apos;s light and film stock behaved during the shoot. Continuity between the shoot and the print is part of the craft, not an outsourced afterthought.
                </p>
                <p>
                  Studio sessions run with full lighting control, useful for headshots, teams, and portraits where consistency matters most. On-location sessions run anywhere across {place} and the greater Bay Area — see the neighborhood breakdown above, or tell us your specific spot when you book.
                </p>
              </div>
            </div>

            <div>
              <Badge>Pricing Philosophy</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Why We Price by the Hour, Flat, With No Hidden Fees
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  Every session here is billed at one flat, transparent hourly rate — no separate &ldquo;studio fee,&rdquo; no surprise processing charge, no vague &ldquo;package tiers&rdquo; designed to upsell you past what you actually need. The number you&apos;re quoted before booking is the number on the final invoice, because we think that&apos;s the bare minimum a service business owes a client, and it&apos;s surprising how many don&apos;t do it.
                </p>
                <p>
                  Film, chemistry, and hand-printing cost real, tangible money per frame in a way digital photography simply doesn&apos;t — that&apos;s the honest reason a film session costs more than a phone photo or an AI-generated one. We&apos;d rather explain that plainly up front than bury it in a confusing price sheet. See our full <Link href="/pricing" className="underline text-[var(--brand)] hover:text-[var(--accent)]">pricing page</Link> for exact rates by session type.
                </p>
              </div>
            </div>

            <div>
              <Badge>Print vs. Screen</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Why a Physical Print Still Beats a File on a Screen
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  A photo on a screen is lit from behind, viewed at whatever brightness a device happens to be set to, and gone the moment the screen turns off. A darkroom print is lit by the room around it — real, reflected light — and it&apos;s still there tomorrow, and in twenty years, whether or not the app that stored the digital version still exists. That&apos;s not a nostalgic point; it&apos;s a structural one about what actually survives.
                </p>
                <p>
                  There&apos;s also a real, physical difference in how a silver gelatin darkroom print handles black. A screen approximates black by turning pixels off or dimming a backlight — it&apos;s an illusion of darkness, bounded by the display&apos;s contrast ratio. A darkroom print&apos;s black comes from actual silver density in the paper itself, which is why a real print, held in the hand or hung on a wall, tends to look deeper and more three-dimensional than the same image ever looked on a phone.
                </p>
              </div>
            </div>

            <div>
              <Badge>Editorial &amp; Creative Work</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Album Art, Book Covers, and Editorial Photography
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  Musicians, authors, and small brands looking for genuine black and white film photography for album art, a book cover, or an editorial feature come through this studio regularly — usually after getting burned by a stock photo that looked identical to a hundred other releases, or an AI-generated image that reads as exactly that under any real scrutiny. Real film photography still carries a credibility a generated image doesn&apos;t, especially for creative work meant to represent an actual artist or story.
                </p>
                <p>
                  If you&apos;re booking for a commercial or creative project rather than a personal session, mention the intended use up front — licensing and usage terms for commercial work are confirmed before the shoot, not negotiated after the fact.
                </p>
              </div>
            </div>

            <div>
              <Badge>Image Rights &amp; Ownership</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Who Owns What After a Session
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  You own the physical prints and any digital scans you order — they&apos;re yours to keep, frame, share, and print elsewhere. We retain the negatives in our own archive, which is what lets us produce reprints for you later without a new session, but that arrangement doesn&apos;t limit what you can do with the images you&apos;ve been given.
                </p>
                <p>
                  For any commercial use — advertising, a book cover, a product — mention it when you book so usage terms are clear before the shoot rather than a source of confusion afterward. For personal sessions, this is rarely an issue; we bring it up mainly because we&apos;d rather over-communicate on ownership than leave it vague.
                </p>
              </div>
            </div>

            <div>
              <Badge>Studio vs. On-Location</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Choosing Between a Studio Setting and a Real {place} Location
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  A studio session gives full control over light and background — the right call when consistency matters most, like headshots or a formal portrait where nothing should compete for attention. An on-location session trades some of that control for real context: {place}&apos;s fog, its architecture, its actual streets, showing up in the frame as more than a backdrop.
                </p>
                <p>
                  Neither is objectively better — it depends entirely on what the photo is for. We&apos;ll tell you plainly which setting fits your specific session when you book, rather than defaulting to whichever is easier for us to schedule.
                </p>
              </div>
            </div>

            <div>
              <Badge>Session Comfort</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Accessibility and Making Sure You&apos;re Comfortable
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  If you have an accessibility need, a comfort concern, or anything that would make a session easier for you, tell us when you book — we&apos;d rather plan around it up front than have you discover a problem on the day. That applies just as much to first-time-in-front-of-a-camera nerves as it does to a physical accessibility need; either way, say something, and we&apos;ll work with it.
                </p>
                <p>
                  Camera-shy clients are genuinely the norm, not the exception. A few minutes of just talking, camera down, before we start shooting seriously almost always fixes it — that warm-up time is built into every session, not something you have to ask for separately.
                </p>
              </div>
            </div>

            <div>
              <Badge>A Brief History</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Black and White Film, From the 1800s to Right Now
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  Black and white was never a stylistic choice for most of photography&apos;s history — it was simply what a photograph was, for over a century, before color film became affordable and reliable enough for everyday use in the mid-1900s. Every defining image of the 20th century most people can picture — a war photograph, a family portrait from a grandparent&apos;s attic box, a street scene from a city that no longer looks anything like it did — was black and white, because that&apos;s what the medium was.
                </p>
                <p>
                  Color eventually became the default, and black and white became something photographers had to choose deliberately — which, strangely, is what gave it real staying power as an art form rather than a limitation. Once it stopped being the only option, black and white became the option photographers reach for specifically because it strips a scene down to light, shadow, form, and expression, with nothing else competing for attention.
                </p>
                <p>
                  Digital photography, and now AI-generated imagery, represent the next big shift — and we think black and white film is having a real moment again for the same underlying reason it always mattered: it forces honesty about light and composition that a color sensor, an editing slider, or a generative model can let a photographer skip. We&apos;re glad to be part of a studio still doing it the original way.
                </p>
              </div>
            </div>

            <div>
              <Badge>35mm vs. Medium Format</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Why We Choose Different Film Formats for Different Sessions
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  <strong className="text-[var(--brand)]">35mm film</strong> is smaller, faster to shoot, and better suited to movement — street photography, documentary-style coverage, a wedding day where the photographer needs to stay close to real moments as they happen without a bulky setup getting in the way. It holds up beautifully at typical print sizes and is the workhorse format for most of our session types.
                </p>
                <p>
                  <strong className="text-[var(--brand)]">Medium format film</strong> uses a physically larger negative, which captures meaningfully more real detail and a more forgiving tonal range — the difference becomes especially visible in a large fine art print or a formal portrait where skin tone gradation and fine texture matter. It&apos;s slower to shoot and typically used in more controlled settings, which is exactly why we lean on it for certain portrait and studio work.
                </p>
                <p>
                  Neither format is objectively better — they&apos;re different tools for different jobs, the same way a photographer would choose a different lens for a different shot. We pick the format that fits your specific session rather than defaulting to whichever is more convenient for us.
                </p>
              </div>
            </div>

            <div>
              <Badge>What Makes a Photo Good</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Our Actual Definition of a Good Photograph
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  A lot of modern photography optimizes for one thing: looking good on a small, backlit screen for about a second and a half before someone scrolls past it. That&apos;s a real skill, but it&apos;s not the one this studio is built around. We think a good photograph should hold up under real, sustained attention — printed large, hung on a wall, looked at closely for minutes instead of glanced at for a second.
                </p>
                <p>
                  That standard changes what actually matters in a session. It&apos;s less about a flattering angle optimized for a thumbnail and more about real expression, real light, and a composition that still says something the fifth time you look at it. Film, by its nature, tends to produce that kind of image, because every frame was composed with intent rather than captured in a burst and picked later.
                </p>
                <p>
                  We&apos;d rather hand a client twenty photographs that meet that bar than two thousand that don&apos;t — which is the same principle behind why we shoot film instead of digital in the first place.
                </p>
              </div>
            </div>

            <div>
              <Badge>How We Communicate</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Texting, Calling, and What to Expect From Us
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  Text <a href={smsHref} className="underline hover:text-[var(--brand)]">{config.contact.phone}</a> and a real person answers — not a chatbot, not an auto-reply queue, and not an AI assistant pretending to be a person. Booking, questions, changes to a session, all of it goes through the same real line. If a question is too small to bother a photography studio with, it isn&apos;t; ask it anyway.
                </p>
                <p>
                  We&apos;d rather tell you honestly that a service isn&apos;t the right fit for what you need than book you into the wrong session and disappoint you later. That&apos;s not a sales tactic — it&apos;s just a more honest way to run a small studio, and it&apos;s the same standard we hold the actual photography to.
                </p>
              </div>
            </div>

            <div>
              <Badge>Frequently Booked Together</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Combinations That Come Up Often
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  <strong className="text-[var(--brand)]">Engagement session + Wedding Photography</strong> — booking both with the same photographer gives a couple continuity across the two most photographed days of their relationship, and lets you see exactly how we shoot before the day you don&apos;t get a retake on.
                </p>
                <p>
                  <strong className="text-[var(--brand)]">Portrait Session + Digital Scans Add-On</strong> — most clients who need a photo for online use (a dating profile, a personal website, social media) pair the two, since darkroom prints alone don&apos;t give you a shareable digital file.
                </p>
                <p>
                  <strong className="text-[var(--brand)]">Landscape Photography + Fine Art Darkroom Prints</strong> — a custom landscape shoot followed by ordering additional print sizes from the same negative later, without a second session, is a common way clients build out a small print collection over time.
                </p>
                <p>
                  <strong className="text-[var(--brand)]">Vintage Camera Consultation &amp; Rental + a personal project</strong> — some clients rent gear specifically to shoot their own film project after a consultation teaches them the basics, rather than booking us for the session itself.
                </p>
              </div>
            </div>

            <div>
              <Badge>Corporate Photography, Beyond Headshots</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Black and White Photography for Brands and Workspaces
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  Beyond individual and team headshots, {config.identity.name} works with {place} companies on black and white corporate photography more broadly — office and workspace photography, founder and leadership portraits for press and investor decks, and event coverage for company milestones. The same standard applies across all of it: real film, real darkroom printing, no AI anywhere in the process.
                </p>
                <p>
                  For a company built on real product and real people, we think the photography representing it should be real too — not a set of AI-generated stock images that could belong to any company in the world. If that&apos;s the kind of photography your brand needs, reach out and describe the project; corporate work is scoped individually rather than forced into a fixed package.
                </p>
              </div>
            </div>

            <div>
              <Badge>The Environmental Cost of &ldquo;Free&rdquo; Photos</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Slower, On Purpose
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  Digital and AI photography feel free because the marginal cost of one more frame, or one more generated image, is nearly invisible — no film, no chemistry, no paper, just electricity and server time somewhere out of sight. That invisibility is part of why it&apos;s so easy to shoot five hundred frames of something that deserved five, or to generate a hundred variations of an image instead of committing to one real composition.
                </p>
                <p>
                  Film makes the real cost of a photograph visible again, frame by frame, which changes how a photographer — and a client — thinks about each one. We think that constraint produces better, more intentional work, and we&apos;re not interested in optimizing it away just because the technology to do so now exists.
                </p>
              </div>
            </div>

            <div>
              <Badge>After Your Session</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                What Happens Once You Have Your Prints
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  Once your prints and, if ordered, your digital scans arrive, the relationship doesn&apos;t just end there. Your negatives stay archived with us, so a reprint, a different size, or an extra copy for a family member is always just a text away — no new session required, no re-explaining what you shot or why. Many clients come back months or years later for exactly that.
                </p>
                <p>
                  A lot of clients also come back for a different session entirely — a portrait client returning for a family session once kids arrive, an engagement couple returning for their wedding, a headshot client returning when their team grows. We&apos;d rather earn that repeat relationship by doing honest, real work the first time than chase one-off bookings with a discount code.
                </p>
                <p>
                  And if a friend or colleague asks where you got a print or a portrait like that, we&apos;re always glad for the referral — the best advertising this studio has ever gotten has come from a real print on a real wall, not an ad.
                </p>
              </div>
            </div>

            <div>
              <Badge>One Last Thing</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                We&apos;re Not Anti-Technology. We&apos;re Pro-Real.
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  It would be easy to read everything above as a studio that&apos;s simply against progress, or nostalgic for its own sake. That&apos;s not quite it. We book online, we text, we run a modern service business by every normal measure. The line we draw is specific: the actual photograph — the light hitting the film, the print coming up in the developer, the negative that will still exist in fifty years — stays entirely real, entirely human, and entirely un-automated.
                </p>
                <p>
                  That&apos;s a deliberate, narrow choice, not a blanket rejection of anything modern. We think there&apos;s a real and growing group of people in {place} and beyond who want exactly that — a photograph they can trust is what it claims to be. If that&apos;s you, we&apos;d genuinely like to work with you. Text <a href={smsHref} className="underline hover:text-[var(--brand)]">{config.contact.phone}</a>, tell us what you need, and let&apos;s make something real.
                </p>
              </div>
            </div>

            <div>
              <Badge>Quality Control</Badge>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl md:text-4xl text-[var(--brand)] tracking-wide mb-5 leading-[0.95]">
                Why We Don&apos;t Rush Development, Even When We Could
              </h2>
              <div className="space-y-4 text-gray-600 text-[17px] leading-relaxed">
                <p>
                  It would be technically possible to speed up turnaround by batch-processing rolls with less individual attention, or by outsourcing printing to a high-volume lab rather than doing it by hand in-house. We don&apos;t, and it&apos;s worth explaining why: a rushed development bath can shift contrast unevenly across a roll, and a batch-printed image loses the individual dodge-and-burn attention that makes a print actually look right for that specific negative rather than approximately right.
                </p>
                <p>
                  Our stated turnaround — 5-7 business days for darkroom prints, 2-3 for digital scans — reflects how long the work actually takes done properly, not an artificially padded estimate. If you have a real deadline, tell us when you book; we&apos;ll always try to accommodate it, but we won&apos;t quietly cut a corner in the darkroom to hit a date without telling you first.
                </p>
                <p>
                  This is, in the end, the same principle behind everything else on this page: slower and more careful, on purpose, because the alternative produces a worse photograph — and we&apos;d rather lose a little convenience than compromise the one thing that actually matters here.
                </p>
              </div>
            </div>
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
              <p className="text-white/80 text-lg leading-relaxed mb-3">
                We&apos;re newly booking in {place} — no reviews yet, and we&apos;re not going to fake any. Real client reviews will show up here as real sessions come in. No AI-written testimonials, same as no AI-edited photos.
              </p>
              <p className="text-white/60 text-sm leading-relaxed">
                If that feels like a risk compared to a studio with a wall of five-star reviews already, we understand — but every one of those studios started here too, at zero, before their first real client left the first real review. We&apos;d rather ask you to be an early client on the strength of an honest process than pad this section with something we made up.
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
            Pricing, turnaround, and what to expect from a 35mm black and white film photography session — no AI, no surprises. If your question isn&apos;t answered below, text <a href={smsHref} className="underline hover:text-[var(--brand)]">{config.contact.phone}</a> directly and a real person will answer — there&apos;s no such thing as too small a question here, and asking costs you nothing before you book.
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
          <p className="text-white/50 text-sm mt-8 max-w-lg mx-auto leading-relaxed">
            {config.identity.name} — real black and white film photography in {place}. No AI photo editing. No AI-generated portraits. No AI-written reviews. Just a real photographer, a real darkroom, and a real negative behind every print.
          </p>
        </div>
      </section>
    </div>
  )
}
