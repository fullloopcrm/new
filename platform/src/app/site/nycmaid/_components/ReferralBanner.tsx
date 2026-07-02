import Link from 'next/link'

// Site-wide announcement bar promoting the referral program.
// Renders at the top of every nycmaid marketing page via layout.tsx.
const REFERRAL_HREF = '/get-paid-for-cleaning-referrals-every-time-they-are-serviced'

export default function ReferralBanner() {
  return (
    <Link
      href={REFERRAL_HREF}
      className="group block bg-[#A8F0DC] text-[#1E2A4A] hover:bg-[#8DE8CC] transition-colors"
    >
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2 text-center">
        <span className="text-sm font-semibold leading-snug">
          Earn <span className="font-bold">10% recurring</span> on every cleaning your referrals book — paid after each visit, no cap.
        </span>
        <span className="hidden sm:inline text-sm font-bold tracking-widest uppercase whitespace-nowrap group-hover:underline">
          Start Earning &rarr;
        </span>
      </div>
    </Link>
  )
}
