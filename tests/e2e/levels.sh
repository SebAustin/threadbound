#!/bin/zsh
# Runs the level solvability E2E one level per browser lease (leases cap at 110 s).
# Usage: zsh tests/e2e/levels.sh [levelIndex ...]   (default: every level)
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
# One JSON per level; tests/unit/levels.test.ts proves they are all registered.
count=$(ls src/levels/*/*.json | wc -l | tr -d ' ')
levels=("$@"); (( ${#levels} )) || levels=($(seq 0 $(( count - 1 ))))
fail=0
for i in $levels; do
  fresh_page
  LEVEL=$i iw browser run tests/e2e/levels.e2e.mjs --timeout 100000 2>&1 | python3 -c "
import sys,json
raw=sys.stdin.read()
try: d=json.loads(raw)
except Exception: print('ERROR', raw[:400]); sys.exit(1)
if not d.get('ok'): print('ERROR', json.dumps(d)[:400]); sys.exit(1)
for r in d['data']['result']:
  print(('PASS ' if r['pass'] else 'FAIL ')+json.dumps(r)[:420])
  if not r['pass']: sys.exit(1)
" || fail=1
done
exit $fail
