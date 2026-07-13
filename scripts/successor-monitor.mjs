#!/usr/bin/env node

/**
 * SUCCESSOR MONITOR
 *
 * Checks Jeff's last interaction timestamp. If Jeff is inactive:
 * - Day 4: Alert Ashton (intermediate warning)
 * - Day 7: Full succession trigger
 *
 * Any interaction from Jeff resets the counter.
 * Ashton can pause the counter by replying to the alert.
 *
 * Run via cron every 6 hours.
 *
 * ⚠️ NOT ACTIVATED. Fixed by W6 2026-07-12 (file-only, not run, not installed).
 * Original had 3 self-documented defects; status of each below:
 *   (1) ACTIVITY-DETECTION FLAW — FIXED. The git-commit and LEADER-CHANNEL.md sources
 *       (written by the autonomous fleet constantly, causing daysSinceInteraction to
 *       read ~0 forever) have been removed. getLastInteractionTimestamp() now reads
 *       ONLY Jeff-specific signals: jeff-last-interaction.txt and the Supabase
 *       admin-login query. querySupabaseLastAdminLogin() is STILL a stub (returns
 *       null) — implementing the real query is separate follow-up work, out of
 *       scope for this file-only pass.
 *   (2) PLAINTEXT-TRIGGER PATH — PARTIALLY FIXED. successorPackage now points at
 *       deploy-prep/successor-package-template.md (the file that actually exists),
 *       not the nonexistent SUCCESSOR-PACKAGE.md. NOTE: that template currently
 *       lives on the p1-w6 branch — this path will still resolve to "file not
 *       found" on main until that branch/file is merged or copied in. The deeper
 *       issue — this still emails a plaintext package body, contradicting Section
 *       R's no-plaintext-credentials requirement and the encryption design in
 *       deploy-prep/successor-package-encryption-note.md — is NOT fixed here.
 *       Wiring the encrypted-payload flow is a separate, larger change (see
 *       deploy-prep/successor-package-status.md punch-list item 4).
 *   (3) SILENT LOG SWALLOW — FIXED. log() previously called require('fs') inside a
 *       .mjs (ESM) module, which throws on every call and was swallowed by an empty
 *       catch — so no log line after the first ever wrote. Now uses the appendFileSync
 *       imported at the top of the file, so logs/successor-monitor.log is reliable
 *       once the script is actually run.
 *
 *   Still NOT done (unchanged from original, out of scope for this pass):
 *   - No --dry-run flag (Jeff asked to "test all paths with fake alerts first").
 *   - checkAshtonPause() is still a local-file placeholder, not real email-reply parsing.
 *   - Still designed for macOS cron on Jeff's Mac (dies when the Mac sleeps) — no
 *     Vercel Cron conversion exists.
 *   - Implements the original 4-day/7-day silent-monitoring design, not Jeff's later
 *     daily-liveness-ping direction (MASTER-TODO-LIST.md, Section R). Needs a rebuild,
 *     not a patch, per deploy-prep/successor-package-status.md §3b.
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';

const CONFIG = {
  successor: {
    name: 'Ashton Tucker',
    phone: '+12122029201',
    email: 'ashtonjtucker@icloud.com'
  },
  founder: {
    name: 'Jeff Tucker',
    email: 'jeff@fullloopcrm.com' // update to Jeff's actual email
  },
  thresholds: {
    intermediateAlertDays: 4,
    fullTriggerDays: 7
  },
  paths: {
    stateFile: '/Users/jefftucker/fullloopcrm/data/successor-state.json',
    lastInteractionFile: '/Users/jefftucker/fullloopcrm/data/jeff-last-interaction.txt',
    // Was '/Users/jefftucker/fullloopcrm/SUCCESSOR-PACKAGE.md' (nonexistent — defect 2).
    // Points at the real template now; still requires deploy-prep/ to be present on
    // whatever branch/checkout this script actually runs from.
    successorPackage: '/Users/jefftucker/fullloopcrm/deploy-prep/successor-package-template.md',
    ashtonPauseFile: '/Users/jefftucker/fullloopcrm/data/ashton-pause.txt',
    logFile: '/Users/jefftucker/fullloopcrm/logs/successor-monitor.log'
  },
  services: {
    resendApiKey: process.env.RESEND_API_KEY,
    telnyxApiKey: process.env.TELNYX_API_KEY,
    telnyxFromNumber: process.env.TELNYX_FROM_NUMBER
  }
};

// ==================== LOGGING ====================

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  console.log(line.trim());
  try {
    appendFileSync(CONFIG.paths.logFile, line);
  } catch (e) {
    // Log directory might not exist yet
  }
}

// ==================== STATE MANAGEMENT ====================

function loadState() {
  if (!existsSync(CONFIG.paths.stateFile)) {
    return {
      lastInteractionTs: Date.now(),
      intermediateAlertSent: false,
      intermediateAlertTs: null,
      fullTriggerSent: false,
      fullTriggerTs: null,
      ashtonPaused: false,
      ashtonPausedTs: null
    };
  }
  return JSON.parse(readFileSync(CONFIG.paths.stateFile, 'utf-8'));
}

function saveState(state) {
  writeFileSync(CONFIG.paths.stateFile, JSON.stringify(state, null, 2));
}

// ==================== ACTIVITY DETECTION ====================

function getLastInteractionTimestamp() {
  const sources = [];

  // Source 1: explicit last-interaction file (updated by Full Loop app / mark-activity.sh)
  if (existsSync(CONFIG.paths.lastInteractionFile)) {
    const ts = parseInt(readFileSync(CONFIG.paths.lastInteractionFile, 'utf-8').trim(), 10);
    if (!isNaN(ts)) sources.push({ source: 'last-interaction-file', ts });
  }

  // Source 2: Full Loop admin login events (query Supabase if available)
  // NOTE: git-commit and LEADER-CHANNEL.md sources were removed here (defect 1) —
  // both are written by the autonomous fleet constantly and are not signals of
  // Jeff's own activity. Only Jeff-specific sources belong in this list.
  try {
    const supabaseTs = querySupabaseLastAdminLogin();
    if (supabaseTs) sources.push({ source: 'supabase-admin-login', ts: supabaseTs });
  } catch (e) {}

  // Return the most recent activity across all sources
  if (sources.length === 0) return null;
  return Math.max(...sources.map(s => s.ts));
}

function querySupabaseLastAdminLogin() {
  // Placeholder — implement Supabase query if credentials available
  // Should query auth.audit_log_entries or activity_log for Jeff's login
  return null;
}

// ==================== NOTIFICATIONS ====================

async function sendEmail(to, subject, body) {
  if (!CONFIG.services.resendApiKey) {
    log(`EMAIL SKIP (no Resend key): to=${to} subject="${subject}"`);
    return false;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.services.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Full Loop <noreply@fullloopcrm.com>',
      to,
      subject,
      html: body
    })
  });

  if (!response.ok) {
    log(`EMAIL FAIL: to=${to} status=${response.status}`);
    return false;
  }

  log(`EMAIL SENT: to=${to} subject="${subject}"`);
  return true;
}

async function sendSms(to, body) {
  if (!CONFIG.services.telnyxApiKey) {
    log(`SMS SKIP (no Telnyx key): to=${to}`);
    return false;
  }

  const response = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.services.telnyxApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: CONFIG.services.telnyxFromNumber,
      to,
      text: body
    })
  });

  if (!response.ok) {
    log(`SMS FAIL: to=${to} status=${response.status}`);
    return false;
  }

  log(`SMS SENT: to=${to}`);
  return true;
}

// ==================== ALERTS ====================

async function sendIntermediateAlert(daysInactive) {
  const emailBody = `
    <p>This is an automated notification from the Full Loop CRM platform.</p>
    <p>Jeff Tucker has been inactive on the platform for ${daysInactive} consecutive days.</p>
    <p>The full successor trigger will fire at 7 days of inactivity, at which point you will receive the successor package with full platform access.</p>
    <p><strong>If you have direct contact with Jeff and confirm he is not in an emergency, reply to this email with "PAUSE" to pause the countdown.</strong></p>
    <p>Standing by. This is currently a warning only.</p>
    <p>—Full Loop Platform Automation</p>
  `;

  const smsBody = `Full Loop: Jeff Tucker inactive ${daysInactive} days. Full succession trigger at 7 days. Reply PAUSE to email if you have contact with him.`;

  await sendEmail(CONFIG.successor.email, `Full Loop: Jeff Inactive ${daysInactive} Days`, emailBody);
  await sendSms(CONFIG.successor.phone, smsBody);
}

async function sendFullSuccessionTrigger(daysInactive) {
  // Read the successor package content
  // KNOWN GAP (defect 2, partial): this still embeds raw file content in a plaintext
  // HTML email. Path now points at a real file (see CONFIG.paths.successorPackage
  // comment) but the plaintext-in-email design itself is not fixed — see header note.
  let packageContent = '';
  try {
    packageContent = readFileSync(CONFIG.paths.successorPackage, 'utf-8');
  } catch (e) {
    packageContent = 'Successor package file not found. Contact platform directly.';
  }

  const emailBody = `
    <p><strong>FULL SUCCESSOR TRIGGER FIRED</strong></p>
    <p>Jeff Tucker has been inactive for ${daysInactive} consecutive days on the Full Loop CRM platform.</p>
    <p>As designated successor, you now have full authority over the platform.</p>
    <p>The complete successor package is attached below. It contains:</p>
    <ul>
      <li>Platform admin credentials</li>
      <li>Sub-processor account access (Supabase, Vercel, Stripe, Telnyx, Resend, Anthropic, xAI, GitHub, domain registrar)</li>
      <li>Current tenant list with revenue breakdown</li>
      <li>Current financial state</li>
      <li>Master to-do list snapshot</li>
      <li>Contact list</li>
      <li>Legal document locations</li>
      <li>Fleet operation instructions</li>
      <li>Key decisions for first 30 days</li>
    </ul>
    <p>Please reply to this email to confirm receipt and begin management.</p>
    <hr/>
    <pre>${packageContent}</pre>
  `;

  const smsBody = `URGENT: Full Loop successor trigger fired. Jeff inactive ${daysInactive} days. Full platform access granted. Check email immediately.`;

  await sendEmail(CONFIG.successor.email, 'URGENT: Full Loop Successor Trigger Fired', emailBody);
  await sendSms(CONFIG.successor.phone, smsBody);
}

// ==================== ASHTON PAUSE HANDLING ====================

function checkAshtonPause() {
  // Ashton pauses by creating a file with content "PAUSE"
  // (Real implementation would parse email replies, this is placeholder)
  if (existsSync(CONFIG.paths.ashtonPauseFile)) {
    const content = readFileSync(CONFIG.paths.ashtonPauseFile, 'utf-8').trim();
    if (content === 'PAUSE') return true;
  }
  return false;
}

// ==================== MAIN LOGIC ====================

async function main() {
  const state = loadState();
  const lastInteractionTs = getLastInteractionTimestamp();

  if (!lastInteractionTs) {
    log('WARN: No last interaction timestamp available. Cannot evaluate.');
    return;
  }

  const now = Date.now();
  const daysSinceInteraction = Math.floor((now - lastInteractionTs) / (1000 * 60 * 60 * 24));

  log(`Jeff last active: ${new Date(lastInteractionTs).toISOString()} (${daysSinceInteraction} days ago)`);

  // Jeff is active — reset all state
  if (daysSinceInteraction < CONFIG.thresholds.intermediateAlertDays) {
    if (state.intermediateAlertSent || state.fullTriggerSent) {
      log('Jeff resumed activity. Resetting all alerts.');
      state.intermediateAlertSent = false;
      state.intermediateAlertTs = null;
      state.fullTriggerSent = false;
      state.fullTriggerTs = null;
      state.ashtonPaused = false;
      state.ashtonPausedTs = null;
      saveState(state);
    }
    return;
  }

  // Check if Ashton has paused
  if (checkAshtonPause()) {
    if (!state.ashtonPaused) {
      log('Ashton has paused the countdown.');
      state.ashtonPaused = true;
      state.ashtonPausedTs = now;
      saveState(state);
    }
    return;
  }

  // Intermediate alert threshold
  if (daysSinceInteraction >= CONFIG.thresholds.intermediateAlertDays && !state.intermediateAlertSent) {
    log(`Sending intermediate alert (${daysSinceInteraction} days inactive).`);
    await sendIntermediateAlert(daysSinceInteraction);
    state.intermediateAlertSent = true;
    state.intermediateAlertTs = now;
    saveState(state);
    return;
  }

  // Full trigger threshold
  if (daysSinceInteraction >= CONFIG.thresholds.fullTriggerDays && !state.fullTriggerSent) {
    log(`Full succession trigger firing (${daysSinceInteraction} days inactive).`);
    await sendFullSuccessionTrigger(daysSinceInteraction);
    state.fullTriggerSent = true;
    state.fullTriggerTs = now;
    saveState(state);
    return;
  }

  log(`Status: ${daysSinceInteraction} days inactive. Intermediate alert sent: ${state.intermediateAlertSent}. Full trigger sent: ${state.fullTriggerSent}. Ashton paused: ${state.ashtonPaused}.`);
}

main().catch(err => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});
