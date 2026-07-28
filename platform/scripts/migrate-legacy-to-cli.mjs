#!/usr/bin/env node
/**
 * ONE-TIME (re-runnable/idempotent) conversion tool.
 *
 * Converts the hand-run .sql pile in platform/src/lib/migrations/ (+ the one
 * stray file in platform/supabase/migrations/) into Supabase CLI migration
 * format under supabase/migrations/<YYYYMMDDHHMMSS>_<slug>.sql, so the
 * Supabase CLI's own tracked-state table (supabase_migrations.schema_migrations)
 * can adopt them as a baseline.
 *
 * This script only WRITES FILES. It does not touch any database, local or
 * remote. Marking the baseline "applied" against a real Postgres instance
 * (local Docker stack or prod) is a separate, explicit step — see
 * docs/adr/0008-migration-tool-cutover.md and
 * platform/docs/runbooks/migration-runbook.md for the exact commands and who
 * is authorized to run them against prod.
 *
 * Ordering: files are sorted by the git commit date that first added them
 * (real chronological history), not by filename, because the legacy
 * directory mixes two naming eras (001_foo.sql numeric era, then
 * YYYY_MM_DD_foo.sql dated era) that don't sort correctly against each other
 * as plain strings. Files with no git-add history found (e.g. uncommitted in
 * this worktree) fall back to "now", so they sort last — correct for the
 * one case that currently applies (today's RLS gap-closure file).
 *
 * Usage:
 *   node platform/scripts/migrate-legacy-to-cli.mjs             # convert baseline (all but --new-cutoff-date and later)
 *   node platform/scripts/migrate-legacy-to-cli.mjs --dry-run   # print the plan, write nothing
 *
 * Re-running is safe: existing supabase/migrations/*.sql files are never
 * overwritten (the script skips any legacy source file whose converted
 * output already exists under supabase/migrations/).
 */
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", ".."); // scripts/ -> platform/ -> repo root
const LEGACY_DIR = join(REPO_ROOT, "platform", "src", "lib", "migrations");
const STRAY_CLI_DIR = join(REPO_ROOT, "platform", "supabase", "migrations");
const OUT_DIR = join(REPO_ROOT, "supabase", "migrations");

// Files from today's RLS work that are the "prove the new tool works"
// migrations, NOT part of the already-live-in-prod baseline. Everything
// else gets marked "applied" in the baseline step; these are left PENDING
// so `supabase db push` is the thing that (eventually, with Jeff's go)
// applies them for real.
const NEW_NOT_YET_APPLIED = new Set([
  "2026_07_28_rls_gap_closure_post_july15.sql",
]);

const isDryRun = process.argv.includes("--dry-run");

function slugify(filename) {
  return filename
    .replace(/\.sql$/, "")
    .replace(/^[0-9]{3}_/, "") // strip legacy numeric prefix like "004_"
    .replace(/^[0-9]{4}_[0-9]{2}_[0-9]{2}_/, "") // strip legacy date prefix
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .toLowerCase();
}

function gitAddDates(dirsRelToRepo) {
  // filename (basename) -> ISO date string of first git commit that added it
  const map = new Map();
  const args = [
    "log",
    "--diff-filter=A",
    "--name-only",
    "--format=COMMIT %aI",
    "--",
    ...dirsRelToRepo,
  ];
  let out;
  try {
    out = execSync(`git ${args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(" ")}`, {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
  } catch {
    return map;
  }
  let currentDate = null;
  for (const line of out.split("\n")) {
    if (line.startsWith("COMMIT ")) {
      currentDate = line.slice("COMMIT ".length).trim();
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed || !currentDate) continue;
    const base = trimmed.split("/").pop();
    // git log walks newest-commit-first. We deliberately overwrite on every
    // occurrence, so after the full walk the map holds the OLDEST (last
    // processed) commit date for any file added more than once.
    map.set(base, currentDate);
  }
  return map;
}

function timestampFor(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}

function main() {
  const addDates = gitAddDates([
    "platform/src/lib/migrations",
    "platform/supabase/migrations",
  ]);

  const legacyFiles = readdirSync(LEGACY_DIR).filter((f) => f.endsWith(".sql"));
  const strayFiles = existsSync(STRAY_CLI_DIR)
    ? readdirSync(STRAY_CLI_DIR).filter((f) => f.endsWith(".sql"))
    : [];

  const entries = [];
  const now = new Date();
  for (const f of legacyFiles) {
    const iso = addDates.get(f) || now.toISOString();
    entries.push({ file: f, dir: LEGACY_DIR, iso, isNew: NEW_NOT_YET_APPLIED.has(f) });
  }
  for (const f of strayFiles) {
    const iso = addDates.get(f) || now.toISOString();
    entries.push({ file: f, dir: STRAY_CLI_DIR, iso, isNew: false });
  }

  // Sort chronologically by real git-add date so ordering is historically accurate.
  entries.sort((a, b) => new Date(a.iso) - new Date(b.iso));

  // Guarantee strictly increasing timestamps (supabase requires unique,
  // monotonic version prefixes) even if two files share the same second.
  let lastTs = "";
  const plan = [];
  for (const e of entries) {
    let ts = timestampFor(e.iso);
    if (ts <= lastTs) {
      ts = String(BigInt(lastTs) + 1n);
    }
    lastTs = ts;
    const outName = `${ts}_${slugify(e.file)}.sql`;
    plan.push({ ...e, ts, outName });
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  let skipped = 0;
  for (const p of plan) {
    const outPath = join(OUT_DIR, p.outName);
    if (existsSync(outPath)) {
      skipped++;
      continue;
    }
    const srcPath = join(p.dir, p.file);
    const original = readFileSync(srcPath, "utf8");
    const header = [
      `-- Adopted from legacy hand-run migration: ${p.file}`,
      `-- Original commit date (git first-add): ${p.iso}`,
      p.isNew
        ? "-- STATUS: NOT yet applied to prod. This is the first migration to go"
        : "-- STATUS: part of the baseline. Assumed already live in prod as of",
      p.isNew
        ? "-- through the new Supabase-CLI-tracked workflow. Apply via `supabase db push`"
        : "-- the 2026-07-28 cutover -- marked applied without re-running, per",
      p.isNew
        ? "-- after Jeff's go, per docs/runbooks/migration-runbook.md (still gated)."
        : "-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.",
      "",
    ].join("\n");
    if (!isDryRun) {
      writeFileSync(outPath, header + original);
    }
    written++;
  }

  const baselineCount = plan.filter((p) => !p.isNew).length;
  const newCount = plan.filter((p) => p.isNew).length;

  console.log(`Plan: ${plan.length} files (${baselineCount} baseline, ${newCount} new/pending)`);
  console.log(`${isDryRun ? "Would write" : "Wrote"}: ${written}, already present (skipped): ${skipped}`);
  if (newCount > 0) {
    console.log("New/pending migrations (NOT part of baseline-applied set):");
    for (const p of plan.filter((x) => x.isNew)) {
      console.log(`  - ${p.outName}  (source: ${p.file})`);
    }
  }
  console.log(`\nOutput dir: ${OUT_DIR}`);
  console.log("\nBaseline version list (for `supabase migration repair --status applied`):");
  console.log(plan.filter((p) => !p.isNew).map((p) => p.ts).join(" "));
}

main();
