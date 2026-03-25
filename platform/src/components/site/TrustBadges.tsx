export default function TrustBadges() {
  const badges = [
    { icon: '\u{1F6E1}', label: 'Licensed & Insured' },
    { icon: '\u2705', label: 'Background Checked' },
    { icon: '\u2B50', label: '5.0 Star Google Rating' },
    { icon: '\u{1F91D}', label: 'Thousands of Happy Clients' },
    { icon: '\u{1F504}', label: 'Satisfaction Guaranteed' },
  ]

  return (
    <div className="border border-gray-200 rounded-xl p-8 my-12">
      <h3 className="text-center text-[#1E2A4A] font-[family-name:var(--font-bebas)] text-2xl tracking-wide mb-6">Why We&apos;re Trusted</h3>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {badges.map(badge => (
          <div key={badge.label} className="flex items-center gap-2.5">
            <span className="text-lg">{badge.icon}</span>
            <span className="text-sm text-gray-600 font-medium">{badge.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
