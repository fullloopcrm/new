import type { Metadata } from 'next'
import Link from 'next/link'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'

export const metadata: Metadata = {
  title: 'NYC Wash and Fold Reviews — 5.0★ Google Rating, 16 Reviews | The NYC Wash and Fold Service Company',
  description: 'Read real Google reviews from The NYC Wash and Fold Service Company customers. 5.0★ rating with 16 five-star reviews. NYC wash & fold laundry service, $3/lb with free pickup & delivery. (917) 970-6002.',
  alternates: { canonical: 'https://www.washandfoldnyc.com/reviews' },
  openGraph: {
    title: 'The NYC Wash and Fold Service Company Reviews — 5.0★ Google Rating',
    description: 'Real reviews from real NYC customers. 5.0★ Google rating, 16 five-star reviews. $3/lb wash & fold with free pickup & delivery.',
    url: 'https://www.washandfoldnyc.com/reviews',
  },
}

const reviews = [
  { text: 'Best wash and fold in the city. My clothes come back perfectly folded every single time. The free pickup and delivery is what sold me — I literally never have to leave my apartment. I used to waste entire Saturdays at the laundromat hauling bags down four flights of stairs. Now I text them, leave a bag at my door, and it comes back clean and folded the next day. The price is fair, the quality is consistent, and the communication is excellent. Five stars, no hesitation.', name: 'Rachel Kim', location: 'Upper West Side, Manhattan', date: 'March 2026', rating: 5 },
  { text: 'Finally found a laundry service I can trust. They handle my delicates with care and everything smells amazing. The per-pound pricing is straightforward — no hidden fees. I have tried three other services in NYC and this is the only one that consistently gets it right.', name: 'Marcus Johnson', location: 'Harlem, Manhattan', date: 'March 2026', rating: 5 },
  { text: 'Same-day turnaround is a lifesaver. Dropped off a huge bag in the morning, had it back by evening. Everything perfectly folded and organized. Highly recommend to anyone who values their time.', name: 'Emily Chen', location: 'Midtown, Manhattan', date: 'March 2026', rating: 5 },
  { text: 'I switched from my old laundromat and the difference is night and day. They actually separate colors, use quality detergent, and fold everything neatly. My shirts come back crisp, my towels are fluffy, and nothing has ever been damaged or lost. Worth every penny at three dollars a pound.', name: 'David Torres', location: 'Williamsburg, Brooklyn', date: 'February 2026', rating: 5 },
  { text: 'They picked up my laundry from my doorstep at 8am and had it back by the afternoon. Clean, fresh, and perfectly folded. This is how laundry should work in NYC. The driver was on time and texted me updates throughout.', name: 'Samantha Reeves', location: 'Chelsea, Manhattan', date: 'February 2026', rating: 5 },
  { text: 'Been using them weekly for three months now. Always on time, always consistent. My shirts are folded better than I could ever do myself. Great communication too — real humans, not bots.', name: 'Jason Park', location: 'Astoria, Queens', date: 'February 2026', rating: 5 },
  { text: 'Moved to NYC from Austin and dreaded the laundromat situation. A friend recommended The NYC Wash and Fold Service Company and I haven\'t looked back. Pickup, wash, fold, deliver — all handled. The weekly subscription saves me ten percent and I never think about laundry anymore.', name: 'Olivia Morales', location: 'Long Island City, Queens', date: 'February 2026', rating: 5 },
  { text: 'They handled my king-size comforter and a bag of regular laundry. Everything came back fresh and clean. The comforter was fluffy like new. Reasonable pricing too — forty-five dollars for a queen comforter is fair.', name: 'Andre Williams', location: 'Bed-Stuy, Brooklyn', date: 'January 2026', rating: 5 },
  { text: 'Super responsive over text. Scheduled a pickup in minutes and my laundry was done the same day. No missing socks, no shrinkage, no complaints. Five stars from me and my roommate.', name: 'Christine Liu', location: 'East Village, Manhattan', date: 'January 2026', rating: 5 },
  { text: 'I run an Airbnb in Brooklyn and they handle all my linens and towels between guests. Fast turnaround, always spotless, and they fold the towels exactly how I need them for photos. Before I found them I was doing six loads between every checkout and check-in.', name: 'Tyler Brooks', location: 'Park Slope, Brooklyn', date: 'January 2026', rating: 5 },
  { text: 'Tried three different laundry services before finding The NYC Wash and Fold Service Company. They\'re the only ones who consistently get it right — clean clothes, no damage, on time every single time. I have been a weekly subscriber for four months now.', name: 'Priya Nair', location: 'Murray Hill, Manhattan', date: 'January 2026', rating: 5 },
  { text: 'The convenience factor alone is worth it. But on top of that, my clothes have never been cleaner. They even got a stain out of my favorite shirt that I thought was ruined. Genuinely impressed.', name: 'Michael Ortiz', location: 'Jackson Heights, Queens', date: 'December 2025', rating: 5 },
  { text: 'Affordable, reliable, and fast. I drop off on my way to work and pick up on my way home. My laundry is always ready when they say it will be. No surprises, no excuses.', name: 'Hannah Scott', location: 'Gramercy, Manhattan', date: 'December 2025', rating: 5 },
  { text: 'As a busy nurse working 12-hour shifts, the last thing I want to do is laundry. The NYC Wash and Fold Service Company handles everything for me. Scrubs, sheets, towels — all done. The weekly plan is a lifesaver.', name: 'Danielle Foster', location: 'Kips Bay, Manhattan', date: 'November 2025', rating: 5 },
  { text: 'Great service for families. We generate a LOT of laundry with two kids and they handle it all without breaking the bank. The per-pound pricing makes so much sense for us. They even sort by family member.', name: 'Kevin Walsh', location: 'Bay Ridge, Brooklyn', date: 'November 2025', rating: 5 },
  { text: 'I\'ve recommended them to everyone in my building. Professional, affordable, and the turnaround time is incredible. NYC laundry done right. Zero complaints after five months.', name: 'Sofia Martinez', location: 'Washington Heights, Manhattan', date: 'November 2025', rating: 5 },
]

