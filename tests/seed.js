// Shared demo data for the redesign tests: 3 territories, points A/B, salidas today, upcoming (one without manzanas),
// and a past one with a manzana not reported.
const { chromium, devices } = require('playwright-core');
const PORT = process.env.PORT || 8765;
async function seed(page) {
  await page.goto('http://127.0.0.1:' + PORT + '/?demo'); await page.waitForFunction(() => window.MANZANAS);
  await page.evaluate(() => {
    const Bloques = MANZANAS.slice(0, 12).map((c, i) => ({ id: c.id, territorio: String(1 + Math.floor(i / 4)), bloque: String(i % 4 + 1), coords: JSON.stringify(c.coords), notas: '' }));
    const ll = JSON.parse(Bloques[0].coords)[0], ll2 = JSON.parse(Bloques[8].coords)[0];
    const Puntos = [{ id: 'pA', letra: 'A', nombre: 'Flia. Mendoza', lat: String(ll[0]), lng: String(ll[1]) }, { id: 'pB', letra: 'B', nombre: 'Plaza Principal', lat: String(ll2[0]), lng: String(ll2[1]) }];
    const f = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
    const S = (id, n, hora, punto, bloques, extra) => ({ id, fecha: f(n), hora, punto, grupo: '', conductor: 'Juan Pérez', notas: '', notasBloques: '', bloques, sinTerritorio: '', especial: '', ...extra });
    const Salidas = [S('hoy', 0, '17:00', 'A', Bloques[0].id + ',' + Bloques[1].id, { grupo: 'Grupo 1' }), S('m1', 1, '08:30', 'B', Bloques[8].id),
      S('m2', 2, '17:00', 'A', ''), S('m3', 3, '09:00', 'B', '', { sinTerritorio: 'si', notas: 'Predicación pública' }), S('p1', -2, '08:30', 'A', Bloques[4].id + ',' + Bloques[5].id)];
    const Informes = [{ id: 'i1', fecha: f(-2), salida: 'p1', bloque: Bloques[4].id, estado: 'completo', porcentaje: '', nota: '', quien: 'Juan Pérez', creado: new Date().toISOString() }];
    localStorage.clear();
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos, Salidas, Informes, Config: [], Conductores: [{ id: 'c1', nombre: 'Juan Pérez', clave: 'clave-de-prueba-123456', activo: 'si', creado: '' }], NoVisitar: [], Fotos: [] }));
  });
  await page.reload(); await page.waitForTimeout(1200);
}
async function login(page, pin) {
  await page.click('#nav [data-tab=mas]'); await page.click('[data-act=login]');
  await page.fill('#pin', pin); await page.click('[data-act=pin]'); await page.waitForTimeout(900);
}
const PHONE = devices['iPhone 13'], PC = { viewport: { width: 1280, height: 860 } };
/** In a salida's form (Calendario): the conductor from the list, or typed under "Otro…" if not in it. */
async function elegirConductor(page, nombre) {
  const sel = '.pg-form [data-in=pgcond]', txt = '.pg-form [data-in=pgcondtxt]';
  if (!(await page.$(sel))) return page.fill(txt, nombre); // no conductores yet: the name is typed
  const opts = await page.$$eval(sel + ' option', os => os.map(o => o.value));
  if (opts.includes(nombre)) return page.selectOption(sel, nombre);
  await page.selectOption(sel, '__otro'); await page.waitForTimeout(150);
  await page.fill(txt, nombre);
}
module.exports = { chromium, seed, login, elegirConductor, PHONE, PC };
