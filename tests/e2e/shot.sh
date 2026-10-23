#!/bin/zsh
# Video kit: stage one named shot for recording (docs/video/shot-list.md).
# Usage: zsh tests/e2e/shot.sh <shot>, then for a scripted take: zsh tests/e2e/take.sh <shot>
# XR shots seat the emulated player at the room's dining table and enter passthrough, so
# the diorama sits on the emulator's table, then aim the right hand once (take.sh only
# glides it). Last, shot-preflight.e2e.mjs hides the emulator chrome and checks the frame.
# The last line says "start recording" with the preflight report, or exit 1 when any
# chrome still shows, audio isn't running, or the Vite error overlay is up.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
SHOT=${1:?usage: zsh tests/e2e/shot.sh <shot>}
setup() { SHOT=$SHOT SEED=$1 iw browser run tests/e2e/shot-setup.e2e.mjs 2>&1; }
result() { python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps(d['data']['result'],separators=(',',':')) if d.get('ok') else d['error']['message'])"; }
fresh_page || { echo "app not ready"; exit 1; }
# A shot that needs a save (the daily's streak) writes it, then reloads so the game loads it.
SEEDED=$(setup 1 | result)
case "$SEEDED" in *'"seeded":true'*) fresh_page || { echo "app not ready after seeding"; exit 1; } ;; esac
R=$(setup)
echo "$R" | result
XR=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['result']['xr'])" 2>/dev/null)
if [ "$XR" = "True" ]; then
  iw xr enter --input-json '{}' >/dev/null 2>&1
  iw xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null 2>&1
  iw xr set-transform --input-json '{"device":"headset","position":{"x":-0.85,"y":1.15,"z":0.2}}' >/dev/null 2>&1
  iw xr look-at --input-json '{"device":"headset","target":{"x":-1.5,"y":0.79,"z":0.2}}' >/dev/null 2>&1
  iw xr exit --input-json '{}' >/dev/null 2>&1
  iw xr enter --input-json '{}' >/dev/null 2>&1
  settle session
  P=$(probe)
  REST_YAW=$(field "$P" "['yaw']")
  aim_hand "$(field "$P" "['chute']")"
  VIEW="in passthrough, seated at the table"
else
  VIEW="in the browser view"
fi
REPORT=$(iw browser run tests/e2e/shot-preflight.e2e.mjs 2>&1 | result)
if echo "$REPORT" | python3 -c "import sys,json;r=json.load(sys.stdin);sys.exit(0 if not r['chrome'] and r['audio']=='running' and not r['viteOverlay'] else 1)" 2>/dev/null; then
  echo "staged $SHOT $VIEW: start recording $REPORT"
else
  echo "staged $SHOT $VIEW, but chrome shows, audio is off or a Vite overlay is up: do not record $REPORT"
  exit 1
fi
