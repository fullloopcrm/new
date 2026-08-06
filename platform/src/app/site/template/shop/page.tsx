import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { getTenantFromHeaders, getTenantServices } from '@/lib/tenant-site'
import ShopClient, { type ShopProduct } from '@/app/site/template/_components/ShopClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const title = `Shop | ${config.identity.name}`
  return {
    title,
    description: `Shop products from ${config.identity.name}.`,
    alternates: { canonical: `${config.identity.url}/shop` },
    openGraph: { title, url: `${config.identity.url}/shop` },
  }
}

export default async function ShopPage() {
  const config = await getSiteConfig()
  if (!config.storefrontEnabled) notFound()
  const tenant = await getTenantFromHeaders()
  const rows = tenant ? await getTenantServices(tenant.id) : []
  const products: ShopProduct[] = rows
    .filter((r) => r.item_type === 'product' && (r.price_cents || 0) > 0)
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUrl: r.image_url,
      priceCents: r.price_cents || 0,
      category: r.category || null,
    }))

  return <ShopClient config={config} products={products} />
}
