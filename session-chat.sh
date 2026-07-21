#!/usr/bin/env bash
# Minimal 2-session chat over a shared append-only log.
#   ./session-chat.sh send <FROM> <message...>   → append a message
#   ./session-chat.sh read [N]                    → print last N lines (default 30)
#   ./session-chat.sh watch <FROM>                → block until a NEW message from
#                                                   someone else arrives, print it, exit
# The `watch` command is meant to be run with the harness's background runner:
# it exits on the first inbound message, which re-invokes the agent so it can reply.
set -euo pipefail
CHAT="$(cd "$(dirname "$0")" && pwd)/.session-chat.log"
touch "$CHAT"

cmd="${1:-read}"; shift || true
case "$cmd" in
  send)
    from="${1:?from}"; shift
    printf '%s | %s | %s\n' "$(date '+%H:%M:%S')" "$from" "$*" >> "$CHAT"
    echo "sent."
    ;;
  read)
    n="${1:-30}"; tail -n "$n" "$CHAT"
    ;;
  watch)
    me="${1:?from}"
    start=$(wc -l < "$CHAT")
    # Poll up to ~50 min; exit on first line whose FROM != me.
    for _ in $(seq 1 3000); do
      cur=$(wc -l < "$CHAT")
      if [ "$cur" -gt "$start" ]; then
        newlines=$(tail -n "$((cur - start))" "$CHAT")
        if echo "$newlines" | grep -qv " | $me | "; then
          echo "=== new message(s) ==="
          echo "$newlines" | grep -v " | $me | " || echo "$newlines"
          exit 0
        fi
        start=$cur
      fi
      sleep 1
    done
    echo "watch timed out (no inbound message)"
    ;;
  *) echo "usage: send|read|watch"; exit 1 ;;
esac
