#!/bin/zsh
# Runs the level solvability E2E one level per browser lease (leases cap at 110 s).
# Usage: zsh tests/e2e/levels.sh [levelIndex ...]   (default: all six)
cd "$(dirname "$0")/../.."
iw() { npx @iwsdk/cli "$@"; }
levels=("$@"); (( ${#levels} )) || levels=($(seq 0 $(( $(grep -c "^  [a-zA-Z]*,$" src/levels/index.ts) - 1 ))))
fail=0
for i in $levels; do
  iw browser reload --input-json '{}' >/dev/null 2>&1; sleep 7
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
