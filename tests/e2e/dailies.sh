#!/bin/zsh
# Proves every daily puzzle (campaign board on a tight spool) solvable, one per browser lease.
cd "$(dirname "$0")/../.."
count=7 # DAILY_LEVELS.length (see src/levels/index.ts)
fail=0
for i in $(seq 0 $(( count - 1 ))); do
  DAILY=$i zsh tests/e2e/run.sh tests/e2e/daily-proof.e2e.mjs || fail=1
done
exit $fail
