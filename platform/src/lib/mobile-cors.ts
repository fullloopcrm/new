import { NextResponse } from 'next/server'

// Mobile-facing API routes (bearer-token auth, no cookies read or set) are
// called from the React Native app's web preview (Expo web / a future PWA
// build) as well as native iOS/Android, which never enforces CORS at all.
// Without these headers the web preview's fetch() rejects with a generic
// "Failed to fetch" even when the server responded correctly — confirmed
// 2026-08-04 testing /api/mobile/unified-login (server returned a real 401,
// browser never saw it). Open origin is safe here specifically because auth
// is a bearer token in the body/response, not a cookie — there's no session
// to leak via CSRF the way there would be for the cookie-based web portals.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// Wraps a route handler so every response it returns — success or error,
// regardless of how many return statements the handler has — gets the CORS
// headers attached in one place, instead of editing every NextResponse.json
// call site individually (easy to miss one, and this file is meant to be a
// single load-bearing spot for the mobile-CORS decision, not scattered).
export function withMobileCors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    const response = await handler(...args)
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      response.headers.set(key, value)
    }
    return response
  }
}
