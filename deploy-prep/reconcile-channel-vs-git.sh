#!/usr/bin/env bash
# reconcile-channel-vs-git.sh — verify every commit hash a worker CLAIMED in the
# LEADER channel actually exists in git, sits on that worker's OWN branch, and
# matches its claimed file(s). Catches overstated / empty / wrong-branch /
# nonexistent DONE claims. READ-ONLY: no refs, worktrees, or objects touched.
#
# Usage:  ./reconcile-channel-vs-git.sh [path-to-LEADER-CHANNEL.md]
# Default channel path: /Users/jefftucker/fullloopcrm/LEADER-CHANNEL.md
#
# Run from any worktree in the family — all share one object store, so a commit
# made in flwork-p1-wN is inspectable from anywhere.
set -uo pipefail

CHANNEL="${1:-/Users/jefftucker/fullloopcrm/LEADER-CHANNEL.md}"
[ -r "$CHANNEL" ] || { echo "cannot read channel: $CHANNEL" >&2; exit 2; }

# A worker line looks like:  "17:02 W6->LEADER: ... [17ad93fe] ... commit 091b6216 ..."
# Strategy: walk the file line by line; track the most recent "Wk->LEADER"
# speaker; for each 7-40 hex token on that line, reconcile it against branch
# p1-w<k>. Tokens that git doesn't know are reported as PHANTOM (overstated).
awk '
  match($0, /W[0-9]+->LEADER/) {
    spk = substr($0, RSTART+1, RLENGTH-9)   # the digits between W and ->LEADER
  }
  {
    line = $0
    while (match(line, /[0-9a-f]{7,40}/)) {
      tok = substr(line, RSTART, RLENGTH)
      line = substr(line, RSTART+RLENGTH)
      if (spk != "" && tok ~ /[a-f]/)        # require >=1 letter: skips pure-digit times/counts
        print spk "\t" tok
    }
  }
' "$CHANNEL" | sort -u | while IFS=$'\t' read -r wk tok; do
  exp="p1-w${wk}"
  typ=$(git cat-file -t "$tok" 2>/dev/null)
  if [ "$typ" != "commit" ]; then
    # NOT a commit in THIS repo. Do NOT read as "lying" — the channel's hex
    # namespace overlaps commits with: external action SHA pins (34e1148…),
    # algorithm names (ed25519), rule-name fragments (feedbac…), DB/tenant/cron
    # UUID fragments (20b3f627…). Classify by hand; only a token used in a
    # DONE/commit context that resolves nowhere is a real overstatement.
    printf 'UNRESOLVED W%s %s — not a commit in this repo (classify: ext-SHA / algo / word / db-id / vanished-rebase / fabricated)\n' "$wk" "$tok"
    continue
  fi
  full=$(git rev-parse "$tok" 2>/dev/null)
  branches=$(git branch --format='%(refname:short)' --contains "$tok" 2>/dev/null | tr '\n' ',' | sed 's/,$//')
  files=$(git show --stat --format='' "$tok" 2>/dev/null | grep -E '\|' | wc -l | tr -d ' ')
  subj=$(git show -s --format='%s' "$tok" 2>/dev/null)
  case ",$branches," in
    *",$exp,"*) onbranch="OK-on-$exp" ;;
    *)          onbranch="OFF-BRANCH(on:$branches, expected:$exp)" ;;
  esac
  # An "empty" DONE commit (0 files) is a red flag for an overstated claim.
  [ "$files" = "0" ] && files="0!EMPTY"
  printf '%-9s W%s %s  files=%s  %.70s\n' \
    "$( [ "${onbranch#OK}" = "$onbranch" ] && echo MISMATCH || echo VERIFIED )" \
    "$wk" "${full:0:12}" "$files" "$subj"
  [ "${onbranch#OK}" = "$onbranch" ] && printf '           └─ %s\n' "$onbranch"
done
