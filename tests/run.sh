#!/bin/sh
# Runs every test against the app served from the repository (python3 -m http.server).
# Usage: sh tests/run.sh [test.js …]   ·   PORT=8790 sh tests/run.sh   (default 8765)
# Logs and screenshots go to tests/out/.
cd "$(dirname "$0")" || exit 1
PORT=${PORT:-8765}
export PORT
mkdir -p out
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory .. >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT INT TERM
for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 0.5; done
TESTS=${*:-$(ls *-check.js inf-test.js gs-test.js gs-test2.js)}
fail=0
for t in $TESTS; do
  printf '%-26s ' "$t"
  if node "$t" > "out/$t.log" 2>&1; then tail -n 1 "out/$t.log"; else echo "FALLÓ"; tail -n 25 "out/$t.log"; fail=1; fi
done
exit $fail
