'use client'

import Link from 'next/link'

const VIDEOS = [
  { src: '/videos/review-1.mp4' },
  { src: '/videos/review-2.mp4' },
  { src: '/videos/review-3.mp4' },
]

export default function VideoReviews({ autoPlay = false }: { autoPlay?: boolean }) {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase text-center mb-3">Real Clients, Real Homes, Real Results</p>
        <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide text-center mb-4">
          Watch What Our NYC Cleaning Clients Have to Say
        </h2>
        <p className="text-gray-500 text-center max-w-2xl mx-auto mb-10 leading-relaxed">
          Anyone can write a five-star review &mdash; but you can&rsquo;t fake a video. These are real New York City clients sharing their honest experience with our <Link href="/services/weekly-maid-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">maid service</Link> and <Link href="/services/deep-cleaning-service-in-nyc" className="text-[#1E2A4A] underline underline-offset-2">deep cleaning</Link> in their own words, in their own homes. Want to see more? Read all of our{' '}
          <Link href="/reviews" className="text-[#1E2A4A] underline underline-offset-2">verified client reviews</Link>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VIDEOS.map((v, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-black shadow-lg aspect-[9/16] max-h-[500px]">
              <video
                src={v.src}
                controls
                preload={autoPlay ? 'auto' : 'metadata'}
                playsInline
                autoPlay={autoPlay}
                muted={autoPlay}
                loop={autoPlay}
                className="w-full h-full object-contain"
              />
            </div>
          ))}
        </div>
        <p className="text-center mt-8">
          <Link href="/reviews" className="inline-block bg-[#1E2A4A] text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-widest uppercase hover:bg-[#243352] transition-colors">
            Read All Reviews
          </Link>
        </p>
      </div>
    </section>
  )
}
