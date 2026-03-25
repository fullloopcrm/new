import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema, localBusinessSchema, reviewSchemas } from '@/lib/seo/schema'
import JsonLd from '@/components/marketing/JsonLd'
import Breadcrumbs from '@/components/marketing/Breadcrumbs'
import CTABlock from '@/components/marketing/CTABlock'

const reviews = [
  { name: 'Lindsey Hill', time: '3 days ago', text: 'Awesome cleaners and very responsive. I\'ve used them for several months now for my 3 bed 3 bath walk up in Hell\'s Kitchen. Karina is my cleaner. She is so sweet and warm and lovely, I always look forward to when she comes to take care of my apartment.', initial: 'L', color: 'bg-emerald-400' },
  { name: 'Joseph Busacca', time: 'a day ago', text: 'Karina was great and very helpful.', initial: 'J', color: 'bg-indigo-500' },
  { name: 'Adam Berger', time: '3 days ago', text: 'Great job. Friendly and professional.', initial: 'A', color: 'bg-slate-500' },
  { name: 'Jessica Pace', time: '4 days ago', text: 'Ines Enriquez was incredible. Loved this job. Worth every penny.', initial: 'J', color: 'bg-purple-500' },
  { name: 'Brad Lieberman', time: '2 weeks ago', text: 'Jeff is a real gem. Super communicative easy going and responsive. In a city with a lot of fly by night operations, NYC Maids is the real deal. I\'ve occasionally had a few feedback points for Jeff\'s team and he has always been receptive and responsive.', initial: 'B', color: 'bg-amber-400' },
  { name: 'Eeland Stribling', time: '4 weeks ago', text: 'Moving into an apartment clean. Had my daughter\'s room, a bathroom and a kitchen to clean. Cindy came and cleaned very well. Even cleaned up my living room as bonus. Right on time, fast, easy to book and communicate. Will be using again. No complaints!', initial: 'E', color: 'bg-violet-400' },
  { name: 'Kelsey Wheeler', time: '2 weeks ago', text: 'Great experience. Texted the number on their website on Saturday and had a deep cleaning scheduled for that following Monday at 9am. The cleaner was prompt and super nice/friendly.', initial: 'K', color: 'bg-cyan-400' },
  { name: 'Jason Klig', time: '2 months ago', text: 'Maria did an amazing job! My apartment is spotless and she is so easy to work with. Was very happy to accommodate all of my requests.', initial: 'J', color: 'bg-lime-500' },
  { name: 'Jessica Papantoniou', time: '2 months ago', text: 'I called for an emergency cleaning Jeff took care of it right away. Karina did an amazing job and she\'s incredibly sweet. I\'ll definitely be using their services again!', initial: 'J', color: 'bg-fuchsia-400' },
  { name: 'Endrit Jonuzi', time: '2 months ago', text: 'We hired them for cleaning our offices in Manhattan and no doubt they are the best we ever had. Affordable pricing, staff was friendly and on time. We look forward to using them again.', initial: 'E', color: 'bg-yellow-500' },
  { name: 'Shannon Atran', time: '2 months ago', text: 'Karina was incredible. She was extremely meticulous and left my apt spotless. 10/10; will definitely use again.', initial: 'S', color: 'bg-red-400' },
  { name: 'Will Gags', time: '2 months ago', text: 'Maria is the grandmother you didn\'t know you needed. Couldn\'t recommend a more trustworthy and tidy business.', initial: 'W', color: 'bg-green-400' },
  { name: 'Blair Silver-Matthes', time: '2 months ago', text: 'Karina was wonderful! She left my home in exceptional condition and I\'m looking forward to having her come again!', initial: 'B', color: 'bg-blue-500' },
  { name: 'Vijay Chadderwala', time: '2 months ago', text: 'Gloria was great and very nice. Felt comfortable with her cleaning home.', initial: 'V', color: 'bg-orange-500' },
  { name: 'Priya Vadlamudi', time: '3 months ago', text: 'Service was great and very friendly staff.', initial: 'P', color: 'bg-pink-500' },
  { name: 'Erik Berlin', time: '2 months ago', text: 'Great service, cleaning, and pricing!', initial: 'E', color: 'bg-teal-500' },
  { name: 'Kayli Watson', time: '5 months ago', text: 'Super fast to book, incredibly kind people, and great results!', initial: 'K', color: 'bg-pink-400' },
  { name: 'Julie Salamon', time: '5 months ago', text: 'We just had our apartment painted and needed a deep clean to get rid of loads of dust. NYC Maid sent a wonderful cleaner who was prompt, professional and did an amazing job. Highly recommend!!!', initial: 'J', color: 'bg-orange-400' },
  { name: 'Moodap', time: '5 months ago', text: 'Super detailed!', initial: 'M', color: 'bg-green-500' },
  { name: 'Antong', time: '6 months ago', text: 'Everything was spotless, from oven stove to fridge.', initial: 'A', color: 'bg-teal-400' },
  { name: 'Courtney Gamble', time: '6 months ago', text: "Best cleaning service I've used in the 20 years I've lived in NYC! Consistently efficient, thorough...", initial: 'C', color: 'bg-purple-400' },
  { name: 'Shilpa Ray', time: '6 months ago', text: 'Perfect for post move deep cleaning. Appliances were spotless. Looked brand new.', initial: 'S', color: 'bg-blue-400' },
  { name: 'Greg Farr', time: '6 months ago', text: 'The very best service every time, amazing!!', initial: 'G', color: 'bg-indigo-400' },
  { name: 'Maria Lina', time: '6 months ago', text: 'The NYC Maid Cleaning Service is so efficient and professional! I know I can always count on them.', initial: 'M', color: 'bg-rose-400' },
  { name: 'Timothy Wojcik', time: '7 months ago', text: 'Excellent service and a great price! Prompt and thorough, would highly recommend!', initial: 'T', color: 'bg-amber-500' },
  { name: 'Jenni Martinez', time: '7 months ago', text: '5 Stars \u2013 Absolutely the Best Cleaning Service in NYC! I gotta say, The NYC Maid is truly the best.', initial: 'J', color: 'bg-emerald-500' },
  { name: 'Jenna M', time: '7 months ago', text: 'After trying three different cleaning companies in NYC, The NYC Maid is hands down the most affordable and thorough.', initial: 'J', color: 'bg-sky-500' },
]

