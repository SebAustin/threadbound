#!/bin/zsh
# Ticket 20: levels that solve reliably, not just once. Drops every stored solution (the campaign
# levels and the dailies) RUNS times at normal and slow speed, each time at the study pose and on
# the passthrough table turned 0 and 90 degrees, on a fresh page, one level per browser lease
# (leases cap at 110 s). Prints each level's pass rate per condition, and exits 1 unless every
# level solved RUNS out of RUNS in every condition.
# Usage: RUNS=5 zsh tests/e2e/levels-robust.sh [level ...]   (default RUNS=3, every level)
#   level: campaign:<campaign index> | daily:<pool index>;  SPEEDS="1" runs slow motion only.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
runs=${RUNS:-3}
speeds=(${=SPEEDS:-0 1})
count=$(ls src/levels/*/*.json | wc -l | tr -d ' ')
dailies=7 # DAILY_LEVELS.length (see src/levels/index.ts)
levels=("$@")
if (( ! ${#levels} )); then
  for i in $(seq 0 $(( count - 1 ))); do levels+=("campaign:$i"); done
  for i in $(seq 0 $(( dailies - 1 ))); do levels+=("daily:$i"); done
fi
rows=$(mktemp -t levels-robust)
for level in $levels; do
  for slow in $speeds; do
    for run in $(seq 1 $runs); do
      fresh_page
      LEVEL=$level SLOW=$slow iw browser run tests/e2e/levels-robust.e2e.mjs --timeout 100000 2>&1 |
        python3 tests/e2e/levels-robust.py row "$level" "$slow" "$run" >> "$rows"
    done
  done
done
python3 tests/e2e/levels-robust.py table "$rows" "$runs"
verdict=$?
rm -f "$rows"
exit $verdict
