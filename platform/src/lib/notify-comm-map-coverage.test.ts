/**
 * Regression guard for a real, previously-unverified gap in the
 * comms-preference gate (docs/readiness/ledger.json, ai-05, 2026-07-31
 * re-check): notify()'s NOTIFY_COMM_MAP gate only applies to a call site
 * whose `type:recipientType` (or bare `type`) has an entry in the map —
 * everything else is fail-open and sends through email/SMS unconditionally,
 * regardless of the tenant's or recipient's comms preferences.
 *
 * That's a deliberate design choice (see notify.ts's own comment above the
 * gate), not a bug by itself. But the prior evidence for this checkpoint
 * explicitly flagged it as unverified: "whether every notify() call site's
 * `type` has a NOTIFY_COMM_MAP entry ... would require enumerating every
 * notify() call across the app, out of scope for this pass."
 *
 * This test does that enumeration for real, via the TypeScript AST (not
 * regex), and pins the exact set of statically-resolvable (type,
 * recipientType, channel) triples that currently bypass the gate. It is
 * NOT a correctness assertion that every one of these SHOULD be gated —
 * some clearly shouldn't (e.g. portal_pin_reset is security-critical and
 * should probably always send). It exists so a NEW ungated real send path
 * can't appear silently: this test fails the moment the live set diverges
 * from the pinned snapshot, forcing whoever added it to either add a
 * NOTIFY_COMM_MAP entry or explicitly update this snapshot (and think about
 * whether that's the right call).
 *
 * CORRECTION (2026-07-31, same day, ai-05 second re-check): this file's
 * original version flagged `campaign_sent` (client, email AND sms) as a
 * real, unresolved risk — "a marketing send that currently ignores
 * comms-preference/opt-out settings entirely." That was wrong. Deeper
 * verification (src/app/api/campaigns/send/route.marketing-optout.test.ts,
 * 5 passing tests against the real route logic) found campaigns/send/
 * route.ts enforces marketing opt-out via a SEPARATE, dedicated mechanism
 * BEFORE it ever calls notify(): it filters the audience against
 * clients.email_marketing_opt_out / sms_marketing_opt_out / sms_consent at
 * recipient-list-build time, so an opted-out client's id is never even
 * passed to notify(). `campaign_sent` genuinely has no NOTIFY_COMM_MAP
 * entry (that mechanical fact stands, see the pinned list below), but that
 * does NOT mean opted-out clients receive marketing sends — a different,
 * real, working guard already exists upstream. Left in the pinned ungated
 * list below because it's still mechanically true that notify()'s own gate
 * doesn't cover it (informational), not because it's still believed to be
 * a live compliance risk.
 */
import { describe, it, expect } from 'vitest'
import ts from 'typescript'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const ROOT = path.resolve(__dirname, '../..')

