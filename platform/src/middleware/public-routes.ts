import type { NextRequest } from 'next/server'

// Local path matcher. Patterns use the same '(.*)' glob syntax; each is
// anchored and tested against the pathname.
function createRouteMatcher(patterns: string[]) {
  const res = patterns.map((p) => new RegExp('^' + p.replace(/\(\.\*\)/g, '.*') + '$'))
  return (req: NextRequest) => res.some((re) => re.test(req.nextUrl.pathname))
}

// Public routes that don't require auth
export const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/full-loop-crm-service-features',
  '/partner-with-full-loop-crm',
  '/full-loop-crm-pricing',
  '/full-loop-crm-frequently-asked-questions',
  '/agreement',
  '/waitlist',
  '/onboarding(.*)',
  '/onboard(.*)',             // Public, no-login per-tenant onboarding-questionnaire link (signed token)
  '/api/tenant-profile(.*)',  // Backs /onboard/[token] — auths itself (session OR signed token), not Clerk
  '/api/catalog(.*)',         // GET/POST/DELETE auth themselves the same way (session OR signed token) so
                              // /onboard/[token]'s Services & Pricing step can add real catalog items before
                              // login; PATCH still requires a real session internally (route.ts, unchanged).
  '/api/onboarding/messages(.*)', // Backs the /onboard/[token] chat widget — same dual auth as /api/tenant-profile.
  '/api/onboarding/coverage(.*)', // Backs the /onboard/[token] radius-based zone auto-populate — same dual auth.
  '/api/onboarding/pin(.*)',      // PIN gate for /onboard/[token] itself — must be reachable BEFORE a token is
                                   // ever PIN-verified, so it can't require a session or an already-elevated token.
  '/api/uploads(.*)',         // Same dual auth (session OR signed token) — lets /onboard/[token]'s Licensing &
                              // Insurance step upload real files (insurance cert, license scan, W-9) before login.
                              // Still 401s without either a session or a valid token — see route.ts.
  '/businesses',
  '/full-loop-crm-service-business-industries',
  '/industry(.*)',
  '/feature(.*)',           // Per-feature SEO landing pages
  '/(.*)-business-crm',
  '/crm-for-(.*)',
  '/locations(.*)',
  '/home-service-crm-locations',
  '/services(.*)',
  '/about-full-loop-crm',
  '/contact',
  '/privacy-policy',
  '/terms',
  '/accessibility',
  '/full-loop-crm-101-educational-tips',
  '/why-you-should-choose-full-loop-crm-for-your-business',
  '/case-study(.*)',
  '/home-service-business-blog(.*)',
  '/feedback',
  '/location(.*)',
  '/api/webhooks(.*)',
  '/api/cron(.*)',
  '/team(.*)',              // Team portal uses PIN auth, not Clerk
  '/portal(.*)',            // Client portal uses phone/email auth, not Clerk
  '/join(.*)',              // Invite acceptance page
  '/referral(.*)',          // Public referral pages
  '/sales(.*)',             // Sales partner portal (email+PIN auth, not Clerk)
  '/api/portal(.*)',        // Portal API routes
  '/api/team-portal(.*)',   // Team portal API routes
  // Mobile app API routes use a bearer token (getTenantForRequest()'s mobile
  // branch), not Clerk — without this, Clerk's own gate 307s every mobile
  // request to /sign-in before the route's real auth ever runs. Found via
  // /api/mobile/comhub/send specifically 2026-08-05 (testing only ever hit a
  // Vercel preview URL, which isn't in MAIN_HOSTS and skips this gate
  // silently — a real MAIN_HOSTS hit exposed it). Blanket-matched since every
  // route under /api/mobile is app-facing today; if an admin/dashboard-only
  // route is ever added under this prefix, give it its own Clerk-gated path
  // instead of relying on this being narrow.
  '/api/mobile(.*)',
  // Same gap, hit live testing these three 2026-08-06: the mobile Admin tab
  // calls these existing web-dashboard routes directly with its bearer
  // token (they already authenticate via getTenantForRequest(), same as
  // the /api/mobile/* routes above — no separate mobile copies needed) but
  // Clerk's gate 307'd every one of them before that auth ever ran. Listed
  // individually, not a blanket '/api(.*)', since most other /api routes
  // here genuinely are Clerk-session-only.
  '/api/dashboard',
  '/api/clients(.*)',
  '/api/schedules(.*)',
  // Sales Partner + Referrer portal routes the mobile app calls directly
  // with a bearer token (getSalesPartnerAuth / getReferrerAuth read
  // Authorization themselves, no Clerk needed) — same MAIN_HOSTS gap as the
  // /api/mobile(.*) entries above: 2026-08-05 testing only ever hit a
  // Vercel preview URL, which skips this whole Clerk gate. Scoped narrowly,
  // NOT a blanket '/api/sales-partners(.*)' or '/api/referrers(.*)' — those
  // prefixes also carry admin/dashboard-management routes (e.g.
  // /api/sales-partners (bare, admin create/list), /api/referrers/analytics)
  // that must stay Clerk-gated.
  '/api/sales-partners/me',            // Sales partner's own dashboard data (GET/PUT)
  '/api/referrers/auth(.*)',           // Referrer OTP login (request + verify) — no other routes
                                        // live under /api/referrers/auth/, safe to wildcard this segment
  '/api/referrers/connect/[^/]+/stripe-onboard(.*)', // Referrer Stripe Connect onboarding (POST)
  '/api/referrers/(?!analytics|auth|connect)[^/]+', // Referrer's own dashboard data by code (GET) —
                                        // negative lookahead excludes the sibling static routes
                                        // (analytics/auth/connect) which must stay Clerk-gated.
  '/api/leads',             // Lead capture from onboarding
  '/api/leads/visits(.*)',  // Visit tracking pixel
  '/api/company/track(.*)', // Full Loop's own marketing-site visit tracking beacon
  '/api/referrals/track(.*)', // Referral click tracking
  '/api/health',              // Health check endpoint
  '/admin(.*)',               // Admin uses PIN auth, not Clerk
  '/admin-login',             // Admin PIN login page
  '/fullloop',                // Per-tenant operator PIN login page
  '/reset-pin',               // Self-service tenant PIN reset page
  '/api/pin-reset(.*)',       // Self-service PIN reset (tenant via signed header)
  '/api/admin-auth(.*)',       // Admin PIN auth endpoint
  '/api/admin(.*)',            // Admin API routes use PIN auth, not Clerk
  '/proposal(.*)',            // Post-payment redirect pages (thank-you / cancelled)
  '/api/requests',            // Partnership form submissions
  '/api/territories/options', // Public territory/category options for the lead form (no PII)
  '/geo(.*)',                 // Static map assets (US county polygons) for the territory map
  '/api/inquiry',             // Marketing-site contact form (homeservicesbusinesscrm.com/contact)
  '/api/feedback',            // Feedback form submissions
  '/api/contact',             // Tenant-aware contact form lead capture (tenant resolved from host)
  '/api/public-upload',       // Public tenant-aware media upload for marketing-site forms (size/type limited)
  '/api/public/webchat(.*)',  // Public web-chatbot widget — anonymous visitor chat, tenant via signed header
  '/api/ingest(.*)',          // Cross-site application ingest (INGEST_SECRET-gated, tenant via slug)
  '/api/chat',                // Public web chat for tenant sites
  '/api/yinez(.*)',           // Public Yinez agent chat endpoint
  '/api/admin-chat(.*)',      // Admin chat (Yinez owner-side) uses admin PIN auth
  '/api/auth(.*)',            // Ported nycmaid cookie/bcrypt auth endpoints
  '/api/client-analytics(.*)', // Client analytics admin endpoint (admin PIN gated in route)
  '/api/selena(.*)',          // Selena API routes
  '/api/tenant-sitemap',       // Tenant sitemap endpoint
  '/api/tenant/public',        // Public tenant branding (name/colors/logo) for anonymous visitors
  '/sitemap.xml',             // Sitemap
  '/robots.txt',              // Robots
  // Next.js auto-generated metadata image routes — not in this list, Clerk's
  // gate 307'd every one of them to /sign-in before their route handler ever
  // ran. Every schema.tsx `image` field and every page's social-share card
  // pointed at homeservicesbusinesscrm.com/opengraph-image, which returned
  // the sign-in page instead of an image. Found 2026-08-19 auditing schema.
  '/opengraph-image',
  '/twitter-image',
  '/icon',
  '/apple-icon',
  '/(.*)-crm-(.*)',           // Combo pages (industry x location)
  '/site(.*)',                // Tenant sites are public
  '/quote/(.*)',              // Public quote view + accept flow (token-auth)
  '/api/quotes/public(.*)',   // Public quote API (token-auth)
  '/invoice/(.*)',            // Public invoice view + pay flow (token-auth)
  '/api/invoices/public(.*)', // Public invoice API (token-auth)
  '/sign/(.*)',               // Public document signer view (token-auth)
  '/api/documents/public(.*)', // Public document signer API (token-auth)
  '/photos/(.*)',              // Public job-photo timeline view (token-auth)
  '/api/jobs/public(.*)',      // Public job-photo timeline API (token-auth)
  '/api/cpa/(.*)',             // CPA read-only access (token-auth)
  '/qualify',                  // Public prospect application form
  '/qualify(.*)',              // e.g. /qualify?cancelled=1
  '/welcome',                  // Post-Stripe-payment landing page
  '/api/prospects',            // Public prospect intake
  '/api/territories/options',  // Public territory + service-category options for lead forms
  '/api/client(.*)',           // Ported nycmaid client-portal routes — tenant
                               // resolved via signed x-tenant-id header, not Clerk
  '/api/cleaner-applications', // Alias → /api/team-applications
  '/api/errors',               // Client-side error reporting — runs from any page
  '/api/track',                // Visit tracking pixel
  '/api/unsubscribe',          // Email unsubscribe (signed token verified in route)
])
