#!/bin/zsh
# Reloads the managed browser and runs one Playwright E2E script against it,
# printing PASS/FAIL per check. Exit code 1 if any check fails.
# Usage: zsh tests/e2e/run.sh tests/e2e/<name>.e2e.mjs
# Needs: npx @iwsdk/cli dev up --allow-browser-automation
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
fresh_page
npx @iwsdk/cli browser run "${1:-tests/e2e/first-thread.e2e.mjs}" --timeout 100000 2>&1 | python3 -c "
import sys, json
raw = sys.stdin.read()
try:
    d = json.loads(raw)
except Exception:
    print('ERROR', raw[:800]); sys.exit(1)
if not d.get('ok'):
    print('ERROR', json.dumps(d)[:800]); sys.exit(1)
failed = False
for c in d['data']['result']:
    if 'pass' not in c:
        continue
    failed |= not c['pass']
    print(('PASS ' if c['pass'] else 'FAIL ') + c['name'] + (' — ' + str(c.get('detail'))[:160] if c.get('detail') else ''))
sys.exit(1 if failed else 0)
"
