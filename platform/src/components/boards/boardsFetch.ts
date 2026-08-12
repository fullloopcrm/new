// A plain fetch() that hits an expired/invalid session silently "succeeds" —
// Next's auth middleware redirects to /sign-in (or /admin-login) and the
// browser follows it to a 200 HTML page, so `res.ok` is true even though
// nothing happened server-side. This wrapper detects that (redirected, or
// non-JSON content-type) and surfaces it as a real error instead of letting
// callers silently render an empty board / no-op a create.
export async function boardsFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    return { ok: false, error: 'Network error — check your connection and try again.' }
  }

  if (res.redirected || !(res.headers.get('content-type') || '').includes('application/json')) {
    return { ok: false, error: 'Session expired — refresh the page and sign in again.' }
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: (data && data.error) || 'Request failed' }
  return { ok: true, data }
}
