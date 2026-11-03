const { chromium } = require('playwright-core');
const assert = require('assert');
const { elegirConductor } = require('./seed');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/?demo'); await page.waitForFunction(() => window.MANZANAS);
  await page.evaluate(() => {
    const Bloques = MANZANAS.slice(0, 8).map((c, i) => ({ id: c.id, territorio: String(Math.floor(i / 4) + 1), bloque: String(i % 4 + 1), coords: JSON.stringify(c.coords), notas: '' }));
    const ll = JSON.parse(Bloques[0].coords)[0];
    const Puntos = [['pA', 'A', 'Flia. Mendoza'], ['pD', 'D', 'Plaza Principal']].map(([id, letra, nombre], i) => ({ id, letra, nombre, lat: String(ll[0] - i * 0.001), lng: String(ll[1]) }));
    const Conductores = [{ id: 'k1', nombre: 'Pedro Gómez', clave: 'CLAVEPEDRO1234567890', activo: 'si' }];
    localStorage.clear();
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos, Salidas: [], Informes: [], Config: [], Conductores, NoVisitar: [], Fotos: [] }));
    localStorage.setItem('predi-pin-demo', '1234');
  });
  await page.reload(); await page.waitForTimeout(1300);
  const stored = () => page.evaluate(() => { const d = JSON.parse(localStorage.getItem('territorios-demo')); return { salidas: d.Salidas.length, modelo: (d.Config.find(c => c.id === 'semana_modelo') || {}).valor }; });
  const pend = () => page.evaluate(() => pendingCount());
  await page.click('#nav [data-tab=calendario]');
  const addModelo = async (dia, hora, punto) => {
    await page.click('[data-act=calsub][data-v=modelo]'); await page.click('[data-act=pgmodelonueva]'); await page.selectOption('[data-in=pg][data-k=dia]', String(dia));
    await page.fill('[data-in=pg][data-k=hora]', hora); await page.selectOption('[data-in=pg][data-k=punto]', punto); await page.click('[data-act=pgguardar]'); await page.waitForTimeout(150);
    await page.click('#back');
  };
  await addModelo(4, '16:30', 'A'); await addModelo(5, '19:00', 'D');
  await page.click('[data-act=pgmes][data-v="1"]'); const mes = await page.evaluate(() => prog.mes);
  await page.click('[data-act=pggenerar]'); await page.waitForTimeout(200);
  const n = await page.evaluate(m => salidasDelMes(m).length, mes);
  console.log('staged: salidas', n, '· pending', await pend(), '· in the Sheet', await stored());
  assert.equal((await stored()).salidas, 0, 'nothing saved yet'); assert(await page.isVisible('#pending.show'));
  assert(await page.evaluate(() => panel.textContent.includes('sin guardar')));
  await page.screenshot({ path: 'out/stage.png' });
  // Descartar
  await page.click('[data-act=discard]'); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(m => salidasDelMes(m).length, mes), 0); assert.equal(await pend(), 0);
  // again, then edit a conductor, delete one, and Guardar todo
  await addModelo(4, '16:30', 'A'); await addModelo(5, '19:00', 'D');
  await page.click('[data-act=pggenerar]'); await page.waitForTimeout(200);
  await page.click('.list-item[data-act=pgedit] >> nth=0'); await elegirConductor(page, 'Pedro Gómez'); await page.click('[data-act=pgguardar]');
  await page.click('.list-item[data-act=pgedit] >> nth=1'); await page.click('[data-act=pgborrar]');
  const staged = await page.evaluate(m => salidasDelMes(m).length, mes);
  // meanwhile, the siervo chooses manzanas for the first salida on another phone
  await page.click('[data-act=commit]'); await page.waitForTimeout(1200);
  let st = await stored(); console.log('after Guardar todo:', st.salidas, 'salidas, modelo saved:', !!st.modelo);
  assert.equal(st.salidas, staged); assert.equal(JSON.parse(st.modelo).length, 2); assert.equal(await pend(), 0);
  const first = await page.evaluate(m => salidasDelMes(m)[0], mes); assert.equal(first.conductor, 'Pedro Gómez');
  assert(!('_prog' in first), 'helper fields not saved');
  // ---- manzanas chosen on another phone while the program has unsaved changes are kept
  await page.click('.list-item[data-act=pgedit] >> nth=0'); await page.fill('[data-in=pg][data-k=hora]', '17:00'); await page.click('[data-act=pgguardar]');
  const page2 = await ctx.newPage(); await page2.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/?demo'); await page2.evaluate(() => localStorage.setItem('predi-pin-demo', '5678'));
  await page2.reload(); await page2.waitForTimeout(1300);
  await page2.evaluate(id => saveRows('Salidas', [{ ...DB.Salidas.find(s => s.id === id), bloques: BL.slice(0, 2).map(b => b.id).join(',') }]), first.id); await page2.waitForTimeout(800);
  await page.click('[data-act=commit]'); await page.waitForTimeout(1500);
  const merged = await page.evaluate(id => { const d = JSON.parse(localStorage.getItem('territorios-demo')); return d.Salidas.find(s => s.id === id); }, first.id);
  console.log('merged:', { hora: merged.hora, bloques: merged.bloques.split(',').length });
  assert.equal(merged.hora, '17:00'); assert.equal(merged.bloques.split(',').length, 2, 'manzanas kept');
  // ---- conductor: Salir and back
  await page.evaluate(() => localStorage.setItem('predi-pin-demo', ''));
  await page.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/?demo&c=CLAVEPEDRO1234567890'); await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(() => WHO.role), 'conductor');
  await page.click('#nav [data-tab=mas]'); await page.click('[data-act=csalir]'); await page.waitForTimeout(300);
  let w = await page.evaluate(() => ({ role: WHO.role, tabs: document.querySelectorAll('#nav [data-tab]').length, url: location.search, back: !!document.querySelector('[data-act=cvolver]') }));
  console.log('after Salir:', w); assert.equal(w.role, 'publicador'); assert.equal(w.url, '?demo'); assert(w.back);
  await page.screenshot({ path: 'out/conductor-salir.png' });
  // reopening from a home-screen link that still has the key: stays a publicador
  await page.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/?demo&c=CLAVEPEDRO1234567890'); await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(() => WHO.role), 'publicador', 'stays out');
  await page.click('#nav [data-tab=mas]'); await page.click('[data-act=cvolver]'); await page.waitForTimeout(1200);
  w = await page.evaluate(() => ({ role: WHO.role, nombre: WHO.nombre, url: location.search, back: !!document.querySelector('[data-act=cvolver]') }));
  console.log('after Entrar otra vez:', w); assert.equal(w.role, 'conductor'); assert.equal(w.nombre, 'Pedro Gómez'); assert(!w.back);
  await page.reload(); await page.waitForTimeout(1300); assert.equal(await page.evaluate(() => WHO.role), 'conductor', 'still in after reopening');
  console.log('errors:', errors); console.log('Stage + salir tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
