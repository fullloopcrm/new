import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Public routes that don't require auth
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/full-loop-crm-pricing',
  '/full-loop-crm-service-features',
  '/businesses',
  '/full-loop-crm-service-business-industries',
  '/industry(.*)',
  '/(.*)-business-crm',
  '/crm-for-(.*)',
  '/locations(.*)',
  '/services(.*)',
  '/about-full-loop-crm',
  '/full-loop-crm-frequently-asked-questions',
  '/contact',
  '/privacy-policy',
  '/terms',
  '/accessibility',
  '/full-loop-crm-101-educational-tips',
  '/why-you-should-choose-full-loop-crm-for-your-business',
  '/partner-with-full-loop-crm',
  '/crm-partnership-request-form',
  '/feedback',
  '/location(.*)',
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
  '/admin(.*)',               // Admin uses PIN auth, not Clerk
  '/admin-login',             // Admin PIN login page
  '/api/admin-auth(.*)',       // Admin PIN auth endpoint
  '/api/admin(.*)',            // Admin API routes use PIN auth, not Clerk
  '/api/requests',            // Partnership form submissions
  '/api/feedback',            // Feedback form submissions
  '/sitemap.xml',             // Sitemap
  '/robots.txt',              // Robots
  '/(.*)-crm-(.*)',           // Combo pages (industry x location)
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Allow admin impersonation to bypass Clerk on dashboard + its API routes
    const impersonateCookie = req.cookies.get('fl_impersonate')?.value
    const adminCookie = req.cookies.get('admin_token')?.value
    if (impersonateCookie && adminCookie) {
      const p = req.nextUrl.pathname
      if (p.startsWith('/dashboard') || p.startsWith('/api/bookings') || p.startsWith('/api/clients') ||
          p.startsWith('/api/team') || p.startsWith('/api/finance') || p.startsWith('/api/campaigns') ||
          p.startsWith('/api/referrals') || p.startsWith('/api/settings') || p.startsWith('/api/google') ||
          p.startsWith('/api/social') || p.startsWith('/api/changelog') || p.startsWith('/api/feedback') ||
          p.startsWith('/api/security') || p.startsWith('/api/availability') || p.startsWith('/api/setup-checklist') ||
          p.startsWith('/api/notifications')) {
        return
      }
    }
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
