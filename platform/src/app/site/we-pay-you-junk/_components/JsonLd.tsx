import { safeJsonLd } from '@/lib/json-ld-safe'

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />;
}
