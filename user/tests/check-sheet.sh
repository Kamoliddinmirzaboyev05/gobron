#!/usr/bin/env bash
# Layering check for the BookingModal bottom sheet. Builds, then drives
# tests/sheet-layering.html in headless Chrome against the real compiled CSS.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME=${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}
[[ -x $CHROME ]] || { echo "skip: no Chrome at $CHROME"; exit 0; }

npx vite build >/dev/null
CSS=$(cd dist && ls assets/*.css | head -1)
sed "s|__CSS__|/$CSS|" tests/sheet-layering.html > dist/_sheet-layering.html
trap 'rm -f dist/_sheet-layering.html' EXIT

PORT=${PORT:-4599}
python3 -m http.server "$PORT" --directory dist >/dev/null 2>&1 &
SRV=$!
# `wait` reports 143 for the SIGTERMed server; swallow it so the trap does not
# overwrite the script's own exit status.
trap 'kill $SRV 2>/dev/null || true; wait $SRV 2>/dev/null || true; rm -f dist/_sheet-layering.html' EXIT
until curl -sf -o /dev/null "http://localhost:$PORT/_sheet-layering.html"; do sleep 0.2; done

arm() {
  # The <pre> spans lines, so extraction has to be a DOTALL regex, not sed.
  "$CHROME" --headless --disable-gpu --no-sandbox --window-size=412,915 \
    --virtual-time-budget=5000 --dump-dom "http://localhost:$PORT/_sheet-layering.html$1" 2>/dev/null |
    python3 -c '
import sys, re, html
d = sys.stdin.read()
m = re.search(r"<pre id=\"ztest-out\">(.*?)</pre>", d, re.S)
print(html.unescape(m.group(1)) if m else "harness produced no output")
'
}

fixed=$(arm "")
broken=$(arm "?old=1")
printf '%s\n\n%s\n\n' "$fixed" "$broken"

# The fix must hold, and the pre-fix markup must still reproduce the bug - if
# both arms pass, the check has gone blind and is guarding nothing.
[[ $fixed == *"ALL PASS"* ]] || { echo "FAIL: see the failing assertions in the NEW dialog arm above"; exit 1; }
[[ $broken == *"COVERED BY NAV"* ]] || { echo "FAIL: check no longer reproduces the original bug"; exit 1; }
echo "OK: CTA tappable above the nav, and the check still catches the old markup"
exit 0
