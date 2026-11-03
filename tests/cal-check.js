const { chromium } = require('playwright-core');
const assert = require('assert');
const { elegirConductor } = require('./seed');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/?demo'); await page.waitForFunction(() => window.MANZANAS);
  const mes = await page.evaluate(() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 1); return ymd(d).slice(0, 7); });
  await page.evaluate(mes => {
    const Bloques = MANZANAS.slice(0, 8).map((c, i) => ({ id: c.id, territorio: String(Math.floor(i / 4) + 1), bloque: String(i % 4 + 1), coords: JSON.stringify(c.coords), notas: '' }));
    const ll = JSON.parse(Bloques[0].coords)[0];
    const Puntos = [['pA', 'A', 'Flia. Mendoza'], ['pD', 'D', 'Flia. Vargas'], ['pP', 'P', 'Plaza Principal']].map(([id, letra, nombre], i) => ({ id, letra, nombre, lat: String(ll[0] - i * 0.001), lng: String(ll[1]) }));
    const sal = (id, d, hora, punto, extra = {}) => ({ id, fecha: mes + '-' + String(d).padStart(2, '0'), hora, punto, grupo: '', conductor: 'Juan Pérez', notas: '', notasBloques: '', bloques: '', sinTerritorio: '', especial: '', ...extra });
    const Salidas = [];
    for (let d = 1; d <= 28; d++) Salidas.push(sal('s' + d, d, d % 2 ? '08:30' : '17:00', 'A'));
    Salidas.push(sal('g1', 8, '17:00', 'D', { grupo: 'Grupo 1', bloques: Bloques[0].id }), sal('pp', 9, '19:00', 'P', { sinTerritorio: 'si', notas: 'Predicación Pública' }), sal('esp', 10, '06:30', 'A', { especial: 'si' }));
    // a salida tomorrow with a group, for Hoy
    const t = new Date(); t.setDate(t.getDate() + 1);
    Salidas.push({ ...sal('tom', 1, '17:00', 'D', { grupo: 'Grupo 2' }), fecha: ymd(t) });
    localStorage.clear();
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos, Salidas, Informes: [], Config: [], Conductores: [], NoVisitar: [], Fotos: [] }));
    localStorage.setItem('predi-pin-demo', '1234');
  }, mes);
  await page.reload(); await page.waitForTimeout(1300);
  // ---- Hoy: the group in the upcoming list
  await page.click('#nav [data-tab=hoy]'); await page.waitForTimeout(200);
  assert(await page.evaluate(() => panel.textContent.includes('Grupo 2')), 'group on Hoy');
  // ---- Programa list: edit in place, the list keeps its place
  await page.click('#nav [data-tab=calendario]'); await page.click('[data-act=pgmes][data-v="1"]');
  await page.evaluate(() => { panel.scrollTop = 1200; }); await page.waitForTimeout(100);
  const target = await page.evaluate(() => { const r = [...panel.querySelectorAll('.list-item[data-act=pgedit]')].find(x => x.getBoundingClientRect().top > 300); return r.dataset.id; });
  const y0 = await page.evaluate(() => panel.scrollTop);
  await page.click('.list-item[data-act=pgedit][data-id="' + target + '"]'); await page.waitForTimeout(200);
  const st = await page.evaluate(() => { const f = panel.querySelector('.pg-form'), r = f.getBoundingClientRect(), p = panel.getBoundingClientRect(); return { y: panel.scrollTop, visible: r.top >= p.top - 1 && r.top < p.bottom, atTop: !!panel.querySelector('.actions + .pg-form') }; });
  console.log('edit in place: scroll', y0, '→', st.y, st); assert(st.visible && !st.atTop && Math.abs(st.y - y0) < 400, 'form in place, list keeps its place');
  await elegirConductor(page, 'Pedro Gómez'); await page.click('.pg-form [data-act=pgguardar]'); await page.waitForTimeout(300);
  const y2 = await page.evaluate(() => panel.scrollTop); console.log('after saving:', y2); assert(Math.abs(y2 - st.y) < 150, 'stays there after saving');
  assert.equal(await page.evaluate(id => DB.Salidas.find(s => s.id === id).conductor, target), 'Pedro Gómez');
  // "+ salida" on a day opens under that day
  await page.click('.pg-mas >> nth=3'); await page.waitForTimeout(200);
  const under = await page.evaluate(() => { const f = panel.querySelector('.pg-form'); let p = f.previousElementSibling; while (p && !p.classList.contains('pg-dia')) p = p.previousElementSibling; return { dia: p && p.textContent, fecha: prog.edit.fecha }; });
  console.log('+ salida:', under); assert(under.dia.startsWith(['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date(under.fecha + 'T12:00').getDay()]));
  await page.click('.pg-form [data-act=pgcancelar]');
  // ---- calendar
  await page.click('[data-act=pgvista][data-v=calendario]'); await page.waitForTimeout(200);
  const cal = await page.evaluate(() => ({ dias: document.querySelectorAll('.cal-d:not(.vacio)').length, vacios: document.querySelectorAll('.cal-d.vacio').length, ok: document.querySelectorAll('.cal-g .cal-s.ok').length, st: document.querySelectorAll('.cal-g .cal-s.st').length, esp: document.querySelectorAll('.cal-g .cal-s.esp').length, pend: document.querySelectorAll('.cal-g .cal-s.pend').length }));
  const expect = await page.evaluate(() => { const [y, m] = prog.mes.split('-').map(Number); return { dias: new Date(y, m, 0).getDate(), vacios: (new Date(y, m - 1, 1).getDay() + 6) % 7 }; });
  console.log('calendar:', cal, expect); assert.equal(cal.dias, expect.dias); assert.equal(cal.vacios, expect.vacios); assert.equal(cal.ok, 1); assert.equal(cal.st, 1); assert.equal(cal.esp, 1); assert.equal(cal.pend, 1);
  await page.screenshot({ path: 'out/calendario.png' });
  // tap a time → its form under the day, below the grid
  await page.click('.cal-s[data-id=g1]'); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => prog.edit && prog.edit.id), 'g1');
  assert(await page.evaluate(() => !!document.querySelector('.cal ~ .pg-form, .cal ~ * .pg-form') || !!panel.querySelector('.pg-form')));
  await page.screenshot({ path: 'out/calendario-edit.png' });
  await page.click('.pg-form [data-act=pgcancelar]');
  await page.click('.cal-d[data-v="' + mes + '-09"]'); await page.waitForTimeout(200);
  assert(await page.evaluate(() => panel.textContent.includes('Plaza Principal - Predicación Pública')), 'tapping a day shows its salidas');
  // ---- Registro sorting
  await page.click('#nav [data-tab=territorio]');
  const order = async v => { await page.click('[data-act=rgorden][data-v=' + v + ']'); await page.waitForTimeout(150); return page.evaluate(() => [...panel.querySelectorAll('.terr-row .grow > b')].map(b => b.textContent)); };
  const num = await order('numero'); console.log('Número:', num); assert.deepEqual(num, ['T1', 'T2']);
  assert.equal(await page.evaluate(() => store.get('predi-rg-orden')), 'numero');
  await order('reciente'); await order('atraso');
  // ---- Planificar and Informe show the group
  await page.click('#nav [data-tab=planificar]');
  assert(await page.evaluate(() => panel.textContent.includes('Grupo 2')), 'group in Planificar');
  console.log('errors:', errors); console.log('Calendar tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
