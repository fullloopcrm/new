import { redirect } from 'next/navigation'

// Sunnyside Clean NYC no longer runs its own self-booking form — it redirects
// straight to NYC Maid's, carrying referral/attribution params (ref, src)
// through so tracking isn't lost on the hop.
export default async function BookNewRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') qs.set(key, value)
  }
  const query = qs.toString()
  redirect(`https://www.thenycmaid.com/book/new${query ? `?${query}` : ''}`)
}
