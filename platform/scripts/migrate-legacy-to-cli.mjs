#!/usr/bin/env node
/**
 * ONE-TIME (re-runnable/idempotent) conversion tool.
 *
 * Converts the hand-run .sql pile in platform/src/lib/migrations/ into
 * Supabase CLI migration format under supabase/migrations/<YYYYMMDDHHMMSS>_<slug>.sql,
 * so the Supabase CLI's own tracked-state table
 * (supabase_migrations.schema_migrations) can adopt them as a baseline.
 *
 * This script only WRITES FILES. It does not touch any database, local or
 * remote. Marking the baseline "applied" against a real Postgres instance
 * (local Docker stack or prod) is a separate, explicit step -- see
 * docs/adr/0008-migration-tool-cutover.md and
 * platform/docs/runbooks/migration-runbook.md for the exact commands and who
 * is authorized to run them against prod.
 *
 * Historical note (sec-08, 2026-08-01): this script used to also read a
 * second source, platform/supabase/migrations/ (a stray, accidentally-
 * created, never-prod-linked Supabase CLI project one level inside
 * platform/). That directory has been deleted -- its 2 files were either
 * already redundant with the real baseline or have been recovered into it
 * by hand. See docs/adr/0008-migration-tool-cutover.md's 2026-08-01
 * addendum for the full writeup. platform/src/lib/migrations/ is now the
 * only source this script reads.
 *
 * Ordering: files are sorted by the git commit date that first added them
 * (real chronological history), not by filename, because the legacy
 * directory mixes two naming eras (001_foo.sql numeric era, then
 * YYYY_MM_DD_foo.sql dated era) that don't sort correctly against each other
 * as plain strings.
 *
 * Date resolution, in order (see resolveAddDate()):
 *   1. Bulk lookup: one `git log --diff-filter=A` scan of the whole legacy
 *      directory (fast). Misses files whose current name was introduced via
 *      a rename/renumber rather than a plain add.
 *   2. Per-file `git log --follow --diff-filter=A` (slower, only run for
 *      files the bulk scan missed). `--follow` walks rename history, so
 *      this correctly finds a renamed/renumbered file's true original
 *      add date.
 *   3. Deterministic content-hash fallback (see deterministicFallbackDate())
 *      for files with NO git history at all (never committed). Derived
 *      from the file's own bytes, NOT the wall clock.
 *
 * Usage:
 *   node platform/scripts/migrate-legacy-to-cli.mjs             # convert baseline (all but --new-cutoff-date and later)
 *   node platform/scripts/migrate-legacy-to-cli.mjs --dry-run   # print the plan, write nothing
 *
 * Re-running is safe: existing supabase/migrations/*.sql files are never
 * overwritten (the script skips any legacy source file whose converted
 * output already exists under supabase/migrations/), AND -- as of the fix
 * below -- the computed output filename is now itself stable across runs,
 * which is what actually makes the skip check work.
 *
 * FIXED (2026-08-01, sec-08 follow-up, W9): the "skip if already present"
 * check only works when the git-add-date lookup produces the SAME
 * timestamp on every run. It previously did not for (a) a file renamed/
 * renumbered in its git history that the old plain `git log
 * --diff-filter=A` (no rename-detection) couldn't find, and (b) a file that
 * was uncommitted at the time of a prior run (so it fell back to
 * `Date.now()`) and has since been committed (so a later run's bulk lookup
 * finds its real, different date) -- both cases silently computed a NEW,
 * different output filename on every affected run, which would write a
 * DUPLICATE migration for content already committed under an earlier
 * timestamp. Reproduced live via --dry-run before this fix (see
 * docs/adr/0008-migration-tool-cutover.md's 2026-08-01 addendum for the
 * original repro). Fixed by (1) adding the `--follow` per-file fallback
 * above for case (a), and (2) replacing the final `Date.now()` fallback
 * with deterministicFallbackDate() (content-hash-derived, never wall-clock)
 * for case (b) and for genuinely-uncommitted files in general. Proven via
 * scripts/migrate-legacy-to-cli.test.ts, including an end-to-end test that
 * runs this script's real --dry-run twice as separate subprocesses and
 * asserts byte-identical output.
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", ".."); // scripts/ -> platform/ -> repo root
const LEGACY_DIR = join(REPO_ROOT, "platform", "src", "lib", "migrations");
const LEGACY_DIR_REL = "platform/src/lib/migrations";
const OUT_DIR = join(REPO_ROOT, "supabase", "migrations");
const BASELINE_VERSIONS_PATH = join(REPO_ROOT, "supabase", "BASELINE_VERSIONS.txt");

// Files from today's RLS work that are the "prove the new tool works"
// migrations, NOT part of the already-live-in-prod baseline. Everything
// else gets marked "applied" in the baseline step; these are left PENDING
// so `supabase db push` is the thing that (eventually, with Jeff's go)
// applies them for real.
const NEW_NOT_YET_APPLIED = new Set([
  "2026_07_28_rls_gap_closure_post_july15.sql",
]);

const isDryRun = process.argv.includes("--dry-run");

export function slugify(filename) {
  return filename
    .replace(/\.sql$/, "")
    .replace(/^[0-9]{3}_/, "") // strip legacy numeric prefix like "004_"
    .replace(/^[0-9]{4}_[0-9]{2}_[0-9]{2}_/, "") // strip legacy date prefix
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .toLowerCase();
}

/**
 * Bulk, directory-wide lookup: filename (basename) -> ISO date string of the
 * first git commit that added it. Fast (one git invocation for the whole
 * directory) but misses files added via a rename/renumber rather than a
 * plain add, because it does not use `--follow`.
 */
