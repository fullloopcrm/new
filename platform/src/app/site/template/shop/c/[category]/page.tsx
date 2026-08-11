import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { getTenantFromHeaders, getTenantServices } from '@/lib/tenant-site'
import ShopClient, { type ShopProduct } from '@/app/site/template/_components/ShopClient'
import StreetwearShopGrid, { type StreetwearProduct } from '@/app/site/template/_components/streetwear/StreetwearShopGrid'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

// Generic category-scoped shop page — NOT specific to any one tenant's
// taxonomy. Filters a tenant's own product `category` values by a slug
// match, so it works for whatever categories a tenant's Items list actually
// uses (Fellas/Ladies/Accessories, or any other vertical's own grouping).
// Distinct indexable pages per category (own <title>/<meta description>) is
// the point — better for category-keyword SEO than one filtered /shop page.
function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function loadCategoryProducts(categorySlug: string, page: number) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) {
    return { products: [] as ShopProduct[], streetwearProducts: [] as StreetwearProduct[], categoryLabel: null as string | null, totalCount: 0, totalPages: 1 }
  }
  const rows = await getTenantServices(tenant.id)
  const matches = rows.filter(
    (r) => r.item_type === 'product' && (r.price_cents || 0) > 0 && r.category && slugify(r.category) === categorySlug
  )
  const categoryLabel = matches[0]?.category ?? null
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const pageRows = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
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
  return { products, streetwearProducts, categoryLabel, totalCount: matches.length, totalPages }
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const config = await getSiteConfig()
  const { categoryLabel } = await loadCategoryProducts(category, 1)
  const label = categoryLabel || category
  const title = `${label} | Shop ${config.identity.name}`
  const description = `Shop ${label} from ${config.identity.name} — ${config.geo.placename !== 'Your City' ? config.geo.placename : 'New York City'} streetwear.`
  return {
    title,
    description,
    alternates: { canonical: `${config.identity.url}/shop/c/${category}` },
    openGraph: { title, description, url: `${config.identity.url}/shop/c/${category}` },
  }
}

export default async function ShopCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { category } = await params
  const config = await getSiteConfig()
  if (!config.storefrontEnabled) notFound()
  const { page: pageParam } = await searchParams
  const requestedPage = Math.max(1, parseInt(pageParam || '1', 10) || 1)
  const { products, streetwearProducts, categoryLabel, totalCount, totalPages } = await loadCategoryProducts(category, requestedPage)
  if (!categoryLabel) notFound()
  const page = Math.min(totalPages, requestedPage)
  const basePath = `/shop/c/${category}`

  if (config.layoutVariant === 'streetwear-editorial') {
    return (
      <StreetwearShopGrid
        config={config}
        products={streetwearProducts}
        heading={categoryLabel}
        subheading={`${totalCount} item${totalCount === 1 ? '' : 's'} in ${categoryLabel}.`}
        page={page}
        totalPages={totalPages}
        basePath={basePath}
      />
    )
  }
  return <ShopClient config={config} products={products} page={page} totalPages={totalPages} basePath={basePath} />
}
