#!/bin/zsh
# Video kit E2E (npm run test:e2e:shots): the video docs claim only what the build
# does, every shot in SHOTS (shot-setup.e2e.mjs) stages through shot.sh with no
# emulator chrome on screen, audio running, no Vite overlay and default settings,
# and the scripted takes (take.sh) end where the shot list says, moving the hand
# only with `xr animate-to`. Exit 1 on any failure.
# Usage: zsh tests/e2e/shots.sh [shot ...]   (default: every shot in SHOTS; --docs: the docs checks
# only; --guards: the staging guards only)
# Needs: npx @iwsdk/cli dev up --headless --allow-browser-automation
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh

# Sections of script.md starting at 0:30 or later that have no `Text:` line (empty if none).
SECTIONS_WITHOUT_TEXT='
import re
text = open("docs/video/script.md").read()
missing = []
for section in re.split(r"\n(?=\*\*\d+:\d\d)", text):
    start = re.match(r"\*\*(\d+):(\d\d)", section)
    if start and int(start[1]) * 60 + int(start[2]) >= 30 and not re.search(r"^Text:", section, re.M):
        missing.append(section.splitlines()[0])
print("; ".join(missing))'

# Docs: none of the retired wording, the clearance block, captions that work with the sound off.
docs_check() {
  local hits
  hits=$(grep -n -i -e '--headless' -e 'real table' -e 'slow-mo' docs/video/*.md)
  [ -z "$hits" ] && pass "video docs: no --headless, 'real table' or 'Slow-mo'" || fail "video docs: no --headless, 'real table' or 'Slow-mo' ($hits)"
  # The old star verb and the old settings-button name (CONTEXT.md: Melody book, Settings face).
  hits=$(grep -n -i -w -E 'pok(e|es|ed|ing)|gears?' docs/video/*.md)
  [ -z "$hits" ] && pass "video docs: no poke or gear" || fail "video docs: no poke or gear ($hits)"
  hits=$(missing_from "$(clearance_block)" "${CLEARANCE[@]}")
  [ -z "$hits" ] && pass "shot list has the Clearance block, all six items" || fail "shot list has the Clearance block, all six items (missing: $hits)"
  hits=$(python3 -c "$SECTIONS_WITHOUT_TEXT")
  [ -z "$hits" ] && pass "script: a Text: line in every section from 0:30" || fail "script: a Text: line in every section from 0:30 (missing: $hits)"
  hits="$(missing_from "$(cat docs/video/script.md)" "${IN_BOTH[@]}" "own voice" "no synthetic voice")$(missing_from "$(cat docs/video/shot-list.md)" "${IN_BOTH[@]}")"
  [ -z "$hits" ] && pass "script and shot list: the voice rule, cold open, stars line, settings button and gaze caption" ||
    fail "script and shot list: the voice rule, cold open, stars line, settings button and gaze caption (missing: $hits)"
}
# Phrases both video docs must carry (ticket 05: cold open, stars line, settings shot, gaze caption).
IN_BOTH=('record after ticket 10' 'Your hands are the instrument.' 'Pinch the stars to hear it again'
  'settings button' 'Slow motion' 'Emulated eye tracking (Quest Pro preset)')
# The six clearance items, one phrase each.
CLEARANCE=("developer's own voice" 'No synthetic voice' 'English captions for every narrated line'
  'No music except the in-game audio' 'Recorded in the IWER emulator. Grey shapes stand in for your room.'
  'Nobody is named but the entrant' 'written permission' 'frame-by-frame review')
# The shot list's Clearance section, up to the next heading (empty if there is none).
clearance_block() { sed -n '/^## Clearance/,/^## [^C]/p' docs/video/shot-list.md; }
# missing_from <text> <phrase...>: the phrases the text lacks (case-insensitive), each in quotes.
missing_from() {
  local text=$1 phrase
  shift
  for phrase in "$@"; do echo "$text" | grep -q -i -F -- "$phrase" || printf "'%s' " "$phrase"; done
}

# Guards: staging stops, with no "start recording", when a pass fails. An unknown shot fails
# shot.sh's first (seed) pass; the daily's main pass, run on a fresh save without its seed pass,
# finds no 6-day streak on the plaque. The onboarding shot's staging is the fresh save.
guards_check() {
  local out code msg
  out=$(zsh tests/e2e/shot.sh no-such-shot 2>&1); code=$?
  [ $code -ne 0 ] && ! echo "$out" | grep -q -e 'staged' -e 'start recording' && echo "$out" | grep -q 'unknown shot "no-such-shot"' &&
    pass "shot.sh stops when a staging pass fails, before staging" ||
    fail "shot.sh stops when a staging pass fails, before staging (exit $code: $(echo "$out" | tail -2 | tr '\n' ' '))"
  fresh_page
  SHOT=onboarding iw browser run tests/e2e/shot-setup.e2e.mjs >/dev/null 2>&1
  msg=$(SHOT=daily iw browser run tests/e2e/shot-setup.e2e.mjs 2>&1 |
    python3 -c "import sys,json;d=json.load(sys.stdin);print('staged' if d.get('ok') else d['error']['message'])" 2>&1)
  echo "$msg" | grep -q 'Daily - streak 6' && pass "the daily won't stage without its 6-day streak" ||
    fail "the daily won't stage without its 6-day streak ($msg)"
}

# stage <shot>: run shot.sh and check the preflight JSON it prints on its last line.
stage() {
  local out code report
  out=$(zsh tests/e2e/shot.sh "$1" 2>&1); code=$?
  report=$(echo "$out" | tail -1 | sed 's/^[^{]*//')
  [ $code -eq 0 ] && pass "shot.sh $1 stages it" || fail "shot.sh $1 stages it (exit $code: $(echo "$out" | tail -2 | tr '\n' ' '))"
  echo "$report" | python3 -c "
import sys, json
r = json.load(sys.stdin)
sys.exit(0 if not r['chrome'] and r['audio'] == 'running' and not r['viteOverlay'] and r['defaultSettings'] else 1)" 2>/dev/null &&
    pass "$1 preflight: no emulator chrome, audio running, no Vite overlay, default settings" ||
    fail "$1 preflight: no emulator chrome, audio running, no Vite overlay, default settings ($report)"
}

# take <shot>: run take.sh, logging every iw call; the take may move the hand only with animate-to.
take() {
  local log=$(mktemp -t take) code moves
  IW_LOG=$log zsh tests/e2e/take.sh "$1" >/dev/null 2>&1; code=$?
  [ $code -eq 0 ] && pass "take.sh $1 performs the take" || fail "take.sh $1 performs the take (exit $code)"
  moves=$(grep -E '^xr (set-transform|look-at|animate-to)' "$log" | sort | uniq -c | tr -s ' ' | tr '\n' ';')
  grep -q '^xr animate-to' "$log" && ! grep -q -E '^xr (set-transform|look-at)' "$log" &&
    pass "take $1 moves the hand only with xr animate-to ($moves)" || fail "take $1 moves the hand only with xr animate-to ($moves)"
  rm -f "$log"
}

# expect <check> <probe field> <python test on v>: one PASS/FAIL line from a fresh probe.
expect() {
  local v=$(field "$(probe)" "$2")
  echo "$v" | python3 -c "
import sys, json
s = sys.stdin.read().strip()
try:
    v = json.loads(s)
except ValueError:
    v = s
sys.exit(0 if ($3) else 1)" && pass "$1" || fail "$1 ($v)"
}

after_stage() {
  case "$1" in
    daily) expect "daily stages showing 'Daily - streak 6'" "['worldLabel']" "v == 'Daily - streak 6'" ;;
    cold-open)
      expect "cold-open stages Encore (w1-06)" "['levelId']" "v == 'w1-06'"
      expect "cold-open hangs a-b and leaves c-d for the take" "['threads']" \
        "('a', 'b') in [(t['from'], t['to']) for t in v] and ('c', 'd') not in [(t['from'], t['to']) for t in v]" ;;
  esac
}

