import { safeJsonLd } from '@/lib/escape-html'
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const schemas = Array.isArray(data) ? data : [data]
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schemas).replace(/</g, '\\u003c') }}
    />
  )
}
