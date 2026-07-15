import Link from 'next/link'

const manhattanLinks = [
  { name: 'Upper East Side', href: '/service-areas/upper-east-side-cleaning-services' },
  { name: 'Chelsea', href: '/service-areas/chelsea-cleaning-services' },
]

const brooklynQueensLinks = [
  { name: 'Park Slope', href: '/service-areas/park-slope-cleaning-services' },
  { name: 'Williamsburg', href: '/service-areas/williamsburg-cleaning-services' },
  { name: 'Astoria', href: '/service-areas/astoria-cleaning-services' },
  { name: 'Forest Hills', href: '/service-areas/forest-hills-cleaning-services' },
]

const serviceFooterLinks = [
  { name: 'Deep Cleaning', href: '/services/nyc-deep-cleaning-service' },
  { name: 'Apartment Cleaning', href: '/services/nyc-apartment-cleaning-service' },
  { name: 'House Cleaning', href: '/services/nyc-house-cleaning-service' },
  { name: 'Move-In/Move-Out', href: '/services/nyc-moving-cleaning-service' },
  { name: 'Same-Day Cleaning', href: '/services/nyc-same-day-cleaning-service' },
  { name: 'Office Cleaning', href: '/services/nyc-office-cleaning-service' },
]

export default function MarketingFooter() {
  return (
    <footer className="bg-[#1E2A4A] text-gray-400">
      {/* Main footer brand */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <h2 className="font-[family-name:var(--font-bebas)] text-white text-3xl md:text-4xl tracking-wide text-center mb-1">Sunnyside Clean NYC</h2>
        <p className="text-center text-[11px] font-semibold text-gray-400 tracking-[0.2em] uppercase mb-6">A NYC Maid Service Co.</p>
        <div className="w-16 h-[2px] bg-[#A8F0DC] mx-auto mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Link href="/#reviews" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <span className="text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-gray-300 text-sm font-medium">5.0 from 50+ verified reviews</span>
          </Link>
        </div>
      </div>

      {/* Links grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Manhattan</h3>
            <ul className="space-y-2.5">
              {manhattanLinks.map(link => (
                <li key={link.href}><Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link></li>
              ))}
              <li><Link href="/service-areas/manhattan-cleaning-services" className="text-sm hover:text-white transition-colors">All Manhattan</Link></li>
            </ul>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mt-8 mb-5">Brooklyn &amp; Queens</h3>
            <ul className="space-y-2.5">
              {brooklynQueensLinks.map(link => (
                <li key={link.href}><Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Services</h3>
            <ul className="space-y-2.5">
              {serviceFooterLinks.map(link => (
                <li key={link.href}><Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Company</h3>
            <ul className="space-y-2.5">
              <li><Link href="/about-nyc-cleaning-service-sunnyside-clean-nyc" className="text-sm hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact-nyc-cleaning-service-sunnyside-clean-nyc" className="text-sm hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/nyc-cleaning-service-pricing" className="text-sm hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/#reviews" className="text-sm hover:text-white transition-colors">Reviews</Link></li>
              <li><Link href="/frequently-asked-cleaning-service-related-questions" className="text-sm hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Resources</h3>
            <ul className="space-y-2.5">
              <li><Link href="/book/new" className="text-sm hover:text-white transition-colors">Self Booking — $10 Off</Link></li>
              <li><Link href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" className="text-sm hover:text-white transition-colors">Referral Program</Link></li>
              <li><a href="tel:2122028400" className="text-sm hover:text-white transition-colors">Call: (212) 202-8400</a></li>
              <li><a href="sms:2122028400" className="text-sm hover:text-white transition-colors">Text: (212) 202-8400</a></li>
              <li><Link href="/cleaning-tips-and-tricks" className="text-sm hover:text-white transition-colors">Cleaning Tips</Link></li>
              <li><Link href="/nyc-cleaning-services-offered" className="text-sm hover:text-white transition-colors">All Services</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-500">
            <Link href="/privacy-policy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link href="/terms-conditions" className="hover:text-gray-300 transition-colors">Terms</Link>
            <a href="https://www.thenycmaid.com/refund-policy" className="hover:text-gray-300 transition-colors">Refunds</a>
          </div>
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Sunnyside Clean NYC — A NYC Maid Service Co. &middot; (212) 202-8400</p>
        </div>
      </div>
    </footer>
  )
}
