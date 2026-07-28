// Resolves the tenant-specific portion of Yinez's system prompt — the one
// decision point in the shared reasoning core (agent.ts) that used to be an
// inline `if (tenantId === NYCMAID_TENANT_ID)` branch. Pulled into its own
// function so every tenant, including nycmaid, goes through the SAME call
// path; nycmaid's "specialness" lives entirely in her own data (her verbatim
// authored playbook), not in a conditional inside the core loop.
//
// nycmaid keeps her authored prompt byte-identical — she predates the
// structured AgentConfig format (see agent-config.ts) and her ~2,500-line
// hand-authored playbook can't be losslessly expressed in that shape without
// risking a behavior regression on FullLoop's one live revenue tenant. Every
// other tenant rides the config-driven playbook + persona layer.
import { NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'
import { NYCMAID_PLAYBOOK } from './tenants/nycmaid'
import { getAgentConfig } from './agent-config-loader'
import { getPersona, applyPersonaToConfig, renderPersonaExtras } from './persona-file'
import { buildPlaybook } from './build-playbook'

export async function resolveBasePlaybook(tenantId: string): Promise<string> {
  if (tenantId === NYCMAID_TENANT_ID) return NYCMAID_PLAYBOOK

  const [cfg, persona] = await Promise.all([getAgentConfig(tenantId), getPersona(tenantId)])
  return buildPlaybook(applyPersonaToConfig(cfg, persona)) + renderPersonaExtras(persona)
}
