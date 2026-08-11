import Link from 'next/link'
import type { SiteConfig } from '@/app/site/template/_config/types'

const SHOP_LINKS = [
  { name: 'Fellas', href: '/shop/c/fellas' },
  { name: 'Ladies', href: '/shop/c/ladies' },
  { name: 'Accessories', href: '/shop/c/accessories' },
  { name: "What's Hot", href: '/shop' },
]

const INFO_LINKS = [
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
  { name: 'Reviews', href: '/reviews' },
  { name: 'FAQ', href: '/faq' },
]

const LEGAL_LINKS = [
  { name: 'Refund Policy', href: '/refund-policy' },
  { name: 'Privacy Policy', href: '/privacy-policy' },
  { name: 'Terms & Conditions', href: '/terms-conditions' },
]

// Dense editorial footer for the streetwear-editorial variant. Real store
// address + contact, no service-business neighborhood grid (that footer was
// written for nycmaid specifically and doesn't apply to e-commerce).
export default function StreetwearFooter({ config }: { config: SiteConfig }) {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-black border-t border-white/10 text-white">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2">
            <p className="font-[family-name:var(--font-anton)] text-3xl uppercase tracking-wide mb-4">{config.identity.name}</p>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs mb-5">
              New York City streetwear built for the block, not the boardroom. Founded in the Diamond District.
            </p>
            <address className="not-italic text-white/50 text-sm leading-relaxed font-[family-name:var(--font-plex-mono)]">
              150 West 47th Street<br />
              New York, NY 10036
            </address>
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-4">Shop</p>
            <ul className="space-y-2.5">
              {SHOP_LINKS.map((l) => (
                <li key={l.name}><Link href={l.href} className="text-white/70 hover:text-[var(--accent)] text-sm transition-colors">{l.name}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-4">Info</p>
            <ul className="space-y-2.5">
              {INFO_LINKS.map((l) => (
                <li key={l.name}><Link href={l.href} className="text-white/70 hover:text-[var(--accent)] text-sm transition-colors">{l.name}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-4">Contact</p>
            <ul className="space-y-2.5 text-sm">
              <li><a href={`sms:${config.contact.phoneDigits}`} className="text-white/70 hover:text-[var(--accent)] transition-colors">{config.contact.phone}</a></li>
              {config.contact.email && <li><a href={`mailto:${config.contact.email}`} className="text-white/70 hover:text-[var(--accent)] transition-colors break-all">{config.contact.email}</a></li>}
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8 border-t border-white/10">
          <p className="text-white/30 text-xs font-[family-name:var(--font-plex-mono)]">&copy; {year} {config.identity.name}. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-white/30 hover:text-white/70 text-xs transition-colors">{l.name}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
