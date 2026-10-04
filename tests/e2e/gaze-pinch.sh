#!/bin/zsh
# Gaze + pinch E2E (eye-tracked headsets): look at peg a, pinch, move the pinching
# hand toward peg b, release -> one thread. Then look at the chute and pinch -> the
# drop starts. Only IWER's Quest Pro preset grants gaze-tracking (Quest 3 and the
# VR Glasses preset have no eye tracking), so this run switches the emulated device
# and always switches it back. Exit 1 on any failure.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
device() {
  echo "NOTE switching the emulated device to $1: editing iwsdk.config.json restarts the dev server (same headless browser)"
  python3 -c "import json,sys;p='iwsdk.config.json';d=json.load(open(p));d['dev']['emulator']['device']=sys.argv[1];open(p,'w').write(json.dumps(d,indent=2)+'\n')" "$1"
  # The edit restarts Vite: wait for the bridge to drop, then to come back.
  for i in $(seq 1 60); do iw dev status 2>/dev/null | grep -q '"browserCommandReady": true' || break; sleep 0.5; done
  wait_ready 150
}
trap 'device metaQuest3' EXIT
device metaQuestPro
xr_start
iw xr set-connected --input-json '{"device":"gaze","connected":true}' >/dev/null 2>&1; sleep 1
G=$(iw browser run tests/e2e/gaze-probe.e2e.mjs 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['result'])" 2>/dev/null)
[ "$G" = "True" ] && pass "the session grants gaze tracking" || { fail "the session grants gaze tracking ($G)"; exit 1; }

gaze_at() { iw xr look-at --input-json "{\"device\":\"gaze\",\"target\":$1}" >/dev/null 2>&1; sleep 0.6; }
hand_at() { iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$1}" >/dev/null 2>&1; }
pinch() { iw xr set-select-value --input-json "{\"device\":\"hand-right\",\"value\":$1}" >/dev/null 2>&1; sleep 0.3; }

P=$(probe load0)
A=$(field "$P" "['knobs']['a']"); B=$(field "$P" "['knobs']['b']")
iw xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":$(rest_hand_for "$A")}" >/dev/null 2>&1
hand_at "$A"; gaze_at "$A"; pinch 1
for t in 0.25 0.5 0.75 1.0; do
  hand_at "$(lerp_point "$A" "$B" "$t")"; sleep 0.3
done
pinch 0; sleep 0.5
T=$(field "$(probe)" "['threads']")
echo "$T" | grep -q '"from": "a", "to": "b"' && pass "gaze + pinch-pull makes a thread" || fail "gaze + pinch-pull makes a thread ($T)"

# The pinching hand rests wherever it likes; gaze alone picks the chute.
gaze_at "$(field "$P" "['chute']")"; pinch 1; pinch 0; sleep 0.5
S=$(field "$(probe)" "['status']"); [ "$S" != "idle" ] && pass "gaze at the chute + pinch starts a drop ($S)" || fail "gaze at the chute + pinch starts a drop ($S)"
xr_stop
exit $FAIL
