#!/usr/bin/env npx tsx
/**
 * Section-Q item (1): worker-driver supervisor.
 *
 * Detects a dead/crashed .worker-driver.sh process for a lane and relaunches
 * it with the exact original invocation, preserving lane ID + worktree:
 *   cd <worktree> && nohup bash .worker-driver.sh > <stdoutLog> 2>&1 & disown
 *
 * This is a STANDALONE check -- run it by hand, from the leader's own loop,
 * or from cron. It must NEVER be wired into anything that fires automatically
 * mid-invocation (e.g. a hook firing while a worker's `claude -p` call is
 * still running): this script only decides "dead vs alive" from a point-in-
 * time process snapshot, and a dead-detection race triggered mid-invocation
 * could double-launch a driver that's actually just slow, not crashed.
 *
 * Detection note: inside .worker-driver.sh, `OUT=$(claude ...)` forks a bash
 * subshell to run the command substitution. That subshell does NOT re-exec,
 * so `ps` shows it with the SAME command line as the parent driver script --
 * meaning a lane mid-invocation can legitimately show 2 processes matching
 * "bash .../.worker-driver.sh", not 1. Classification below only checks for
 * >=1 match ("alive"), it never expects or requires exactly 1. Do not read
 * a duplicate match as a fault to correct -- that is a separate, unrelated
 * concern from this script's job (detect zero-alive and relaunch).
 *
 * Usage:
 *   npx tsx scripts/driver-supervisor.ts                 # dry run (default): report only, exit 1 if any lane is dead
 *   npx tsx scripts/driver-supervisor.ts --apply          # actually relaunch dead lanes
 *   npx tsx scripts/driver-supervisor.ts --lane W3        # limit to one lane
 *   npx tsx scripts/driver-supervisor.ts --json           # machine-readable report
 *   npx tsx scripts/driver-supervisor.ts --apply --lane W3 --json
 */

import { execFileSync, spawn } from 'node:child_process'
import { existsSync, openSync, closeSync } from 'node:fs'
import { join } from 'node:path'

export interface LaneConfig {
  id: string
  worktree: string
  driverScript: string
  stdoutLog: string
}

export type LaneState = 'alive' | 'dead' | 'worktree-missing' | 'script-missing'

export interface LaneStatus extends LaneConfig {
  alive: boolean
  state: LaneState
  matchedPids: number[]
}

export interface RelaunchResult {
  id: string
  attempted: boolean
  pid: number | null
  verifiedAlive: boolean
  error: string | null
}

const LANE_IDS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'] as const

export const DEFAULT_LANES: LaneConfig[] = LANE_IDS.map((id) => {
  const n = id.slice(1)
  return {
    id,
    worktree: `/Users/jefftucker/flwork-p1-w${n}`,
    driverScript: '.worker-driver.sh',
    stdoutLog: `/private/tmp/w${n}-driver-stdout.log`,
  }
})

/**
 * Matches a `ps` command-line string against a lane's driver invocation.
 * Requires the full script path followed by end-of-string or whitespace, so
 * e.g. lane "w1"'s path can never accidentally match a "w10"/"w11"-style
 * path that happens to share the "w1" prefix.
 */
export function laneMatchesCommand(lane: LaneConfig, command: string): boolean {
  const scriptPath = `${lane.worktree}/${lane.driverScript}`
  const escaped = scriptPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`bash\\s+${escaped}(\\s|$)`)
  return re.test(command)
}

/** Parses `ps -axo pid=,command=` output into { pid, command } rows. */
export function parsePsOutput(psOutput: string): Array<{ pid: number; command: string }> {
  return psOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\d+)\s+(.*)$/)
      return m ? { pid: Number(m[1]), command: m[2] } : null
    })
    .filter((x): x is { pid: number; command: string } => x !== null)
}

/** Classifies each lane as alive/dead (or misconfigured) given a process snapshot. */
export function classifyLanes(
  lanes: LaneConfig[],
  processes: Array<{ pid: number; command: string }>,
  fsCheck: (path: string) => boolean = existsSync
): LaneStatus[] {
  return lanes.map((lane) => {
    const matched = processes.filter((p) => laneMatchesCommand(lane, p.command))
    if (matched.length > 0) {
      return { ...lane, alive: true, state: 'alive', matchedPids: matched.map((p) => p.pid) }
    }
    if (!fsCheck(lane.worktree)) {
      return { ...lane, alive: false, state: 'worktree-missing', matchedPids: [] }
    }
    if (!fsCheck(join(lane.worktree, lane.driverScript))) {
      return { ...lane, alive: false, state: 'script-missing', matchedPids: [] }
    }
    return { ...lane, alive: false, state: 'dead', matchedPids: [] }
  })
}

