import { safeJsonLd } from '@/lib/escape-html'
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const schemas = Array.isArray(data) ? data : [data]
  // Escape "<" so a tenant-controlled field (e.g. business name) containing
  // "</script>" cannot break out of this script tag (stored XSS). Mirrors
  // we-pay-you-junk/_components/JsonLd.tsx.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schemas) }}
    />
  )
}
