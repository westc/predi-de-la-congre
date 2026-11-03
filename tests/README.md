# Pruebas

Browser tests of the app (Playwright driving Chrome, against the demo mode: data in the browser only) and tests
of `apps-script/Code.gs` with fake Apps Script services. Every name in them is made up: never put real
congregation data (names, informes) here, this repository is public.

```sh
cd tests && npm ci
sh run.sh                    # all of them (needs Chrome and python3)
sh run.sh informe-mapa-check.js
PORT=8790 sh run.sh          # if port 8765 is taken
```

They also run on GitHub (Actions → Pruebas) on every push. Logs and screenshots go to `tests/out/` (not kept in git;
on GitHub, a failed run uploads them). `fotos.js` only takes screenshots of every screen.
