// Territorio → Colorear por Territorio | Manzana: the heat map of whole territories or of each manzana.
const assert = require('assert');
const { chromium, PC } = require('./seed');
const PORT = process.env.PORT || 8765;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const page = await (await browser.newContext(PC)).newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/?demo'); await page.waitForFunction(() => window.MANZANAS);
  await page.evaluate(() => {
    const Bloques = MANZANAS.slice(0, 8).map((c, i) => ({ id: c.id, territorio: String(1 + Math.floor(i / 4)), bloque: String(i % 4 + 1), coords: JSON.stringify(c.coords), notas: '' }));
    const f = n => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
    const I = (i, n, estado) => ({ id: 'i' + i + n, fecha: f(n), salida: '', bloque: Bloques[i].id, estado, porcentaje: estado === 'parcial' ? '50' : '', nota: '', quien: 'Juan Pérez', creado: f(n) + 'T10:00:00Z' });
    // T1: manzana 1 done 5 days ago, 2 done 200 days ago, 3 partial after a completion, 4 never
    const Informes = [I(0, 5, 'completo'), I(1, 200, 'completo'), I(2, 90, 'completo'), I(2, 10, 'parcial'), I(4, 30, 'completo'), I(5, 30, 'completo'), I(6, 30, 'completo'), I(7, 30, 'completo')];
    localStorage.clear();
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos: [], Salidas: [], Informes, Config: [], Conductores: [], NoVisitar: [], Fotos: [] }));
    localStorage.setItem('predi-pin-demo', '1234');
  });
  await page.reload(); await page.waitForTimeout(1300);
  await page.click('#nav [data-tab=territorio]'); await page.waitForTimeout(300);
  const colores = () => page.evaluate(() => BL.filter(b => b.t === 1).map(b => gBloques.getLayers().find(l => l._bid === b.id).options.fillColor));
  let c = await colores(); console.log('by territory:', c);
  assert.equal(new Set(c).size, 1, 'one color for the whole territory');
  await page.click('[data-act=terrcolor][data-v=manzana]'); await page.waitForTimeout(300);
  c = await colores(); console.log('by manzana:', c);
  assert.equal(new Set(c).size, 4, 'each manzana its own color');
  assert.equal(c[3], await page.evaluate(() => NEVER), 'never completed is gray');
  assert(await page.evaluate(() => panel.textContent.includes('Completada hace poco')), 'manzana legend');
  assert(await page.evaluate(() => gBloques.getLayers().find(l => l._bid === BL.find(b => b.t === 1 && b.n === 3).id).getTooltip().getContent().includes('◐')), '◐ on partial');
  await page.evaluate(() => { const b = BL.find(b => b.t === 1 && b.n === 2); gBloques.getLayers().find(l => l._bid === b.id).fire('click', { latlng: L.latLng(centroid(b.coords)) }); });
  await page.waitForTimeout(300);
  const pop = await page.evaluate(() => document.querySelector('.leaflet-popup-content').textContent);
  console.log('popup:', pop.replace(/\s+/g, ' ').slice(0, 120)); assert(pop.includes('Manzana 2') && pop.includes('hace 200 días') && pop.includes('Territorio 1'));
  await page.screenshot({ path: 'out/terr-color-manzana.png' });
  await page.reload(); await page.waitForTimeout(1300); await page.click('#nav [data-tab=territorio]'); await page.waitForTimeout(300);
  assert.equal(new Set(await colores()).size, 4, 'remembered');
  console.log('errors:', errors); assert.deepEqual(errors, []);
  console.log('Colorear por tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
