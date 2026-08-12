// Keys must match the `section` prop passed to <SectionVisibility> in
// src/app/dashboard/page.tsx. Persisted per-tenant in tenants.setup_progress
// (same jsonb column + read-merge-write pattern as /api/settings/page-config),
// so every viewer of this tenant's Loop dashboard sees the same on/off state —
// this is UI config, not a per-tenant operator dashboard fork (see platform CLAUDE.md).
//
// Split out of route.ts — Next.js route files may only export HTTP method
// handlers (and a few config values).
export const VALID_SECTIONS = ['revenue', 'sales', 'jobs', 'jobs_by_month', 'kpis', 'today_tomorrow']
