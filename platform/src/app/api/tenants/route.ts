import { NextResponse } from 'next/server'

// Self-service business signup created a tenant owned by the signed-in Clerk
// user (via `auth()` + a `tenant_members.clerk_user_id` row). Clerk auth is
// retired and tenants are now provisioned by platform admin, so this endpoint
// is disabled. The former onboarding form (src/app/onboarding) posted here and
// now receives 410. The old per-industry default-service catalogs lived here
// too and were removed with the endpoint.
export async function POST() {
  return NextResponse.json({ error: 'Self-service signup is disabled' }, { status: 410 })
}
