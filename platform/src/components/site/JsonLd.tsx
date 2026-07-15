export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const schemas = Array.isArray(data) ? data : [data]
  const json = JSON.stringify(schemas).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
