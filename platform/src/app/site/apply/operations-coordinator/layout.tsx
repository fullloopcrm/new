import type { Metadata } from 'next'
import { requireLegacySeoPages } from '@/lib/tenant-site'

export const metadata: Metadata = {
  title: 'Apply — Operations Admin (Part-Time) | The NYC Maid',
  description:
    'Apply for the part-time Operations Admin position at The NYC Maid. 10% per completed job, paid via Zelle. Averaged ~$40/hr last month. Own the calendar, cleaners, and collections.',
  alternates: { canonical: 'https://www.thenycmaid.com/apply/operations-coordinator' },
  openGraph: {
    title: 'Apply — Operations Admin (Part-Time) | The NYC Maid',
    description:
      'Apply for the part-time Operations Admin role. 10% per job, averaged ~$40/hr last month. Paid per job via Zelle. Aiming for $8K/mo.',
    url: 'https://www.thenycmaid.com/apply/operations-coordinator',
    siteName: 'The NYC Maid',
    locale: 'en_US',
  },
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireLegacySeoPages()
  return children
}
