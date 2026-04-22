/**
 * Nycmaid-compat alias. The copied /site/apply frontend posts here.
 * Fullloop's canonical endpoint is /api/team-applications (tenant-aware,
 * Zod-validated, DNS-checked). This route forwards POST+GET to it so
 * the ported frontend works without edits.
 *
 * For new tenants / new code, use /api/team-applications directly.
 */
import { GET as teamAppsGet, POST as teamAppsPost, PUT as teamAppsPut, DELETE as teamAppsDelete } from '../team-applications/route'

export const GET = teamAppsGet
export const POST = teamAppsPost
export const PUT = teamAppsPut
export const DELETE = teamAppsDelete
