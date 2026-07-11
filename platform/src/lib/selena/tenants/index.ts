// Per-tenant authored AgentConfig registry — the "layer" over the neutral base
// engine (agent-config-loader). Keyed by tenant slug (tenants.slug). Tenants NOT
// listed here ride the neutral derivation. Migrating one tenant at a time:
// exterminator first.
//
// nycmaid is intentionally ABSENT — it keeps its verbatim authored prompt via
// agent.ts's short-circuit (SHARED_PREAMBLE + NYCMAID_PLAYBOOK) and MUST stay
// byte-unchanged. Routing it through here would change its assembled prompt.
import type { AgentConfig } from '../agent-config'
import { EXTERMINATOR_SLUG, exterminatorConfig } from './the-nyc-exterminator'
import { NYC_TOW_SLUG, nycTowConfig } from './nyc-tow'
import { NYC_MOBILE_SALON_SLUG, nycMobileSalonConfig } from './nyc-mobile-salon'
import { WE_PAY_YOU_JUNK_SLUG, wePayYouJunkConfig } from './we-pay-you-junk'
import { LANDSCAPING_IN_NYC_SLUG, landscapingInNycConfig } from './landscaping-in-nyc'

const AUTHORED_CONFIGS: Record<string, AgentConfig> = {
  [EXTERMINATOR_SLUG]: exterminatorConfig,
  [NYC_TOW_SLUG]: nycTowConfig,
  [NYC_MOBILE_SALON_SLUG]: nycMobileSalonConfig,
  [WE_PAY_YOU_JUNK_SLUG]: wePayYouJunkConfig,
  [LANDSCAPING_IN_NYC_SLUG]: landscapingInNycConfig,
}

/**
 * Return the authored config for a tenant slug, or null if the tenant rides the
 * neutral base engine. Null on empty/unknown slug — the base engine handles it.
 */
export function getAuthoredConfig(slug: string | null | undefined): AgentConfig | null {
  return slug ? AUTHORED_CONFIGS[slug] ?? null : null
}
