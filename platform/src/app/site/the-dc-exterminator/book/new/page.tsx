import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { getSettings } from '@/lib/settings'
import BookNewForm from './BookNewForm'

export const metadata: Metadata = {
  title: 'Book Online | The DC Exterminator',
  robots: { index: false, follow: false },
}

// The real self-book flow (creates an actual bookings row via
// /api/client/book) — this bespoke site previously had NO such page; every
// "book now" CTA (book-exterminator-today, schedule-service, quote-request)
// pointed at the generic ContactForm -> /api/contact lead-capture flow
// instead, which only creates a portal_leads row + sales deal, never a real
// booking. 2026-08-15.
export default async function BookNewPage() {
  const tenant = await getTenantFromHeaders()
  if (!tenant) notFound()

  const settings = await getSettings(tenant.id)
  const services = settings.service_types.filter((s) => s.active && s.rate > 0)

  return (
    <BookNewForm
      services={services}
      businessName={tenant.name as string}
      primaryColor={(tenant.primary_color as string) || '#EFF70A'}
      phone={(tenant.phone as string) || ''}
      selfBookDiscountCents={settings.self_book_discount_cents}
    />
  )
}
