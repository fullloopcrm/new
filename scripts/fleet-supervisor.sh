#!/bin/bash
# ============================================================================
# fleet-supervisor.sh  —  FOR-JEFF-REVIEW / PROPOSAL ONLY  (Q-N1)
# ----------------------------------------------------------------------------
# Detects a DEAD worker driver (pgrep) and respawns it, with per-worker
# exponential backoff and a log. Authored by W6 per LEADER Q-N1.
#
# IMPORTANT — READ BEFORE RUNNING:
#   * This script is a PROPOSAL. It defaults to DRY_RUN (it only PRINTS what it
#     would do and spawns nothing). Pass --live to actually respawn drivers.
#   * It does NOT modify .worker-driver.sh or LEADER-CHANNEL.md.
#   * It will NOT kill anything by default. Duplicate drivers are only WARNED
#     about unless you pass --reap (see the DUPLICATE-DRIVER caveat below).
#
# DUPLICATE-DRIVER CAVEAT (the reason this is careful):
#   As observed 2026-07-12, several workers already have TWO driver processes
#   running at once (e.g. W1/W3/W5 each had two `bash .../.worker-driver.sh`
#   PIDs). That is the live "offset-race" double-run bug — see
#   deploy-prep/atomic-queue-claim-design.md. A naive supervisor that only
#   asks "is it running? no -> spawn" cannot create duplicates, but neither
#   can it heal them. This supervisor therefore treats:
#       0 drivers  -> respawn (with backoff)
#       1 driver   -> healthy
#       >1 drivers -> WARN (or, with --reap, keep the oldest and stop the rest)
#   The real fix is a singleton lock inside the driver itself; this supervisor
#   is a stopgap, not that fix.
# ============================================================================

set -u

# ---- fleet definition: "ID:WORKTREE" (edit to match the live fleet) --------
FLEET=(
  "W1:/Users/jefftucker/flwork-p1-w1"
  "W2:/Users/jefftucker/flwork-p1-w2"
  "W3:/Users/jefftucker/flwork-p1-w3"
  "W4:/Users/jefftucker/flwork-p1-w4"
  "W5:/Users/jefftucker/flwork-p1-w5"
  "W6:/Users/jefftucker/flwork-p1-w6"
)

DRIVER_REL=".worker-driver.sh"
LOG="/tmp/fleet-supervisor.log"
STATE_DIR="/tmp/fleet-supervisor-state"   # per-worker backoff counters
POLL_SECS=30                              # seconds between health sweeps
BACKOFF_BASE=5                            # first respawn delay (s)
BACKOFF_MAX=300                           # cap (s)
BACKOFF_RESET_SECS=120                    # sustained-health window that clears backoff

DRY_RUN=1
REAP=0
ONESHOT=0

usage() {
  cat <<'EOF'
Usage: fleet-supervisor.sh [--live] [--reap] [--once] [-h]
  (default)  DRY_RUN: print actions, spawn/kill nothing
  --live     actually respawn dead drivers
  --reap     when >1 driver for a worker, stop all but the oldest (implies action)
  --once     run a single sweep and exit (default: loop forever)
  -h         this help
EOF
}

for arg in "$@"; do
  case "$arg" in
    --live)  DRY_RUN=0 ;;
    --reap)  REAP=1 ;;
    --once)  ONESHOT=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown arg: $arg" >&2; usage; exit 2 ;;
  esac
done

mkdir -p "$STATE_DIR"

log() {
  printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*" | tee -a "$LOG"
}

# pgrep pattern anchored so `.worker-driver.sh.bak-session4` does NOT match.
driver_pids() {
  local wt="$1"
  pgrep -f "${wt}/${DRIVER_REL}\$" 2>/dev/null | sort -n
}

# per-worker backoff state files
bo_file()    { printf '%s/%s.backoff' "$STATE_DIR" "$1"; }
last_file()  { printf '%s/%s.lasthealthy' "$STATE_DIR" "$1"; }

read_num() { local f="$1"; [ -f "$f" ] && cat "$f" 2>/dev/null || echo 0; }

now() { date +%s; }

respawn() {
  local id="$1" wt="$2"
  local driver="${wt}/${DRIVER_REL}"

  if [ ! -x "$driver" ]; then
    log "WARN $id: driver not found/executable at $driver — cannot respawn"
    return 1
  fi

  local bo; bo=$(read_num "$(bo_file "$id")")
  [ "$bo" -lt "$BACKOFF_BASE" ] && bo="$BACKOFF_BASE"
  log "$id: dead driver detected; backoff ${bo}s then respawn"
  if [ "$DRY_RUN" -eq 1 ]; then
    log "$id: [DRY_RUN] would: (sleep $bo; nohup bash '$driver' >>/tmp/worker-$id.log 2>&1 &)"
  else
    ( sleep "$bo"
      # re-check: another supervisor/cron may have spawned it during the sleep
      if [ -z "$(driver_pids "$wt")" ]; then
        nohup bash "$driver" >>"/tmp/worker-$id.log" 2>&1 &
        log "$id: respawned pid $! (backoff was ${bo}s)"
      else
        log "$id: respawn aborted — a driver appeared during backoff"
      fi
    ) &
  fi

  # next backoff = min(bo*2, max)
  local next=$(( bo * 2 ))
  [ "$next" -gt "$BACKOFF_MAX" ] && next="$BACKOFF_MAX"
  echo "$next" > "$(bo_file "$id")"
}

reap_extra() {
  local id="$1" wt="$2"
  local pids; pids=$(driver_pids "$wt")
  local keep; keep=$(printf '%s\n' "$pids" | head -1)   # oldest by PID sort
  local extra; extra=$(printf '%s\n' "$pids" | tail -n +2)
  [ -z "$extra" ] && return 0
  log "WARN $id: DUPLICATE drivers: [$(echo "$pids" | tr '\n' ' ')] keep=$keep"
  if [ "$REAP" -eq 1 ] && [ "$DRY_RUN" -eq 0 ]; then
    for p in $extra; do
      kill -TERM "$p" 2>/dev/null && log "$id: reaped duplicate driver pid $p"
    done
  else
    log "$id: [not reaping] pass --reap --live to stop the extra PID(s): $(echo "$extra" | tr '\n' ' ')"
  fi
}

sweep() {
  local entry id wt pids n
  for entry in "${FLEET[@]}"; do
    id="${entry%%:*}"
    wt="${entry#*:}"
    pids=$(driver_pids "$wt")
    n=$(printf '%s\n' "$pids" | grep -c . )

    if [ "$n" -eq 0 ]; then
      respawn "$id" "$wt"
    elif [ "$n" -eq 1 ]; then
      # healthy: clear backoff if it has stayed healthy long enough
      local last; last=$(read_num "$(last_file "$id")")
      local t; t=$(now)
      if [ "$last" -eq 0 ]; then
        echo "$t" > "$(last_file "$id")"
      elif [ $(( t - last )) -ge "$BACKOFF_RESET_SECS" ]; then
        echo "$BACKOFF_BASE" > "$(bo_file "$id")"
      fi
    else
      reap_extra "$id" "$wt"
      echo 0 > "$(last_file "$id")"   # not a clean single -> don't count as healthy
    fi
  done
}

log "fleet-supervisor start (DRY_RUN=$DRY_RUN REAP=$REAP ONESHOT=$ONESHOT poll=${POLL_SECS}s)"
if [ "$ONESHOT" -eq 1 ]; then
  sweep
  log "oneshot sweep complete"
  exit 0
fi

trap 'log "fleet-supervisor stopping"; exit 0' INT TERM
while true; do
  sweep
  sleep "$POLL_SECS"
done
