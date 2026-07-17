import type { Metadata } from 'next'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { referralContent } from '@/app/site/template/_lib/content/longform'
import { LongformArticle } from '@/app/site/template/_components/LongformArticle'
import { getSeoOverride } from '@/lib/seo/overrides'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const c = referralContent(config)
  const url = `${config.identity.url}/referral-program`
  const override = await getSeoOverride(url)
  const title = override?.title || c.title
  const description = override?.description || c.metaDescription
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
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
