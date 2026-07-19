#!/bin/bash
DIR=/Users/jefftucker/fullloopcrm/.desktop-shots
WINID=/Users/jefftucker/fullloopcrm/.claude-winid
while true; do
  TS=$(date +%H%M%S)
  ID=""
  [ -x "$WINID" ] && ID=$("$WINID" 2>/dev/null)
  if [ -n "$ID" ] && [ "$ID" -gt 0 ] 2>/dev/null; then
    screencapture -x -o -l"$ID" "$DIR/shot-$TS.png" 2>/dev/null
  else
    screencapture -x -o "$DIR/shot-$TS.png" 2>/dev/null
  fi
  cp -f "$DIR/shot-$TS.png" "$DIR/latest.png" 2>/dev/null
  ls -1t "$DIR"/shot-*.png 2>/dev/null | tail -n +40 | xargs -r rm -f
  sleep 15
done
