// @ts-nocheck
import Link from 'next/link'

const manhattanLinks = [
  { name: 'Upper East Side', href: '/upper-east-side-wash-and-fold' },
  { name: 'Upper West Side', href: '/upper-west-side-wash-and-fold' },
  { name: 'Midtown', href: '/midtown-manhattan-wash-and-fold' },
  { name: "Hell's Kitchen", href: '/hells-kitchen-wash-and-fold' },
  { name: 'Chelsea', href: '/chelsea-wash-and-fold' },
  { name: 'SoHo', href: '/soho-wash-and-fold' },
  { name: 'Tribeca', href: '/tribeca-wash-and-fold' },
  { name: 'West Village', href: '/west-village-wash-and-fold' },
  { name: 'East Village', href: '/east-village-wash-and-fold' },
  { name: 'Financial District', href: '/financial-district-wash-and-fold' },
  { name: 'Gramercy', href: '/gramercy-wash-and-fold' },
  { name: 'Murray Hill', href: '/murray-hill-wash-and-fold' },
]

const brooklynLinks = [
  { name: 'Brooklyn Heights', href: '/brooklyn-heights-wash-and-fold' },
  { name: 'Park Slope', href: '/park-slope-wash-and-fold' },
  { name: 'DUMBO', href: '/dumbo-wash-and-fold' },
  { name: 'Williamsburg', href: '/williamsburg-wash-and-fold' },
  { name: 'Bushwick', href: '/bushwick-wash-and-fold' },
  { name: 'Greenpoint', href: '/greenpoint-wash-and-fold' },
]

const queensLinks = [
  { name: 'Long Island City', href: '/long-island-city-wash-and-fold' },
  { name: 'Astoria', href: '/astoria-wash-and-fold' },
  { name: 'Forest Hills', href: '/forest-hills-wash-and-fold' },
  { name: 'Jackson Heights', href: '/jackson-heights-wash-and-fold' },
  { name: 'Flushing', href: '/flushing-wash-and-fold' },
]

const serviceFooterLinks = [
  { name: 'Wash & Fold', href: '/services/nyc-wash-and-fold' },
  { name: 'In-Unit Laundry', href: '/services/nyc-in-unit-laundry-service' },
  { name: 'In-Building Laundry', href: '/services/nyc-in-building-laundry-service' },
  { name: 'Pickup & Delivery', href: '/services/nyc-pickup-and-delivery' },
  { name: 'Dry Cleaning', href: '/services/nyc-dry-cleaning' },
  { name: 'Comforter Cleaning', href: '/services/nyc-comforter-cleaning' },
  { name: 'Commercial Laundry', href: '/services/nyc-commercial-laundry' },
]

export default function MarketingFooter() {
  return (
    <footer className="bg-[#1a3a5c] text-gray-400 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <h2 className="font-[family-name:var(--font-bebas)] text-white text-3xl md:text-4xl tracking-wide text-center mb-2">Wash and Fold NYC</h2>
        <p className="text-center text-[#7EC8E3] text-sm mb-2">$3/lb &middot; Free Pickup &middot; Manhattan &middot; Brooklyn &middot; Queens</p>
        <div className="w-16 h-[2px] bg-[#4BA3D4] mx-auto mb-12" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10">
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Manhattan</h3>
            <ul className="space-y-2.5">
              {manhattanLinks.map(link => (
                <li key={link.href}><Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Brooklyn</h3>
            <ul className="space-y-2.5">
              {brooklynLinks.map(link => (
                <li key={link.href}><Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Queens</h3>
            <ul className="space-y-2.5">
              {queensLinks.map(link => (
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
              <li><Link href="/about" className="text-sm hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-sm hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/pricing" className="text-sm hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/reviews" className="text-sm hover:text-white transition-colors">Reviews</Link></li>
              <li><Link href="/careers" className="text-sm hover:text-white transition-colors">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Resources</h3>
            <ul className="space-y-2.5">
              <li><Link href="/partners" className="text-sm hover:text-white transition-colors">Partner With Us</Link></li>
              <li><Link href="/faq" className="text-sm hover:text-white transition-colors">FAQ</Link></li>
              <li><a href="sms:9179706002" className="text-sm hover:text-white transition-colors">Text to Book</a></li>
              <li><Link href="/feedback" className="text-sm hover:text-white transition-colors">Leave Feedback</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-500">
            <Link href="/privacy-policy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link href="/terms-conditions" className="hover:text-gray-300 transition-colors">Terms</Link>
            <Link href="/refund-policy" className="hover:text-gray-300 transition-colors">Refunds</Link>
            <Link href="/legal" className="hover:text-gray-300 transition-colors">Legal</Link>
          </div>
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Wash and Fold NYC &middot; <a href="tel:9179706002" className="text-[#7EC8E3]/70 hover:text-[#7EC8E3]">(917) 970-6002</a> &middot; NYC Web Design by{' '}<a href="https://www.consortiumnyc.com/" target="_blank" rel="noopener noreferrer" className="text-[#7EC8E3] font-semibold hover:text-white underline underline-offset-2 decoration-[#7EC8E3]/50">Consortium NYC</a></p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-center">
          <p className="text-[11px] text-gray-500">
            Built and managed by{' '}
            <a href="https://www.fullloopcrm.com/" target="_blank" rel="noopener noreferrer" className="text-[#7EC8E3]/70 hover:text-[#7EC8E3] font-semibold underline underline-offset-2 decoration-[#7EC8E3]/40">
              Full Loop CRM
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
