// Informe as a conductor: own salidas by default (others on request), reported salidas in their own section.
const assert = require('assert');
const { chromium, PHONE } = require('./seed');
const PORT = process.env.PORT || 8765;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const page = await (await browser.newContext(PHONE)).newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/?demo'); await page.waitForFunction(() => window.MANZANAS);
  await page.evaluate(() => {
    const Bloques = MANZANAS.slice(0, 6).map((c, i) => ({ id: c.id, territorio: '1', bloque: String(i + 1), coords: JSON.stringify(c.coords), notas: '' }));
    const hoy = ymd(new Date()), b = i => Bloques[i].id;
    const S = (id, hora, conductor, bloques) => ({ id, fecha: hoy, hora, punto: '', grupo: '', conductor, notas: '', notasBloques: '', bloques, sinTerritorio: '', especial: '' });
    const Salidas = [S('mia', '08:30', 'Juan Pérez', b(0) + ',' + b(1)), S('otra', '09:00', 'Hno. Pedro Gómez', b(2) + ',' + b(3)), S('hecha', '17:00', 'Juan', b(4))];
    const Informes = [{ id: 'i1', fecha: hoy, salida: 'hecha', bloque: b(4), estado: 'completo', porcentaje: '', nota: '', quien: 'Juan Pérez', creado: new Date().toISOString() }];
    const Conductores = [{ id: 'c1', nombre: 'Juan Pérez', clave: 'clave-de-prueba-123456', activo: 'si', creado: '' }];
    localStorage.clear();
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos: [], Salidas, Informes, Config: [], Conductores, NoVisitar: [], Fotos: [] }));
  });
  await page.goto('http://127.0.0.1:' + PORT + '/?demo&c=clave-de-prueba-123456'); await page.waitForTimeout(1300);
  await page.click('#nav [data-tab=informe]'); await page.waitForTimeout(300);
  const vista = () => page.evaluate(() => ({
    cards: [...panel.querySelectorAll(':scope > .card .card-h')].map(x => x.textContent),
    hechas: [...panel.querySelectorAll('details .card .card-h')].map(x => x.textContent),
    resumen: (panel.querySelector('details summary') || {}).textContent, mapa: [...highlightSet()].length,
  }));
  let v = await vista(); console.log('default:', v);
  assert.deepEqual(v.cards, ['08:30 · Salida'], 'only my salida still to report');
  assert.deepEqual(v.hechas, ['17:00 · Salida'], 'the reported one is in its own section');
  assert(v.resumen.includes('Ya informadas (1)'));
  assert.equal(v.mapa, 3, 'the map shows only those manzanas');
  await page.click('[data-act=allno]'); await page.waitForTimeout(200);
  const no = await page.evaluate(() => Object.entries(infForm).filter(([, f]) => f.estado === 'no').map(([, f]) => f.salida));
  assert.deepEqual(no, ['mia', 'mia'], '“No se hizo” only marks what is on screen');
  await page.screenshot({ path: 'out/informe-mias.png' });
  await page.click('[data-act=infotros][data-v="1"]'); await page.waitForTimeout(200);
  v = await vista(); console.log('with the others:', v);
  assert.deepEqual(v.cards, ['08:30 · Salida', '09:00 · Salida']);
  await page.click('[data-act=infotros][data-v=""]'); await page.waitForTimeout(200);
  // send: my salida becomes reported and moves to Ya informadas
  await page.click('[data-act=enviar]'); await page.waitForTimeout(800);
  v = await vista(); console.log('after sending:', v);
  assert.deepEqual(v.cards, []); assert.equal(v.hechas.length, 2);
  assert(await page.evaluate(() => panel.textContent.includes('No falta nada por informar este día.')));
  assert.equal(await page.evaluate(() => DB.Informes.filter(r => r.salida === 'otra').length), 0, 'nothing sent for the other salida');
  // the admin sees everything, without the switch
  await page.evaluate(() => { localStorage.setItem('predi-pin-demo', '1234'); localStorage.removeItem('predi-c-demo'); });
  await page.goto('http://127.0.0.1:' + PORT + '/?demo'); await page.waitForTimeout(1300);
  await page.click('#nav [data-tab=mas]'); await page.click('[data-act=ir][data-v=informe]'); await page.waitForTimeout(300);
  v = await vista(); console.log('admin:', v);
  assert.deepEqual(v.cards, ['09:00 · Salida']); assert.equal(v.hechas.length, 2); assert(!(await page.$('[data-act=infotros]')));
  console.log('errors:', errors); assert.deepEqual(errors, []);
  console.log('Informe mías tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
