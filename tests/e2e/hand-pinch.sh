#!/bin/zsh
# Hand pinch-pull E2E in an emulated Quest 3 session: aim right hand at knob a, pinch, sweep to knob b, release.
cd "$(dirname "$0")/../.."
iw() { npx @iwsdk/cli "$@"; }
iw browser reload --input-json '{}' >/dev/null 2>&1; sleep 7
iw xr enter --input-json '{}' >/dev/null 2>&1; sleep 3
iw xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null 2>&1
# AR sessions re-place the diorama (table or in front of the player, ≤3 s search);
# measure knob positions only after placement settles.
sleep 4
PROBE=$(iw browser run tests/e2e/hand-probe.e2e.mjs 2>/dev/null)
knob() { echo "$PROBE" | python3 -c "import sys,json;k=json.load(sys.stdin)['data']['result']['knobs']['$1'];print(json.dumps(k))"; }
A=$(knob a); B=$(knob b)
# Hold the hand where a seated player would: below and in front of the pegs.
HAND=$(python3 -c "import json;a=json.loads('$A');b=json.loads('$B');print(json.dumps({'x':(a['x']+b['x'])/2+0.1,'y':(a['y']+b['y'])/2-0.25,'z':(a['z']+b['z'])/2+0.3}))")
iw xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":$HAND}" >/dev/null 2>&1; sleep 0.3
echo "knob a=$A b=$B"
iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$A}" >/dev/null 2>&1; sleep 0.5
iw xr set-select-value --input-json '{"device":"hand-right","value":1}' >/dev/null 2>&1; sleep 0.4
for t in 0.25 0.5 0.75 1.0; do
  P=$(python3 -c "import json;a=json.loads('$A');b=json.loads('$B');print(json.dumps({k:a[k]+(b[k]-a[k])*$t for k in a}))")
  iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$P}" >/dev/null 2>&1; sleep 0.3
done
iw xr set-select-value --input-json '{"device":"hand-right","value":0}' >/dev/null 2>&1; sleep 0.5
echo "threads after hand pinch: $(iw browser run tests/e2e/hand-probe.e2e.mjs 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['result']['threads'])")"

iw xr exit --input-json '{}' >/dev/null 2>&1
