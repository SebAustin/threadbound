#!/bin/zsh
# Video kit: stage one named shot for recording (docs/video/shot-list.md).
# Usage: zsh tests/e2e/shot.sh <shot>
# XR shots seat the emulated player at the room's dining table and enter
# passthrough, so the diorama sits on a detected table like it would on Quest.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
SHOT=${1:?usage: zsh tests/e2e/shot.sh <shot>}
fresh_page || { echo "app not ready"; exit 1; }
R=$(SHOT=$SHOT iw browser run tests/e2e/shot-setup.e2e.mjs 2>&1)
echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['data']['result'] if d.get('ok') else d['error']['message'])"
XR=$(echo "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['result']['xr'])" 2>/dev/null)
if [ "$XR" = "True" ]; then
  iw xr enter --input-json '{}' >/dev/null 2>&1
  iw xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null 2>&1
  iw xr set-transform --input-json '{"device":"headset","position":{"x":-0.85,"y":1.15,"z":0.2}}' >/dev/null 2>&1
  iw xr look-at --input-json '{"device":"headset","target":{"x":-1.5,"y":0.79,"z":0.2}}' >/dev/null 2>&1
  iw xr exit --input-json '{}' >/dev/null 2>&1
  iw xr enter --input-json '{}' >/dev/null 2>&1
  settle session
  echo "staged $SHOT in passthrough, seated at the table: start recording"
else
  echo "staged $SHOT in the browser view: start recording"
fi
