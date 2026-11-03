// The conductor of a salida chosen from the list (so the app knows whose it is), and 📤 Recordar for missing informes.
const assert = require('assert');
const { chromium, elegirConductor, PC } = require('./seed');
const PORT = process.env.PORT || 8765;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const ctx = await browser.newContext(PC), page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto('http://127.0.0.1:' + PORT + '/?demo'); await page.waitForFunction(() => window.MANZANAS);
  await page.evaluate(() => {
    const Bloques = MANZANAS.slice(0, 6).map((c, i) => ({ id: c.id, territorio: '1', bloque: String(i + 1), coords: JSON.stringify(c.coords), notas: '' }));
    const f = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); }, b = i => Bloques[i].id;
    const S = (id, n, conductor, bloques) => ({ id, fecha: f(n), hora: '08:30', punto: '', grupo: '', conductor, notas: 'Casa de prueba', notasBloques: '', bloques, sinTerritorio: '', especial: '' });
    // two past salidas of Ana without informes (one typed differently), one of Beto, and one upcoming typed by hand
    const Salidas = [S('p1', -3, 'Ana  Torres', b(0)), S('p2', -1, 'ana torres', b(1) + ',' + b(2)), S('p3', -2, 'Beto Ruiz', b(3)), S('f1', 2, 'Hno. Torres', b(4))];
    const Conductores = [{ id: 'k1', nombre: 'Ana Torres', clave: 'CLAVEANATORRES123456', activo: 'si' }, { id: 'k2', nombre: 'Beto Ruiz', clave: 'CLAVEBETORUIZ1234567', activo: 'si' },
      { id: 'k3', nombre: 'Ciro Paz', clave: 'CLAVECIROPAZ12345678', activo: 'no' }];
    localStorage.clear(); localStorage.setItem('predi-pin-demo', '1234');
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos: [], Salidas, Informes: [], Config: [], Conductores, NoVisitar: [], Fotos: [] }));
  });
  await page.reload(); await page.waitForTimeout(1300);
  // ---- 📤 Recordar: one message per conductor with all their salidas missing informes, with their personal link
  await page.click('#nav [data-tab=hoy]'); await page.waitForTimeout(200);
  assert(await page.$('.falta [data-act=recordar]'), 'Recordar next to the missing informes');
  await page.click('.falta [data-act=recordar][data-v="ana torres"]'); await page.waitForTimeout(200);
  const texto = await page.inputValue('#rec-texto'); console.log(texto);
  assert(texto.startsWith('Saludos, ana torres. Le recordamos que falta el informe de estas salidas:'), 'formal');
  assert(texto.includes('Puede enviarlo') && texto.includes('marque “No se hizo”') && !/Puedes|marca “/.test(texto));
  assert.equal(texto.split('\n').filter(l => l.startsWith('• ')).length, 2, 'both of her salidas, though typed differently');
  assert(texto.includes('&c=CLAVEANATORRES123456') || texto.includes('?demo&c=CLAVEANATORRES123456'), 'her own link');
  assert(!texto.includes('Beto'));
  const wa = await page.evaluate(() => { let u = ''; window.open = x => { u = x; }; ACT.recwa(); return u; });
  assert(wa.startsWith('https://wa.me/?text=') && decodeURIComponent(wa).includes('estas salidas'), 'WhatsApp with the text');
  await page.click('#share [data-act=shareclose]');
  // ---- the conductor picked from the list in Calendario
  await page.click('#nav [data-tab=calendario]'); await page.click('[data-act=pgvista][data-v=lista]'); await page.waitForTimeout(200);
  assert(await page.evaluate(() => panel.textContent.includes('con un conductor que no está en la lista')), 'warns about hand-typed names');
  await page.click('#panel [data-act=pgedit][data-id=f1]'); await page.waitForTimeout(200);
  const opts = await page.$$eval('.pg-form [data-in=pgcond] option', os => os.map(o => o.textContent));
  console.log('options:', opts);
  assert.deepEqual(opts, ['— Sin conductor —', 'Ana Torres', 'Beto Ruiz', 'Hno. Torres (no está en la lista)', 'Otro (escribir el nombre)…'], 'active conductores; the old name kept');
  await page.screenshot({ path: 'out/conductor-lista.png' });
  await elegirConductor(page, 'Ana Torres'); await page.click('.pg-form [data-act=pgguardar]'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => DB.Salidas.find(s => s.id === 'f1').conductor), 'Ana Torres');
  // "Otro…": someone not in the list, typed
  await page.click('[data-act=pgnueva]'); await page.fill('.pg-form [data-in=pg][data-k=hora]', '16:00'); await page.fill('.pg-form [data-in=pg][data-k=notas]', 'Visita');
  await elegirConductor(page, 'Hno. Visitante'); await page.click('.pg-form [data-act=pgguardar]'); await page.waitForTimeout(300);
  assert(await page.evaluate(() => DB.Salidas.some(s => s.conductor === 'Hno. Visitante')));
  await page.click('#pending [data-act=commit]'); await page.waitForTimeout(800);
  // Planificar's editor has the same list
  await page.click('#nav [data-tab=planificar]'); await page.click('[data-act=plannueva]'); await page.waitForTimeout(200);
  assert(await page.$('[data-in=pcond]'));
  await page.selectOption('[data-in=pcond]', '__otro'); await page.waitForTimeout(200);
  assert(await page.$('[data-in=pcondtxt]')); await page.click('[data-act=condlista][data-v=pcond]'); await page.waitForTimeout(200);
  await page.selectOption('[data-in=pcond]', 'Beto Ruiz');
  assert.equal(await page.evaluate(() => plan.conductor), 'Beto Ruiz');
  // ---- the conductor sees the salida as theirs (exact name)
  await page.evaluate(() => localStorage.setItem('predi-pin-demo', ''));
  await page.goto('http://127.0.0.1:' + PORT + '/?demo&c=CLAVEANATORRES123456'); await page.waitForTimeout(1300);
  assert.equal(await page.evaluate(() => WHO.nombre), 'Ana Torres');
  assert(await page.evaluate(() => esMia(DB.Salidas.find(s => s.id === 'f1')) && esMia(DB.Salidas.find(s => s.id === 'p2'))), 'exact and differently-typed');
  assert(!(await page.evaluate(() => esMia(DB.Salidas.find(s => s.id === 'p3')))));
  assert(!(await page.$('[data-act=recordar]')), 'conductores have no Recordar');
  console.log('errors:', errors); assert.deepEqual(errors, []);
  console.log('Conductor + recordar tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
