import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { referralContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = referralContent(config)
  return {
    title: c.title,
    description: c.metaDescription,
    alternates: { canonical: `${config.identity.url}/referral-program` },
    openGraph: { title: c.title, description: c.metaDescription, url: `${config.identity.url}/referral-program` },
  }
}

export default async function ReferralProgramPage() {
  const config = await getSiteConfig()
  const c = referralContent(config)
  return (
    <LongformArticle
      config={config}
      content={c}
      eyebrow="Referral Program"
      ctaHeading="Start Referring"
      ctaBody="Know someone who could use us? Sign up on our referral page or text us — everyone wins."
    />
  )
}
