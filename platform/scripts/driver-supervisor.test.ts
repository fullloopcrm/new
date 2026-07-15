import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, chmodSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  laneMatchesCommand,
  parsePsOutput,
  classifyLanes,
  buildRelaunchInvocation,
  relaunchLane,
  parseArgs,
  DEFAULT_LANES,
  type LaneConfig,
} from './driver-supervisor'

describe('laneMatchesCommand', () => {
  const lane: LaneConfig = {
    id: 'W2',
    worktree: '/Users/jefftucker/flwork-p1-w2',
    driverScript: '.worker-driver.sh',
    stdoutLog: '/private/tmp/w2-driver-stdout.log',
  }

  it('matches the exact driver invocation', () => {
    expect(laneMatchesCommand(lane, 'bash /Users/jefftucker/flwork-p1-w2/.worker-driver.sh')).toBe(true)
  })

  it('matches when the command has trailing content (e.g. ps padding)', () => {
    expect(laneMatchesCommand(lane, 'bash /Users/jefftucker/flwork-p1-w2/.worker-driver.sh  ')).toBe(true)
  })

  it('does not match an unrelated command', () => {
    expect(laneMatchesCommand(lane, 'claude --model sonnet -p hello')).toBe(false)
  })

  it('does not match a different lane', () => {
    expect(laneMatchesCommand(lane, 'bash /Users/jefftucker/flwork-p1-w3/.worker-driver.sh')).toBe(false)
  })

  it('does not let w1 accidentally match a w10/w11-style path sharing the w1 prefix', () => {
    const w1: LaneConfig = { ...lane, id: 'W1', worktree: '/Users/jefftucker/flwork-p1-w1' }
    expect(laneMatchesCommand(w1, 'bash /Users/jefftucker/flwork-p1-w10/.worker-driver.sh')).toBe(false)
    expect(laneMatchesCommand(w1, 'bash /Users/jefftucker/flwork-p1-w11/.worker-driver.sh')).toBe(false)
  })

  it('does not match a substring hit inside a longer unrelated path', () => {
    expect(laneMatchesCommand(lane, 'bash /Users/jefftucker/flwork-p1-w2-backup/.worker-driver.sh')).toBe(false)
  })
})

describe('parsePsOutput', () => {
  it('parses pid + command pairs, skipping blank lines', () => {
    const raw = [
      '  123  bash /Users/jefftucker/flwork-p1-w1/.worker-driver.sh',
      '',
      '  456  claude --model sonnet -p do the thing',
      '   ',
    ].join('\n')
    expect(parsePsOutput(raw)).toEqual([
      { pid: 123, command: 'bash /Users/jefftucker/flwork-p1-w1/.worker-driver.sh' },
      { pid: 456, command: 'claude --model sonnet -p do the thing' },
    ])
  })

  it('returns an empty array for empty input', () => {
    expect(parsePsOutput('')).toEqual([])
  })
})

describe('classifyLanes', () => {
  const lanes: LaneConfig[] = [
    { id: 'W1', worktree: '/wt/w1', driverScript: '.worker-driver.sh', stdoutLog: '/tmp/w1.log' },
    { id: 'W2', worktree: '/wt/w2', driverScript: '.worker-driver.sh', stdoutLog: '/tmp/w2.log' },
  ]
  const alwaysExists = () => true

  it('marks a lane alive when >=1 process matches, dead when none do', () => {
    const processes = [{ pid: 1, command: 'bash /wt/w1/.worker-driver.sh' }]
    const result = classifyLanes(lanes, processes, alwaysExists)
    expect(result.find((r) => r.id === 'W1')).toMatchObject({ alive: true, state: 'alive', matchedPids: [1] })
    expect(result.find((r) => r.id === 'W2')).toMatchObject({ alive: false, state: 'dead' })
  })

  it('captures BOTH pids when a lane is mid-invocation (parent + $() subshell, same command line)', () => {
    const processes = [
      { pid: 10, command: 'bash /wt/w1/.worker-driver.sh' },
      { pid: 11, command: 'bash /wt/w1/.worker-driver.sh' },
    ]
    const result = classifyLanes(lanes, processes, alwaysExists)
    const w1 = result.find((r) => r.id === 'W1')!
    expect(w1.alive).toBe(true)
    expect(w1.matchedPids.sort()).toEqual([10, 11])
  })

  it('reports worktree-missing when the worktree directory is gone, before ever attempting a relaunch', () => {
    const fsCheck = (p: string) => p !== '/wt/w2'
    const result = classifyLanes(lanes, [], fsCheck)
    expect(result.find((r) => r.id === 'W2')).toMatchObject({ alive: false, state: 'worktree-missing' })
  })

  it('reports script-missing when the worktree exists but the driver script does not', () => {
    const fsCheck = (p: string) => p !== '/wt/w2/.worker-driver.sh'
    const result = classifyLanes(lanes, [], fsCheck)
    expect(result.find((r) => r.id === 'W2')).toMatchObject({ alive: false, state: 'script-missing' })
  })
})

