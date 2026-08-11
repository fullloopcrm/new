import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSiteConfig } from '@/app/site/template/_config/load'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { supabaseAdmin } from '@/lib/supabase'
import ProductDetailClient from '@/app/site/template/_components/ProductDetailClient'

export const dynamic = 'force-dynamic'

async function loadProduct(id: string) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return null
  const { data } = await supabaseAdmin
    .from('service_types')
    .select('id, name, description, image_url, price_cents, category, is_digital, active, color_options, size_options')
    .eq('tenant_id', tenant.id)
    .eq('item_type', 'product')
    .eq('id', id)
    .maybeSingle()
  if (!data || !data.active || (data.price_cents || 0) <= 0) return null
  return data
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const config = await getSiteConfig()
  const product = await loadProduct(id)
  const title = product ? `${product.name} | ${config.identity.name}` : `Shop | ${config.identity.name}`
  return {
    title,
    description: product?.description || `Shop products from ${config.identity.name}.`,
    alternates: { canonical: `${config.identity.url}/shop/${id}` },
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const config = await getSiteConfig()
  if (!config.storefrontEnabled) notFound()
  const product = await loadProduct(id)
  if (!product) notFound()

  return (
    <ProductDetailClient
      config={config}
      product={{
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.image_url,
        priceCents: product.price_cents || 0,
        category: product.category,
        isDigital: product.is_digital,
        colorOptions: product.color_options || [],
        sizeOptions: product.size_options || [],
      }}
    />
  )
}