export const metadata: Metadata = {
  title: 'NYC Maid Service Reviews | 5-Star Rated House Cleaning New York City | The NYC Maid',
  description: '27 verified 5-star Google reviews from real NYC cleaning clients. Background-checked cleaners, from $49/hr, no contracts. Manhattan, Brooklyn, Queens, LI & NJ. (212) 202-8400',
  alternates: { canonical: 'https://www.thenycmaid.com/nyc-customer-reviews-for-the-nyc-maid' },
  openGraph: {
    title: 'NYC Maid Service Reviews | 5-Star Rated House Cleaning | The NYC Maid',
    description: '27 verified 5-star Google reviews from real NYC cleaning clients. Professional maid service across Manhattan, Brooklyn, Queens, Long Island & NJ.',
    url: 'https://www.thenycmaid.com/nyc-customer-reviews-for-the-nyc-maid',
  },
}

export default function ReviewsPage() {
  return (
    <>
      <JsonLd data={[
        localBusinessSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thenycmaid.com' },
          { name: 'Reviews', url: 'https://www.thenycmaid.com/nyc-customer-reviews-for-the-nyc-maid' },
        ]),
        ...reviewSchemas(),
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl lg:text-7xl text-white tracking-wide leading-[0.95] mb-6">
            NYC House Cleaning Reviews — What Real Clients Say About The NYC Maid
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed">
            27 verified 5-star Google reviews from real apartment cleaning, deep cleaning, and maid service clients across Manhattan, Brooklyn, Queens, Long Island &amp; New Jersey. No fake reviews, no cherry-picking — just honest feedback from New Yorkers who trust us with their homes.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Breadcrumbs items={[{ name: 'Reviews', href: '/nyc-customer-reviews-for-the-nyc-maid' }]} />

        {/* Google Reviews widget */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mt-8">
          {/* Widget header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[#4285F4] font-semibold text-lg">G</span>
                <span className="text-[#EA4335] font-semibold text-lg">o</span>
                <span className="text-[#FBBC05] font-semibold text-lg">o</span>
                <span className="text-[#4285F4] font-semibold text-lg">g</span>
                <span className="text-[#34A853] font-semibold text-lg">l</span>
                <span className="text-[#EA4335] font-semibold text-lg">e</span>
              </div>
              <span className="text-gray-900 font-semibold text-lg">Reviews</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-900 font-bold text-2xl">5.0</span>
                <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                <span className="text-gray-400 text-sm">(27)</span>
              </div>
              <a href="https://share.google/Iq9oblq3vJr07aP27" target="_blank" rel="noopener noreferrer" className="hidden sm:inline-block bg-[#4285F4] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#3367D6] transition-colors">
                Review us on Google
              </a>
            </div>
          </div>

          {/* Review cards grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {reviews.map((review, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`w-8 h-8 ${review.color} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {review.initial}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{review.name}</p>
                        <svg className="w-3.5 h-3.5 text-[#4285F4] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                      </div>
                      <p className="text-xs text-gray-400">{review.time}</p>
                    </div>
                  </div>
                  <div className="text-yellow-400 text-sm mb-2">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                  <p className="text-gray-700 text-sm leading-relaxed">{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA below reviews */}
        <div className="text-center mt-12 mb-8">
          <p className="text-gray-500 mb-4">Had a great experience? We&apos;d love to hear from you.</p>
          <a href="https://share.google/Iq9oblq3vJr07aP27" target="_blank" rel="noopener noreferrer" className="inline-block bg-[#4285F4] text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-widest uppercase hover:bg-[#3367D6] transition-colors">
            Leave a Google Review
          </a>
        </div>
      </div>

      <CTABlock title="Book Your NYC Cleaning Service Today" subtitle="Trusted by New Yorkers since 2018. Text or call to schedule your first cleaning." />
    </>
  )
}
