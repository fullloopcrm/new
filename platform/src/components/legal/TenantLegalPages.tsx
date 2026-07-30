// Global, reusable legal content for custom-built tenant marketing sites
// (the ones NOT on the shared src/app/site/template/* system, which already
// has its own config-driven legal/privacy-policy/terms-conditions pages).
// One component, driven by each tenant's own profile fields (name, url,
// email, phone) -- not bespoke content forked per tenant.
import Link from 'next/link'

export interface TenantLegalIdentity {
  name: string
  url: string
  email?: string
  phone?: string
}

function Shell({ title, identity, children }: { title: string; identity: TenantLegalIdentity; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-sm text-gray-500 mb-8">{identity.name}</p>
      <div className="prose prose-sm max-w-none space-y-4">{children}</div>
    </div>
  )
}

export function TenantLegalHub({ identity }: { identity: TenantLegalIdentity }) {
  const docs = [
    { title: 'Privacy Policy', href: '/privacy-policy', desc: 'How we collect, use, and protect your information.' },
    { title: 'Terms & Conditions', href: '/terms-conditions', desc: 'The agreement governing your use of our services.' },
  ]
  return (
    <Shell title="Legal Information" identity={identity}>
      <div className="grid gap-4 not-prose">
        {docs.map((d) => (
          <Link key={d.href} href={d.href} className="block p-5 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors">
            <div className="font-semibold text-gray-900">{d.title}</div>
            <div className="text-sm text-gray-500 mt-1">{d.desc}</div>
          </Link>
        ))}
      </div>
      <p className="text-sm text-gray-500 mt-8">
        Questions? Contact {identity.name}
        {identity.email && <> at <a className="underline" href={`mailto:${identity.email}`}>{identity.email}</a></>}
        {identity.phone && <> or call <a className="underline" href={`tel:${identity.phone.replace(/[^0-9+]/g, '')}`}>{identity.phone}</a></>}.
      </p>
    </Shell>
  )
}

export function TenantPrivacyPolicy({ identity }: { identity: TenantLegalIdentity }) {
  return (
    <Shell title="Privacy Policy" identity={identity}>
      <p>{identity.name} ({identity.url}) collects only the information needed to quote, schedule, and deliver our services: your name, address, phone number, email, and payment details.</p>
      <p>We do not sell your personal information or share it with data brokers or ad networks. We share information only with the service providers that run our payments, scheduling, texting, email, and hosting — and only what they need to provide those services.</p>
      <p>By giving us your phone number, you consent to receive service-related texts and calls. Reply STOP at any time to opt out of texts.</p>
      <p>We retain your information as long as needed to provide our services and comply with legal obligations. You may request a copy of your data or ask us to delete it by contacting us{identity.email && <> at <a className="underline" href={`mailto:${identity.email}`}>{identity.email}</a></>}.</p>
      <p>If you are a California resident, you have the right to opt out of the sale or sharing of your personal information. We do not sell personal information.</p>
      <p className="text-sm text-gray-400">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.</p>
    </Shell>
  )
}

export function TenantTermsConditions({ identity }: { identity: TenantLegalIdentity }) {
  return (
    <Shell title="Terms & Conditions" identity={identity}>
      <p>These terms govern your use of {identity.name}&apos;s website and services. By booking a service with us, you agree to these terms.</p>
      <p><strong>Booking &amp; Payment.</strong> Prices quoted are estimates until the scope of work is confirmed. Payment is due at the time of service unless otherwise agreed in writing.</p>
      <p><strong>Cancellations.</strong> We ask for as much notice as possible if you need to cancel or reschedule. Late cancellations may be subject to a fee.</p>
      <p><strong>Liability.</strong> We carry insurance appropriate to our trade. Our liability for any claim is limited to the amount paid for the service giving rise to the claim.</p>
      <p><strong>Communications.</strong> By providing your phone number, you consent to service-related texts and calls related to your booking.</p>
      <p>We may update these terms from time to time. Continued use of our services after a change constitutes acceptance of the updated terms.</p>
      <p className="text-sm text-gray-400">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.</p>
    </Shell>
  )
}
