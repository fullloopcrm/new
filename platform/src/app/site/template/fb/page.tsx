import { redirect } from 'next/navigation'

/**
 * Short branded alias for the feedback form (nycmaid used /fb for SMS links
 * where character count matters). Preserves ?from= so the source still
 * shows up on the client_feedback row.
 */
export default async function FbRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const from = params.from
  const query = typeof from === 'string' ? `?from=${encodeURIComponent(from)}` : ''
  redirect(`/feedback${query}`)
}
