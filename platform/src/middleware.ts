import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Public routes that don't require auth
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pricing',
  '/features',
  '/businesses',
  '/locations(.*)',
  '/services(.*)',
  '/about',
  '/faq',
  '/contact',
  '/crm-partnership-request-form',
  '/feedback',
  '/api/webhooks(.*)',
  '/api/cron(.*)',
  '/team(.*)',              // Team portal uses PIN auth, not Clerk
  '/portal(.*)',            // Client portal uses phone/email auth, not Clerk
  '/join(.*)',              // Invite acceptance page
  '/referral(.*)',          // Public referral pages
  '/api/portal(.*)',        // Portal API routes
  '/api/team-portal(.*)',   // Team portal API routes
  '/api/leads',             // Lead capture from onboarding
  '/api/leads/visits(.*)',  // Visit tracking pixel
  '/api/referrals/track(.*)', // Referral click tracking
  '/api/health',              // Health check endpoint
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