after_take() {
  case "$1" in
    three-cups) expect "the three-cups take solves Three Cups" "['status']" "v == 'complete'" ;;
    daily) expect "the daily take ends showing 'Daily - streak 7'" "['worldLabel']" "v == 'Daily - streak 7'" ;;
    settings)
      expect "the settings take ends in slow motion" "['slowMotion']" "v is True"
      expect "the settings take ends solved" "['status']" "v == 'complete'"
      expect "the settings take ends raised one step" "['offset']" "v['up'] == 1" ;;
    cold-open)
      expect "the cold-open take pulls the thread c-d" "['threads']" "('c', 'd') in [(t['from'], t['to']) for t in v]"
      expect "the cold-open take solves Encore" "['status']" "v == 'complete'" ;;
  esac
}

TAKES=(three-cups daily settings cold-open)
case "$1" in
  --docs) docs_check; exit $FAIL ;;
  --guards) guards_check; exit $FAIL ;;
esac
docs_check
if (( $# )); then
  SHOTS=("$@")
else
  LIST=$(node -e "import('./tests/e2e/shot-setup.e2e.mjs').then((m) => console.log(Object.keys(m.SHOTS).join(' ')))") && SHOTS=(${=LIST})
  # A failed import lists nothing: say so rather than pass on the docs checks alone.
  (( ${#SHOTS} )) || { fail "shot-setup.e2e.mjs lists the shots (node could not import it, or SHOTS is empty)"; exit 1; }
fi
guards_check
for s in $SHOTS; do
  stage "$s"
  after_stage "$s"
  if (( ${TAKES[(Ie)$s]} )); then
    take "$s"
    after_take "$s"
  fi
done
xr_stop
iw browser run tests/e2e/reset-settings.e2e.mjs >/dev/null 2>&1
exit $FAIL
