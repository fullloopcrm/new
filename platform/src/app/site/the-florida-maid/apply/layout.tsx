import type { Metadata } from 'next'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'Apply to Clean — Highest Paid Cleaning Jobs in Florida, Same-Day Pay | Trabajo de Limpieza Florida',
  description:
    'Join The Florida Maid — Florida\'s highest-paying cleaning jobs starting at $30/hr with same-day pay. Apply now for full-time or part-time house cleaning work in Florida. Solicite ahora — los trabajos de limpieza mejor pagados en Florida.',
  alternates: { canonical: 'https://www.thefloridamaid.com/apply' },
  openGraph: {
    title: 'Apply to Clean — Highest Paid Cleaning Jobs in Florida, Same-Day Pay',
    description:
      'Florida\'s best cleaning opportunities. $30/hr+, same-day pay, flexible hours. Apply in 2 minutes.',
    url: 'https://www.thefloridamaid.com/apply',
    siteName: 'The Florida Maid',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Apply to Clean — Highest Paid Cleaning Jobs in Florida',
    description:
      'Florida\'s best cleaning opportunities. $30/hr+, same-day pay, flexible hours. Apply in 2 minutes.',
  },
  other: {
    'geo.region': 'US-FL',
    'geo.placename': 'Florida',
  },
}

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
  return (
    <>
      <Script id="floridamaid-analytics" src="/sites/the-florida-maid/t.js" strategy="afterInteractive" />
      {posthogKey && (
        <Script id="posthog-init" strategy="afterInteractive">{`
          !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
          posthog.init('${posthogKey}', { api_host: '${posthogHost}', person_profiles: 'identified_only', capture_pageview: true, session_recording: { maskAllInputs: true } });
        `}</Script>
      )}
      {children}
    </>
  )
}
