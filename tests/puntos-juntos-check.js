// Meeting points too close together: their letters spread in a ring, each with a dot on its spot and a line to it.
const assert = require('assert'), fs = require('fs');
const { chromium, PC } = require('./seed');
const PORT = process.env.PORT || 8765;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const page = await (await browser.newContext(PC)).newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/?demo'); await page.waitForFunction(() => window.MANZANAS);
  await page.evaluate(() => {
    const Bloques = MANZANAS.slice(0, 8).map((c, i) => ({ id: c.id, territorio: String(1 + Math.floor(i / 4)), bloque: String(i % 4 + 1), coords: JSON.stringify(c.coords), notas: '' }));
    const [la, ln] = JSON.parse(Bloques[0].coords)[0], [lb, lnb] = JSON.parse(Bloques[6].coords)[0];
    const P = (id, letra, nombre, dla, dln, base) => ({ id, letra, nombre, lat: String((base ? lb : la) + dla), lng: String((base ? lnb : ln) + dln) });
    // A, C, D within ~15 m; E exactly on A; B far away
    const Puntos = [P('pA', 'A', 'Flia. Mendoza', 0, 0), P('pC', 'C', 'Flia. Castro', 0.00008, 0.00010), P('pD', 'D', 'Salón del Reino', -0.00006, 0.00012),
      P('pE', 'E', 'Flia. Mendoza (patio)', 0, 0), P('pB', 'B', 'Plaza Principal', 0, 0, true)];
    localStorage.clear();
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos, Salidas: [], Informes: [], Config: [], Conductores: [], NoVisitar: [], Fotos: [] }));
  });
  await page.reload(); await page.waitForTimeout(1300);
  const cajas = () => page.evaluate(() => [...document.querySelectorAll('.lbl-p span')].map(s => { const r = s.getBoundingClientRect(); return { l: s.textContent, x: r.left, y: r.top, w: r.width, h: r.height, linea: !!s.style.left }; }));
  const choques = cs => cs.filter((a, i) => cs.some((b, j) => j > i && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)).map(c => c.l);
  for (const z of [15, 16, 17, 18, 19]) {
    await page.evaluate(z => map.setView(L.latLng(+DB.Puntos[0].lat, +DB.Puntos[0].lng), z, { animate: false }), z); await page.waitForTimeout(300);
    const cs = await cajas();
    console.log('zoom', z, '· moved:', cs.filter(c => c.linea).map(c => c.l).join('') || '—', '· overlapping:', choques(cs));
    assert.deepEqual(choques(cs), [], 'no letter covers another at zoom ' + z);
    assert.equal(await page.evaluate(() => document.querySelectorAll('.leaflet-puntoLineas-pane .pt-linea').length), cs.filter(c => c.linea).length, 'a line for each moved letter');
    assert(cs.find(c => c.l === 'E').linea && cs.find(c => c.l === 'A').linea, 'two points on the same spot always spread');
    assert(!cs.find(c => c.l === 'B').linea, 'a point on its own stays on its spot');
    if (z === 17) await page.screenshot({ path: 'out/puntos-juntos-mapa.png', clip: { x: 520, y: 200, width: 700, height: 450 } });
  }
  // the printed map
  await page.click('#nav [data-tab=lugares]'); await page.click('[data-act=mapaimp]'); await page.waitForTimeout(2500);
  const png = await page.evaluate(async () => { const i = document.querySelector('#share img'); await i.decode(); const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); return c.toDataURL(); });
  fs.writeFileSync('out/puntos-juntos-imprimir.png', Buffer.from(png.split(',')[1], 'base64'));
  // unit: the ring keeps letters apart
  const r = await page.evaluate(() => { const pos = [[100, 100], [100, 100], [105, 98], [300, 300]], off = separarPuntos(pos, 26); return pos.map((p, i) => [p[0] + off[i][0], p[1] + off[i][1]]); });
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert(Math.hypot(r[i][0] - r[j][0], r[i][1] - r[j][1]) >= 52, 'ring letters apart');
  assert.deepEqual(r[3], [300, 300]);
  console.log('errors:', errors); assert.deepEqual(errors, []);
  console.log('Puntos juntos tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
