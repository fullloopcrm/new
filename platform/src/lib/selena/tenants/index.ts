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
import { THE_FLORIDA_MAID_SLUG, theFloridaMaidConfig } from './the-florida-maid'
import { NYC_ROADSIDE_SLUG, nycRoadsideConfig } from './nycroadsideemergencyassistance'
import { THE_ROADSIDE_HELPER_SLUG, theRoadsideHelperConfig } from './theroadsidehelper'
import { SUNNYSIDE_CLEAN_SLUG, sunnysideCleanConfig } from './sunnyside-clean-nyc'
import { WASH_AND_FOLD_NYC_SLUG, washAndFoldNycConfig } from './wash-and-fold-nyc'
import { FLA_DUMPSTER_RENTALS_SLUG, flaDumpsterRentalsConfig } from './fla-dumpster-rentals'
import { STRETCH_NY_SLUG, stretchNyConfig } from './stretch-ny'
import { STRETCH_SERVICE_SLUG, stretchServiceConfig } from './stretch-service'
import { DSCR_LOAN_SLUG, dscrLoanConfig } from './debt-service-ratio-loan'

const AUTHORED_CONFIGS: Record<string, AgentConfig> = {
  [EXTERMINATOR_SLUG]: exterminatorConfig,
  [NYC_TOW_SLUG]: nycTowConfig,
  [NYC_MOBILE_SALON_SLUG]: nycMobileSalonConfig,
  [WE_PAY_YOU_JUNK_SLUG]: wePayYouJunkConfig,
  [LANDSCAPING_IN_NYC_SLUG]: landscapingInNycConfig,
  [THE_FLORIDA_MAID_SLUG]: theFloridaMaidConfig,
  [NYC_ROADSIDE_SLUG]: nycRoadsideConfig,
  [THE_ROADSIDE_HELPER_SLUG]: theRoadsideHelperConfig,
  [SUNNYSIDE_CLEAN_SLUG]: sunnysideCleanConfig,
  [WASH_AND_FOLD_NYC_SLUG]: washAndFoldNycConfig,
  [FLA_DUMPSTER_RENTALS_SLUG]: flaDumpsterRentalsConfig,
  [STRETCH_NY_SLUG]: stretchNyConfig,
  [STRETCH_SERVICE_SLUG]: stretchServiceConfig,
  [DSCR_LOAN_SLUG]: dscrLoanConfig,
}

/**
 * Return the authored config for a tenant slug, or null if the tenant rides the
 * neutral base engine. Null on empty/unknown slug — the base engine handles it.
 */
export function getAuthoredConfig(slug: string | null | undefined): AgentConfig | null {
  return slug ? AUTHORED_CONFIGS[slug] ?? null : null
}