function scanNotifyCallSites() {
  const files = execSync(
    `grep -rl "from '@/lib/notify'" src --include="*.ts" | grep -v '\\.test\\.ts'`,
    { cwd: ROOT, encoding: 'utf8' },
  ).trim().split('\n').filter(Boolean)

  const registrySrc = fs.readFileSync(path.join(ROOT, 'src/lib/comms-registry.ts'), 'utf8')
  const mapMatch = registrySrc.match(/export const NOTIFY_COMM_MAP[^{]*\{([\s\S]*?)\n\}/)
  const mapKeys = new Set<string>()
  if (mapMatch) {
    for (const m of mapMatch[1].matchAll(/'([^']+)':\s*'([^']+)'/g)) mapKeys.add(m[1])
  }

  const gated: string[] = []
  const ungated: string[] = []
  const dynamic: string[] = []

  for (const relFile of files) {
    const filePath = path.join(ROOT, relFile)
    const src = fs.readFileSync(filePath, 'utf8')
    const sf = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

    const literalStr = (node: ts.Expression | undefined): string | null | undefined => {
      if (!node) return undefined
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
      return null
    }

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'notify') {
        const arg = node.arguments[0]
        if (arg && ts.isObjectLiteralExpression(arg)) {
          const props: Record<string, string | null | undefined> = {}
          for (const p of arg.properties) {
            if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) {
              props[p.name.text] = literalStr(p.initializer as ts.Expression)
            } else if (ts.isShorthandPropertyAssignment(p)) {
              props[p.name.text] = null
            }
          }
          const type = props.type
          const channel = props.channel === undefined ? 'email' : props.channel
          const recipientType = props.recipientType === undefined ? 'admin' : props.recipientType

          if (type === null || type === undefined || channel === null || recipientType === null) {
            dynamic.push(relFile)
            return
          }
          if (channel !== 'email' && channel !== 'sms') {
            // not subject to the gate at all
            ts.forEachChild(node, visit)
            return
          }
          const key = mapKeys.has(`${type}:${recipientType}`) ? `${type}:${recipientType}` : (mapKeys.has(type) ? type : null)
          const triple = `${type}|${recipientType}|${channel}`
          if (key) gated.push(triple)
          else ungated.push(triple)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }

  return {
    gatedCount: gated.length,
    ungated: [...new Set(ungated)].sort(),
    dynamicFileCount: new Set(dynamic).size,
  }
}

// Snapshot pinned 2026-07-31 from a full scan of every real notify() call
// site (56 files importing from '@/lib/notify', 87 total call sites: 31
// gated, 37 ungated with a statically-resolvable type/channel/recipientType,
// 18 dynamic/unresolvable, 1 non-email/sms channel). Update this list only
// when you've deliberately decided a new ungated send path is correct —
// don't just paste in whatever the scan produces to make the test pass.
const PINNED_UNGATED = [
  'booking_cancelled|admin|email',
  'booking_reminder|team_member|sms',
  'booking_rescheduled|admin|email',
  'booking_rescheduled|team_member|sms',
  'campaign_sent|client|email',
  'campaign_sent|client|sms',
  'check_in|admin|email',
  'comms_fail|admin|email',
  'duplicate_recurring_schedule|admin|email',
  'error|admin|email',
  'follow_up|admin|email',
  'late_check_in|admin|email',
  'lifecycle_change|admin|email',
  'pending_reminder|admin|email',
  'portal_pin_reset|client|email',
  'portal_pin_reset|team_member|email',
  'daily_digest|admin|email',
  'recurring_expiring|admin|email',
  'referral_lead|admin|email',
  'review_received|admin|email',
  'running_late|admin|email',
  'team_confirm_request|team_member|sms',
  'team_member_added|admin|email',
  'team_member_added|team_member|sms',
].sort()

describe('notify() comms-preference gate coverage (ai-05)', () => {
  it('every real, statically-resolvable email/sms send site is either gated or explicitly acknowledged as ungated', () => {
    const scan = scanNotifyCallSites()
    // Fails if a NEW ungated (type, recipientType, channel) combo shows up
    // that isn't in the pinned list -- forces a conscious decision instead
    // of a silent gap.
    expect(scan.ungated).toEqual(PINNED_UNGATED)
  })

  it('the gated count has not silently regressed to zero', () => {
    const scan = scanNotifyCallSites()
    expect(scan.gatedCount).toBeGreaterThan(20)
  })
})

/**
 * ai-05 further re-check (2026-07-31, round 2): the correction above only
 * individually re-audited `campaign_sent` (the one item explicitly flagged
 * as consequential). The other items in PINNED_UNGATED were never
 * categorized by who actually receives them -- that matters because the
 * real compliance/consent exposure of an ungated send is almost entirely a
 * function of audience: `admin` (the tenant owner receiving their own
 * business's operational alerts) and `team_member` (an employee receiving
 * job-assignment / onboarding operational messages) are not the kind of
 * recipient marketing-opt-out law is written to protect -- `client` is.
 *
 * Full categorization of the current pinned list (24 unique triples):
 *   - 16 audience=admin   -- owner-facing operational/system alerts, not a
 *     consumer-consent concern by construction (the recipient IS the
 *     business).
 *   - 5  audience=team_member -- booking_reminder/booking_rescheduled/
 *     team_confirm_request/team_member_added: employment-operational sends
 *     (shift reminders, confirmations, onboarding), not marketing.
 *   - 3  audience=client:
 *       - campaign_sent|client|email, campaign_sent|client|sms -- already
 *         individually verified (route.marketing-optout.test.ts): a
 *         separate, real, working opt-out guard runs upstream of notify()
 *         for this exact send path.
 *       - portal_pin_reset|client|email -- security-critical account-access
 *         send (client.ts / cleaners.ts PIN reset), the same category the
 *         original scan already called out as "should probably always
 *         send" -- verified via direct read of both real call sites
 *         (src/app/api/clients/[id]/route.ts, src/app/api/cleaners/[id]/
 *         route.ts): both are genuine PIN-reset flows, not a relabeled
 *         marketing send.
 *
 * Net finding: of the 24 currently-ungated triples, zero are an
 * unaddressed client-facing marketing/consent risk. This test pins that
 * audience breakdown so a NEW client-audience ungated entry (the one
 * category that actually matters here) can't silently slip into the
 * "already fine" bucket -- it will fail this test until someone explicitly
 * decides whether it needs a NOTIFY_COMM_MAP entry, an upstream guard like
 * campaign_sent's, or is a deliberate transactional exception like
 * portal_pin_reset.
 */
describe('notify() ungated-list audience risk categorization (ai-05, round 2)', () => {
  const KNOWN_SAFE_CLIENT_UNGATED = [
    'campaign_sent|client|email',
    'campaign_sent|client|sms',
    'portal_pin_reset|client|email',
  ].sort()

  it('every currently-ungated client-audience triple is one of the already-individually-verified exceptions', () => {
    const clientUngated = PINNED_UNGATED.filter((t) => t.split('|')[1] === 'client').sort()
    expect(clientUngated).toEqual(KNOWN_SAFE_CLIENT_UNGATED)
  })

  it('the ungated list has not silently grown a new client-audience entry beyond the known-safe set', () => {
    const scan = scanNotifyCallSites()
    const clientUngated = scan.ungated.filter((t) => t.split('|')[1] === 'client').sort()
    expect(clientUngated).toEqual(KNOWN_SAFE_CLIENT_UNGATED)
  })
})
