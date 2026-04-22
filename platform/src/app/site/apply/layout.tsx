import type { Metadata } from 'next'
import { getTenantFromHeaders, tenantSiteUrl } from '@/lib/tenant-site'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Business'
  const origin = tenantSiteUrl(tenant) || ''
  const industry = (tenant?.industry as string | undefined) || 'service'
  return {
    title: `Apply — Join ${name}`,
    description: `Join ${name}. Apply in minutes — real work, real pay, real team.`,
    alternates: { canonical: `${origin}/apply` },
    openGraph: {
      title: `Apply — Join ${name}`,
      description: `Join ${name}. Apply in minutes — real work, real pay, real team.`,
      url: `${origin}/apply`,
      siteName: name,
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Apply — Join ${name}`,
      description: `Join ${name}. Apply in minutes — real ${industry} work, real pay, real team.`,
    },
  }
}

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return children
}