/**
 * Builds the exact original relaunch invocation for a lane (structured, for
 * execFile-style spawning -- no shell string concatenation). The script path
 * is passed absolute (not relative + cwd) so the spawned process's argv --
 * and therefore what `ps` reports and what laneMatchesCommand looks for --
 * matches the live fleet's actual invocation shape exactly, regardless of
 * how nohup/disown or the caller's shell would otherwise display a relative
 * arg.
 */
export function buildRelaunchInvocation(lane: LaneConfig) {
  return {
    cwd: lane.worktree,
    command: 'bash',
    args: [join(lane.worktree, lane.driverScript)],
    stdoutLog: lane.stdoutLog,
  }
}

function getLiveProcesses(): Array<{ pid: number; command: string }> {
  const out = execFileSync('ps', ['-axo', 'pid=,command='], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })
  return parsePsOutput(out)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Relaunches one lane's driver, matching the original invocation semantics:
 * `nohup bash .worker-driver.sh > <stdoutLog> 2>&1 & disown`
 * (truncating stdoutLog, detached so it survives the supervisor exiting,
 * unref'd so the supervisor process doesn't wait on it).
 */
export async function relaunchLane(lane: LaneConfig, verifyDelayMs = 800): Promise<RelaunchResult> {
  const inv = buildRelaunchInvocation(lane)
  let outFd: number
  try {
    outFd = openSync(inv.stdoutLog, 'w')
  } catch (err) {
    return { id: lane.id, attempted: false, pid: null, verifiedAlive: false, error: `cannot open stdout log: ${(err as Error).message}` }
  }
  let child
  try {
    child = spawn(inv.command, inv.args, {
      cwd: inv.cwd,
      detached: true,
      stdio: ['ignore', outFd, outFd],
    })
    child.unref()
  } catch (err) {
    closeSync(outFd)
    return { id: lane.id, attempted: true, pid: null, verifiedAlive: false, error: `spawn failed: ${(err as Error).message}` }
  } finally {
    closeSync(outFd)
  }

  const pid = child.pid ?? null
  await sleep(verifyDelayMs)
  const processes = getLiveProcesses()
  const nowAlive = classifyLanes([lane], processes)[0].alive
  return { id: lane.id, attempted: true, pid, verifiedAlive: nowAlive, error: null }
}

interface CliOptions {
  apply: boolean
  json: boolean
  lane?: string
}

export function parseArgs(argv: string[]): CliOptions {
  const laneIdx = argv.indexOf('--lane')
  return {
    apply: argv.includes('--apply'),
    json: argv.includes('--json'),
    lane: laneIdx >= 0 ? argv[laneIdx + 1] : undefined,
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  let lanes = DEFAULT_LANES
  if (opts.lane) {
    const wantedLane = opts.lane.toUpperCase()
    lanes = lanes.filter((l) => l.id === wantedLane)
    if (lanes.length === 0) {
      console.error(`Unknown lane: ${opts.lane} (expected one of ${LANE_IDS.join(', ')})`)
      process.exit(2)
    }
  }

  const processes = getLiveProcesses()
  const statuses = classifyLanes(lanes, processes)
  const dead = statuses.filter((s) => !s.alive)

  const relaunches: RelaunchResult[] = []
  if (opts.apply) {
    for (const lane of dead) {
      if (lane.state === 'worktree-missing' || lane.state === 'script-missing') {
        relaunches.push({ id: lane.id, attempted: false, pid: null, verifiedAlive: false, error: `skipped: ${lane.state}` })
        continue
      }
      // eslint-disable-next-line no-await-in-loop -- relaunches must be sequential, not racing each other
      relaunches.push(await relaunchLane(lane))
    }
  }

  if (opts.json) {
    console.log(JSON.stringify({ mode: opts.apply ? 'apply' : 'dry-run', statuses, relaunches }, null, 2))
  } else {
    console.log(`Driver supervisor -- mode: ${opts.apply ? 'APPLY' : 'DRY-RUN'}`)
    for (const s of statuses) {
      const detail = s.alive ? `alive (pid ${s.matchedPids.join(',')})` : s.state.toUpperCase()
      console.log(`  ${s.id}: ${detail}`)
    }
    if (dead.length === 0) {
      console.log('All lanes alive. Nothing to do.')
    } else if (!opts.apply) {
      console.log(`Would relaunch: ${dead.map((s) => s.id).join(', ')} (pass --apply to actually relaunch)`)
    } else {
      for (const r of relaunches) {
        console.log(
          r.error
            ? `  relaunch ${r.id}: FAILED (${r.error})`
            : `  relaunch ${r.id}: pid ${r.pid}, verified ${r.verifiedAlive ? 'alive' : 'NOT ALIVE -- check logs'}`
        )
      }
    }
  }

  const unresolvedFailure = opts.apply
    ? relaunches.some((r) => r.error || !r.verifiedAlive)
    : dead.length > 0
  process.exit(unresolvedFailure ? 1 : 0)
}

const isDirectRun = process.argv[1]?.endsWith('driver-supervisor.ts') ?? false
if (isDirectRun) {
  main()
}
