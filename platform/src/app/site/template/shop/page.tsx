import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { getTenantFromHeaders, getTenantServices } from '@/lib/tenant-site'
import ShopClient, { type ShopProduct } from '@/app/site/template/_components/ShopClient'
import StreetwearShopGrid, { type StreetwearProduct } from '@/app/site/template/_components/streetwear/StreetwearShopGrid'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

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

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const config = await getSiteConfig()
  if (!config.storefrontEnabled) notFound()
  const tenant = await getTenantFromHeaders()
  const rows = tenant ? await getTenantServices(tenant.id) : []
  const filtered = rows.filter((r) => r.item_type === 'product' && (r.price_cents || 0) > 0)

  const { page: pageParam } = await searchParams
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(totalPages, Math.max(1, parseInt(pageParam || '1', 10) || 1))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (config.layoutVariant === 'streetwear-editorial') {
    const streetwearProducts: StreetwearProduct[] = pageRows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUrl: r.image_url,
      priceCents: r.price_cents || 0,
      category: r.category || null,
      createdAt: r.created_at || null,
      colorOptions: r.color_options || [],
      sizeOptions: r.size_options || [],
    }))
    return (
      <StreetwearShopGrid
        config={config}
        products={streetwearProducts}
        heading="Shop All"
        subheading={`${filtered.length} item${filtered.length === 1 ? '' : 's'} — the full catalog.`}
        page={page}
        totalPages={totalPages}
        basePath="/shop"
      />
    )
  }

  const products: ShopProduct[] = pageRows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    imageUrl: r.image_url,
    priceCents: r.price_cents || 0,
    category: r.category || null,
    colorOptions: r.color_options || [],
    sizeOptions: r.size_options || [],
  }))
  return <ShopClient config={config} products={products} page={page} totalPages={totalPages} basePath="/shop" />
}
