#!/bin/bash
# Explicitly mark Jeff activity. Run manually if you know you'll be away
# but want the timer reset before departure.
echo $(($(date +%s) * 1000)) > /Users/jefftucker/fullloopcrm/data/jeff-last-interaction.txt
echo "Activity marked: $(date)"