export default function ReviewsPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#7EC8E3] tracking-[0.25em] uppercase mb-4">Customer Reviews</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-6">
            NYC Wash and Fold Reviews — 5.0&#9733; Google
          </h1>
          <p className="text-sky-200/60 text-lg max-w-2xl mx-auto mb-8">
            16 five-star reviews from real NYC customers. Zero negative reviews. Read what our customers say about our $3/lb wash & fold laundry service with free pickup & delivery.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-white">5.0<span className="text-yellow-400 ml-1">&#9733;</span></p>
              <p className="text-sky-200/40 text-xs mt-1">Google Rating</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-white">16</p>
              <p className="text-sky-200/40 text-xs mt-1">Five-Star Reviews</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#7EC8E3]">0</p>
              <p className="text-sky-200/40 text-xs mt-1">Negative Reviews</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map(r => (
              <div key={r.name} className="border border-gray-200 rounded-2xl p-7 hover:border-[#4BA3D4]/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  <span className="text-gray-400 text-xs">{r.date}</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">&ldquo;{r.text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-[#1a3a5c] text-sm">{r.name}</p>
                  <p className="text-gray-400 text-xs">{r.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#1a3a5c]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-white tracking-wide mb-4">Why Customers Stay</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-7">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-white mb-2">$3/lb</p>
              <p className="text-sky-200/60 text-sm">Transparent pricing with zero hidden fees. Same rate across all neighborhoods.</p>
            </div>
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-7">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-white mb-2">Free Pickup</p>
              <p className="text-sky-200/60 text-sm">Free pickup and delivery on every order. No delivery fee, no fuel surcharge.</p>
            </div>
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-7">
              <p className="font-[family-name:var(--font-bebas)] text-2xl text-white mb-2">Real Humans</p>
              <p className="text-sky-200/60 text-sm">Text <Link href="sms:9179706002" className="text-[#7EC8E3] underline underline-offset-2">(917) 970-6002</Link> and talk to an actual person, not a chatbot.</p>
            </div>
          </div>
        </div>
      </section>

      <CTABlock title="Join 16 Five-Star Reviewers" subtitle="Text (917) 970-6002 to schedule your first pickup — $3/lb, free pickup & delivery across Manhattan, Brooklyn & Queens." />
    </>
  )
}