describe('buildRelaunchInvocation', () => {
  it('reproduces the exact original invocation shape (bash <script> in <worktree>, redirected to <stdoutLog>)', () => {
    const lane: LaneConfig = {
      id: 'W4',
      worktree: '/Users/jefftucker/flwork-p1-w4',
      driverScript: '.worker-driver.sh',
      stdoutLog: '/private/tmp/w4-driver-stdout.log',
    }
    expect(buildRelaunchInvocation(lane)).toEqual({
      cwd: '/Users/jefftucker/flwork-p1-w4',
      command: 'bash',
      args: ['/Users/jefftucker/flwork-p1-w4/.worker-driver.sh'],
      stdoutLog: '/private/tmp/w4-driver-stdout.log',
    })
  })
})

describe('parseArgs', () => {
  it('defaults to dry-run (apply=false)', () => {
    expect(parseArgs([])).toEqual({ apply: false, json: false, lane: undefined })
  })

  it('parses --apply, --json, --lane', () => {
    expect(parseArgs(['--apply', '--lane', 'W3', '--json'])).toEqual({ apply: true, json: true, lane: 'W3' })
  })
})

describe('DEFAULT_LANES', () => {
  it('covers exactly W1..W6 with the known worktree/log convention', () => {
    expect(DEFAULT_LANES.map((l) => l.id)).toEqual(['W1', 'W2', 'W3', 'W4', 'W5', 'W6'])
    expect(DEFAULT_LANES[1]).toEqual({
      id: 'W2',
      worktree: '/Users/jefftucker/flwork-p1-w2',
      driverScript: '.worker-driver.sh',
      stdoutLog: '/private/tmp/w2-driver-stdout.log',
    })
  })
})

// --- Integration test: real process detection + real relaunch, using a throwaway
// dummy "driver" script in a scratch temp dir. Never touches the real fleet's
// .worker-driver.sh files or processes -- this is the "test mode" the task asked
// for, exercised end-to-end instead of only mocked.
describe('relaunchLane (integration, scratch dummy driver only)', () => {
  let scratchDir: string
  let spawnedPid: number | null = null

  afterEach(() => {
    if (spawnedPid) {
      try {
        process.kill(spawnedPid, 'SIGKILL')
      } catch {
        // already dead, fine
      }
      spawnedPid = null
    }
    if (scratchDir) {
      rmSync(scratchDir, { recursive: true, force: true })
    }
  })

  it('detects a dead scratch lane, relaunches it, and verifies it comes back alive', async () => {
    scratchDir = mkdtempSync(join(tmpdir(), 'driver-supervisor-test-'))
    const dummyScript = join(scratchDir, '.worker-driver.sh')
    // Mimics the real driver's shape: a long-running loop, no real claude calls.
    writeFileSync(dummyScript, '#!/bin/bash\nwhile true; do sleep 60; done\n')
    chmodSync(dummyScript, 0o755)

    const lane: LaneConfig = {
      id: 'TEST',
      worktree: scratchDir,
      driverScript: '.worker-driver.sh',
      stdoutLog: join(scratchDir, 'stdout.log'),
    }

    // Before relaunch: nothing running yet for this scratch lane.
    const psBefore = execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })
    const before = classifyLanes([lane], parsePsOutput(psBefore))
    expect(before[0].alive).toBe(false)

    const result = await relaunchLane(lane, 500)
    spawnedPid = result.pid

    expect(result.error).toBeNull()
    expect(result.attempted).toBe(true)
    expect(result.verifiedAlive).toBe(true)
    expect(result.pid).toBeGreaterThan(0)

    // Re-check independently (not trusting relaunchLane's own verification).
    const psAfter = execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })
    const after = classifyLanes([lane], parsePsOutput(psAfter))
    expect(after[0].alive).toBe(true)
    expect(after[0].matchedPids).toContain(result.pid)
  })

  it('reports script-missing (not a crash) when the dummy driver script does not exist, and never spawns anything', () => {
    scratchDir = mkdtempSync(join(tmpdir(), 'driver-supervisor-test-'))
    const lane: LaneConfig = {
      id: 'TEST',
      worktree: scratchDir,
      driverScript: '.worker-driver.sh', // deliberately not created
      stdoutLog: join(scratchDir, 'stdout.log'),
    }
    const result = classifyLanes([lane], [])
    expect(result[0]).toMatchObject({ alive: false, state: 'script-missing' })
  })
})
