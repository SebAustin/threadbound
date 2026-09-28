#!/bin/zsh
# Usage: zsh tests/e2e/probe.sh <levelIndex> '<threads json>' [seconds]
cd "$(dirname "$0")/../.."
npx @iwsdk/cli browser reload --input-json '{}' >/dev/null 2>&1; sleep 7
LEVEL=$1 THREADS=$2 SECONDS=${3:-6} npx @iwsdk/cli browser run tests/e2e/probe.e2e.mjs --timeout 60000 2>&1 | python3 -c "
import sys,json
d=json.loads(sys.stdin.read())
if not d.get('ok'): print(json.dumps(d)[:500]); sys.exit(1)
r=d['data']['result']; print(r['state'])
for i,f in enumerate(r['trace']): print(f'{i*0.3:4.1f}s  {f}')
"
