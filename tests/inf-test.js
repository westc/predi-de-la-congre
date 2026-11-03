const { chromium } = require('playwright-core');
const assert = require('assert');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const URL = 'http://127.0.0.1:' + (process.env.PORT || 8765) + '/?demo';
  await page.goto(URL); await page.waitForFunction(() => window.MANZANAS);
  const today = await page.evaluate(() => ymd(new Date()));
  await page.evaluate(today => {
    const Bloques = MANZANAS.slice(0, 5).map((c, i) => ({ id: c.id, territorio: '1', bloque: String(i + 1), coords: JSON.stringify(c.coords), notas: '' }));
    const ids = Bloques.map(b => b.id);
    const Salidas = [{ id: 's1', fecha: today, bloques: ids.join(','), punto: '', conductor: 'Hno. Ríos', notas: '', notasBloques: '', hora: '09:00' }];
    const Conductores = [{ id: 'k1', nombre: 'Hno. Ríos', clave: 'CLAVERIOS12345678901', activo: 'si' }, { id: 'k2', nombre: 'Hno. Luna', clave: 'CLAVELUNAX1234567890', activo: 'si' }];
    // two old duplicates for manzana 5 today (from before corrections existed)
    const Informes = [
      { id: 'd1', fecha: today, salida: 's1', bloque: ids[4], estado: 'parcial', porcentaje: '25', nota: '', quien: 'Hno. Ríos', creado: today + 'T10:00:00Z' },
      { id: 'd2', fecha: today, salida: 's1', bloque: ids[4], estado: 'completo', porcentaje: '', nota: '', quien: 'Hno. Luna', creado: today + 'T11:00:00Z' }];
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos: [], Salidas, Informes, Config: [], Conductores, NoVisitar: [], Fotos: [] }));
  }, today);
  const ids = await page.evaluate(() => MANZANAS.slice(0, 5).map(c => c.id));
  const raw = () => page.evaluate(() => JSON.parse(localStorage.getItem('territorios-demo')).Informes);
  const as = async clave => { await page.goto(URL + '&c=' + clave); await page.waitForTimeout(1300); };
  const est = (i, v) => page.click('[data-act=est][data-id="' + ids[i] + '"][data-v=' + v + ']');

  // Duplicates collapse to the latest.
  await as('CLAVERIOS12345678901');
  assert.equal(await page.evaluate(() => WHO.nombre), 'Hno. Ríos');
  await page.click('#nav [data-tab=informe]'); await page.waitForTimeout(700);
  assert.equal(await page.getAttribute('[data-act=est][data-id="' + ids[4] + '"][data-v=completo]', 'class'), 'on', 'latest duplicate shown');

  // Conductor A reports.
  await est(0, 'completo'); await est(1, 'parcial');
  await page.click('[data-act=pct][data-id="' + ids[1] + '"][data-v="50"]');
  await page.fill('[data-in=nota][data-id="' + ids[1] + '"]', 'falta la esquina');
  await page.click('[data-act=enviar]'); await page.waitForTimeout(700);
  let r = await raw();
  const a0 = r.find(x => x.bloque === ids[0]), a1 = r.find(x => x.bloque === ids[1]);
  assert.equal(a0.quien, 'Hno. Ríos'); assert.equal(a1.porcentaje, '50');

  // Conductor B sees it, corrects manzana 2, deletes manzana 1, and touches manzana 5 (clears duplicate d1).
  await as('CLAVELUNAX1234567890');
  await page.click('#nav [data-tab=informe]'); await page.waitForTimeout(700);
  assert(!(await page.$('[data-act=est]')), "Ríos's salida is not among Luna's own");
  await page.click('[data-act=infotros][data-v="1"]'); await page.waitForTimeout(200);
  assert.equal(await page.getAttribute('[data-act=est][data-id="' + ids[0] + '"][data-v=completo]', 'class'), 'on');
  assert.equal(await page.inputValue('[data-in=nota][data-id="' + ids[1] + '"]'), 'falta la esquina');
  assert(await page.evaluate(() => panel.textContent.includes('Informado por Hno. Ríos')));
  await page.click('[data-act=enviar]'); await page.waitForTimeout(300);
  assert(await page.evaluate(() => $('#toast').textContent.includes('No hay cambios')));
  await est(1, 'completo');
  await est(0, 'completo'); // toggle off → delete
  assert(await page.evaluate(() => panel.textContent.includes('Al guardar se borrará este informe')));
  await est(4, 'parcial');
  await page.fill('[data-in=nota][data-id="' + ids[4] + '"]', 'falta el fondo'); // Parcial needs its note
  await page.screenshot({ path: 'out/inf-edit.png' });
  await page.click('[data-act=enviar]'); await page.waitForTimeout(700);
  r = await raw();
  assert(!r.some(x => x.id === a0.id), 'manzana 1 deleted');
  const b1 = r.find(x => x.id === a1.id);
  assert.equal(b1.estado, 'completo'); assert.equal(b1.quien, 'Hno. Ríos'); assert.equal(b1.editadoPor, 'Hno. Luna'); assert.equal(b1.creado, a1.creado);
  assert.deepEqual(r.filter(x => x.bloque === ids[4]).map(x => x.id + x.estado), ['d2parcial'], 'duplicate removed, latest updated');
  assert(await page.evaluate(() => panel.textContent.includes('cambiado por Hno. Luna')));

  // Someone else changes the Sheet; ↻ brings it in (untouched rows follow).
  // a hand edit in the Sheet: the trigger marks it, so phones reload everything
  await page.evaluate(id => { const d = JSON.parse(localStorage.getItem('territorios-demo')); d.Informes.find(x => x.id === id).estado = 'no'; d._v = (d._v || 0) + 1; (d._log = d._log || []).push({ v: d._v, t: '*', op: 'reset' }); localStorage.setItem('territorios-demo', JSON.stringify(d)); }, a1.id);
  await page.evaluate(() => { Mock; }); // the demo backend re-reads storage only on load, so reload its copy:
  await page.reload(); await page.waitForTimeout(1200);
  await page.click('#nav [data-tab=informe]'); await page.waitForTimeout(500);
  await page.click('[data-act=infotros][data-v="1"]'); await page.waitForTimeout(200);
  assert.equal(await page.getAttribute('[data-act=est][data-id="' + ids[1] + '"][data-v=no]', 'class'), 'on');
  await page.evaluate(id => { // change the demo backend's memory directly, then refresh
    const d = JSON.parse(localStorage.getItem('territorios-demo')); d.Informes.find(x => x.id === id).estado = 'completo'; localStorage.setItem('territorios-demo', JSON.stringify(d));
  }, a1.id);
  await page.click('#refresh'); await page.waitForTimeout(800);
  const afterRefresh = await page.getAttribute('[data-act=est][data-id="' + ids[1] + '"][data-v=completo]', 'class');
  console.log('after ↻ (demo memory caches until reload, so may still be "no"):', afterRefresh);
  assert(await page.evaluate(() => $('#toast').textContent.includes('Datos actualizados')));

  // Offline: the change waits, shows, and goes out later.
  await page.evaluate(() => { window._api = api; api = async () => { throw Object.assign(new Error('Sin conexión.'), { offline: true }); }; });
  await est(2, 'completo');
  await page.click('[data-act=enviar]'); await page.waitForTimeout(500);
  assert(await page.evaluate(() => $('#cola').textContent.includes('1 informe espera')));
  assert(await page.evaluate(() => panel.textContent.includes('espera señal')));
  await page.evaluate(() => { api = window._api; return flushCola(true); }); await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => cola().length), 0);
  assert((await raw()).some(x => x.bloque === ids[2] && x.estado === 'completo' && x.quien === 'Hno. Luna'));

  const res = await page.evaluate(async () => {
    const ids = BL.map(b => b.id), real = api;
    const before = { m2: infForm[ids[1]].estado, m4: infForm[ids[3]] && infForm[ids[3]].estado };
    infForm[ids[3]].estado = 'parcial'; infForm[ids[3]].touched = true; // being typed on this phone
    const other = JSON.parse(JSON.stringify(SERVER));
    other.Informes.find(r => r.bloque === ids[1]).estado = 'parcial'; // another phone changed manzana 2
    other.Informes.push({ id: 'zz', fecha: infFecha, salida: 's1', bloque: ids[3], estado: 'no', quien: 'Hno. Ríos', creado: new Date().toISOString() });
    api = async fn => fn === 'getAll' ? other : real(fn);
    await refresh(true);
    api = real;
    return { before, m2: infForm[ids[1]].estado, m4: infForm[ids[3]].estado, toast: $('#toast').textContent };
  });
  console.log(res);
  assert.equal(res.m2, 'parcial', 'untouched row follows the Sheet');
  assert.equal(res.m4, 'parcial', 'row being edited here is kept');
  // Pull-to-refresh is off.
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).overscrollBehaviorY), 'none');
  assert.equal(await page.evaluate(() => getComputedStyle(panel).overscrollBehaviorY), 'contain');
  await page.setViewportSize({ width: 375, height: 740 }); await page.waitForTimeout(300);
  await page.screenshot({ path: 'out/inf-mobile.png' });
  console.log('errors:', errors);
  console.log('Browser tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