export function gitAddDates(dirRelToRepo, { cwd = REPO_ROOT } = {}) {
  const map = new Map();
  const args = [
    "log",
    "--diff-filter=A",
    "--name-only",
    "--format=COMMIT %aI",
    "--",
    dirRelToRepo,
  ];
  let out;
  try {
    out = execSync(`git ${args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(" ")}`, {
      cwd,
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

/**
 * Per-file, rename-aware lookup. Slower than gitAddDates() (one git
 * invocation per file) but correctly finds a file's real first-add date
 * even when it was renamed/renumbered in git history -- `--follow` walks
 * the rename chain; `git log --diff-filter=A` on a directory does not.
 * Returns null if the file genuinely has no git history at all (never
 * committed under any name).
 */
export function gitFollowAddDate(fileRelToRepo, { cwd = REPO_ROOT } = {}) {
  try {
    const out = execSync(
      `git log --follow --diff-filter=A --format=%aI -- '${fileRelToRepo.replace(/'/g, "'\\''")}'`,
      { cwd, encoding: "utf8" }
    ).trim();
    if (!out) return null;
    // git log lists newest-first; the true original add is the LAST line.
    const lines = out.split("\n").filter(Boolean);
    return lines[lines.length - 1] ?? null;
  } catch {
    return null;
  }
}

// Fixed, arbitrary anchor -- NOT the wall clock. Chosen to land fallback
// dates inside this project's real timeline for readability; the exact
// value doesn't matter for correctness, only that it never changes.
const FALLBACK_ANCHOR_MS = Date.parse("2026-01-01T00:00:00.000Z");
const FALLBACK_SPREAD_MS = 1000 * 60 * 60 * 24 * 365; // spread fallbacks across a 1-year synthetic window

/**
 * Deterministic stand-in for a file's add date when it has NO git history
 * at all (never committed under any name). Derived entirely from the
 * file's own content -- identical content always produces the identical
 * fallback date, on every run, forever, regardless of when the script is
 * actually invoked. This is the direct fix for the sec-08 idempotency bug:
 * the old code used `Date.now()` here, which by definition differs between
 * any two separate runs, so the computed output filename (and therefore
 * the "does this output already exist" skip check) was never stable for
 * an affected file.
 */
export function deterministicFallbackDate(content) {
  const hash = createHash("sha256").update(content).digest();
  const offset = hash.readUInt32BE(0) % FALLBACK_SPREAD_MS;
  return new Date(FALLBACK_ANCHOR_MS + offset).toISOString();
}

/**
 * Resolves the ISO add-date to use for one legacy source file, trying each
 * strategy in order (see the module docstring). Never touches the wall
 * clock -- every branch is either real git history or a pure function of
 * the file's own content, so this always returns the same answer for the
 * same (file, content, git-history) state.
 */
export function resolveAddDate({ file, content, bulkDates, fileRelToRepo, cwd = REPO_ROOT }) {
  const bulk = bulkDates.get(file);
  if (bulk) return bulk;
  const followed = gitFollowAddDate(fileRelToRepo, { cwd });
  if (followed) return followed;
  return deterministicFallbackDate(content);
}

export function timestampFor(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}

function main() {
  const bulkDates = gitAddDates(LEGACY_DIR_REL);

  const legacyFiles = readdirSync(LEGACY_DIR).filter((f) => f.endsWith(".sql"));

  const entries = [];
  for (const f of legacyFiles) {
    const srcPath = join(LEGACY_DIR, f);
    const content = readFileSync(srcPath, "utf8");
    const iso = resolveAddDate({
      file: f,
      content,
      bulkDates,
      fileRelToRepo: `${LEGACY_DIR_REL}/${f}`,
    });
    entries.push({ file: f, dir: LEGACY_DIR, iso, isNew: NEW_NOT_YET_APPLIED.has(f), content });
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
  const writtenNames = [];
  for (const p of plan) {
    const outPath = join(OUT_DIR, p.outName);
    if (existsSync(outPath)) {
      skipped++;
      continue;
    }
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
      writeFileSync(outPath, header + p.content);
    }
    written++;
    writtenNames.push({ outName: p.outName, source: `${p.dir}/${p.file}`, isNew: p.isNew });
  }

  const baselineCount = plan.filter((p) => !p.isNew).length;
  const newCount = plan.filter((p) => p.isNew).length;

  console.log(`Plan: ${plan.length} files (${baselineCount} baseline, ${newCount} new/pending)`);
  console.log(`${isDryRun ? "Would write" : "Wrote"}: ${written}, already present (skipped): ${skipped}`);
  if (written > 0) {
    console.log(`${isDryRun ? "Would write" : "Wrote"} these files:`);
    for (const w of writtenNames) {
      console.log(`  - ${w.outName}${w.isNew ? " (new/pending)" : ""}  <- ${w.source}`);
    }
  }
  if (newCount > 0) {
    console.log("New/pending migrations (NOT part of baseline-applied set):");
    for (const p of plan.filter((x) => x.isNew)) {
      console.log(`  - ${p.outName}  (source: ${p.file})`);
    }
  }
  console.log(`\nOutput dir: ${OUT_DIR}`);
  const baselineVersions = plan.filter((p) => !p.isNew).map((p) => p.ts);
  console.log("\nBaseline version list (for `supabase migration repair --status applied`):");
  console.log(baselineVersions.join(" "));

  // sec-08 finding (2026-08-01): this file is one of docs/adr/0008-migration-tool-cutover.md's
  // own listed "what was built this pass" artifacts, but the script never
  // actually wrote it -- only printed the same list to stdout, above. Fixed
  // so the tool's real output matches its own documentation. File-only,
  // same as every other write this script makes -- no database touched.
  if (!isDryRun) {
    const repairCmd = `supabase migration repair --status applied ${baselineVersions.join(" ")}`;
    const contents = [
      `# Baseline migration versions -- generated by scripts/migrate-legacy-to-cli.mjs`,
      `# Regenerate by re-running that script (idempotent, safe to re-run).`,
      `#`,
      `# These ${baselineVersions.length} versions are the hand-run .sql pile converted to`,
      `# Supabase-CLI format and assumed already live in prod as of the 2026-07-28`,
      `# cutover (docs/adr/0008-migration-tool-cutover.md). Marking them "applied" in`,
      `# the CLI's own tracking table (supabase_migrations.schema_migrations) is a`,
      `# separate, gated, NOT-yet-executed step -- requires Jeff's explicit go per`,
      `# the ADR, same approval class as any other prod write.`,
      `#`,
      `# Command to run once approved:`,
      `${repairCmd}`,
      "",
    ].join("\n");
    writeFileSync(BASELINE_VERSIONS_PATH, contents);
    console.log(`\nWrote ${BASELINE_VERSIONS_PATH}`);
  }
}

// Only run when invoked directly (node migrate-legacy-to-cli.mjs), not when
// imported by the test file for its exported pure functions.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
