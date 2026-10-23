#!/bin/zsh
# Evidence for the privacy note (docs/submission.md, "Content and privacy"): on a fresh
# page, a resource observer goes in, then an emulated Quest 3 session starts with hands,
# and every cross-origin URL the app frame requested is listed. Pass if the hand models
# loaded from jsDelivr were seen, and if, beyond IWER's own named dev assets, the only
# outside host is cdn.jsdelivr.net under /npm/@webxr-input-profiles/. Exit 1 on any failure.
# The observer goes in before `xr enter` (see xr-hosts.e2e.mjs for why).
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
# IWER's own named dev assets: the dev server's emulator loads these, the production build never does.
# - www.unpkg.com/@iwer/sem@<version>/captures/<room>.json: the synthetic room (iwsdk.config.json dev.emulator.environment).
IWER_ASSETS='https://www.unpkg.com/@iwer/sem@'
HAND_MODELS='https://cdn.jsdelivr.net/npm/@webxr-input-profiles/'

# hosts <observe|list>: run the page helper and print its result as JSON.
hosts() {
  HOSTS=$1 iw browser run tests/e2e/xr-hosts.e2e.mjs 2>/dev/null |
    python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']['result']))" 2>/dev/null
}
# outside <list json>: the recorded URLs that are neither IWER's assets nor the hand models, one per line.
outside() {
  echo "$1" | IWER="$IWER_ASSETS" HANDS="$HAND_MODELS" python3 -c "
import sys,json,os
allowed=(os.environ['IWER'],os.environ['HANDS'])
print('\n'.join(u for u in json.load(sys.stdin).get('urls',[]) if not u.startswith(allowed)))"
}

fresh_page || { fail "the page loads"; exit 1; }
O=$(hosts observe)
[ "$(field "$O" "['observing']")" = "true" ] || { fail "a resource observer is installed before XR entry ($O)"; exit 1; }
echo "NOTE observer installed with $(field "$O" "['bufferedAtInstall']") page-load entries already in the resource-timing buffer"
iw xr enter --input-json '{}' >/dev/null 2>&1
iw xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null 2>&1
settle session || fail "an XR session with hands starts"
L=$(hosts list)
xr_stop

N=$(field "$L" "['handModels']")
[ "${N:-0}" -ge 2 ] 2>/dev/null && pass "the hand models load from jsDelivr ($N .glb in $(field "$L" "['waitedMs']") ms)" ||
  fail "the hand models load from jsDelivr ($L)"
echo "NOTE the resource-timing buffer alone holds $(field "$L" "['bufferSize']") entries and $(field "$L" "['bufferHandModels']") hand models"
echo "Cross-origin URLs requested:"
echo "$L" | python3 -c "import sys,json;[print('  '+u) for u in json.load(sys.stdin).get('urls',[])]"
X=$(outside "$L")
[ -z "$X" ] && pass "beyond IWER's room, the only outside host is cdn.jsdelivr.net under /npm/@webxr-input-profiles/" ||
  fail "beyond IWER's room, the only outside host is cdn.jsdelivr.net under /npm/@webxr-input-profiles/ (also: ${X//$'\n'/, })"
exit $FAIL
