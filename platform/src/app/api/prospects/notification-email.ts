import { escapeHtml } from '@/lib/escape-html'

/**
 * Build the admin "new /qualify lead" notification HTML. `summary` is a
 * newline-joined block assembled from a public, unauthenticated request body,
 * so it is escaped before interpolation — a `<pre>` does NOT neutralize tags.
 * `appUrl` is env-derived (trusted) and used only as a link base.
 */
export function buildProspectNotificationHtml(summary: string, appUrl: string): string {
  return `
            <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
              <h2 style="margin:0 0 12px;">New lead from /qualify</h2>
              <pre style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;white-space:pre-wrap;font-family:inherit;font-size:14px;color:#111827;">${escapeHtml(summary)}</pre>
              <p style="color:#6b7280;font-size:13px;margin-top:16px;">
                Review and approve in <a href="${appUrl}/admin/prospects">${appUrl}/admin/prospects</a>.
              </p>
            </div>
          `
}
