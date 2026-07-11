// The NYC Exterminator — per-tenant authored config layer.
//
// Base-engine + per-tenant layer (Jeff, 2026-07): the base engine
// (agent-config-loader) derives a NEUTRAL AgentConfig from DB for every tenant.
// This file is the exterminator's authored OVERRIDE — folded in place of that
// neutral base for this ONE tenant, so it resolves to its own calm, reassuring
// pest-control persona instead of the generic professional default. The tenant's
// DB persona (tenants.selena_config) still layers ON TOP downstream via
// applyPersonaToConfig, so global/base code never overwrites tenant-authored data.
//
// Mirrors the per-tenant pattern of tenants/nycmaid.ts. nycmaid is NOT routed
// through here — it keeps its verbatim authored prompt via agent.ts's short-
// circuit and stays byte-unchanged.
//
// This file also WIRES `exterminatorAgentConfig`, which lived in agent-config.ts
// but was never imported anywhere (dead scaffolding) until now.
import type { AgentConfig } from '../agent-config'
import { exterminatorAgentConfig } from '../agent-config'

/** Tenant slug this config serves (tenants.slug). */
export const EXTERMINATOR_SLUG = 'the-nyc-exterminator'

/** The exterminator's authored persona + policy config (base for this tenant). */
export const exterminatorConfig: AgentConfig = exterminatorAgentConfig
