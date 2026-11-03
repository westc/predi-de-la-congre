// Informe on the map: tap a manzana → blue outline, its row lit, a bubble to mark it; colors as they're marked.
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
    const S = (id, hora, bloques) => ({ id, fecha: hoy, hora, punto: '', grupo: '', conductor: 'Juan Pérez', notas: '', notasBloques: '', bloques, sinTerritorio: '', especial: '' });
    const Salidas = [S('s1', '08:30', [0, 1, 2].map(b).join(',')), S('s2', '17:00', b(4))];
    const Informes = [{ id: 'i1', fecha: hoy, salida: 's2', bloque: b(4), estado: 'completo', porcentaje: '', nota: '', quien: 'Juan Pérez', creado: new Date().toISOString() }];
    const Conductores = [{ id: 'c1', nombre: 'Juan Pérez', clave: 'clave-de-prueba-123456', activo: 'si', creado: '' }];
    localStorage.clear();
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos: [], Salidas, Informes, Config: [], Conductores, NoVisitar: [], Fotos: [] }));
  });
  await page.goto('http://127.0.0.1:' + PORT + '/?demo&c=clave-de-prueba-123456'); await page.waitForTimeout(1300);
  await page.click('#nav [data-tab=informe]'); await page.waitForTimeout(400);
  const ids = await page.evaluate(() => BL.map(b => b.id));
  const tapBlock = i => page.evaluate(i => { const b = BL[i]; gBloques.getLayers().find(l => l._bid === b.id).fire('click', { latlng: L.latLng(centroid(b.coords)) }); }, i);
  const poly = i => page.evaluate(id => { const o = gBloques.getLayers().find(l => l._bid === id).options; return { color: o.color, weight: o.weight, fill: o.fillColor }; }, ids[i]);
  const pop = () => page.evaluate(() => { const p = document.querySelector('.inf-pop'); return p ? p.textContent : null; });
  const lit = () => page.evaluate(() => [...panel.querySelectorAll('.row.elegida')].map(r => r.dataset.row));

  assert.equal((await poly(0)).color, '#c0392b', 'not marked yet: red border');
  await tapBlock(0); await page.waitForTimeout(400);
  console.log('tap 1:', await pop()); assert((await pop()).includes('Manzana 1'));
  assert.deepEqual(await lit(), [ids[0]], 'its row lights up'); assert.equal((await poly(0)).color, '#1f4fbf');
  await page.screenshot({ path: 'out/informe-mapa-1.png' });
  await page.click('.inf-pop [data-act=est][data-v=completo]'); await page.waitForTimeout(700);
  assert.equal(await pop(), null, 'closes after Completo'); assert.equal((await poly(0)).fill, '#2ecc71', 'green');
  assert(await page.evaluate(id => panel.querySelector('[data-row="' + id + '"] .row-t').textContent.startsWith('✓'), ids[0]));
  // Parcial: the bubble stays for the %
  await tapBlock(1); await page.waitForTimeout(300);
  await page.click('.inf-pop [data-act=est][data-v=parcial]'); await page.waitForTimeout(500);
  assert((await pop()).includes('~50%'), 'stays open with the %');
  await page.click('.inf-pop [data-act=pct][data-v="50"]'); await page.waitForTimeout(500);
  assert((await pop()) !== null, 'stays open: Parcial needs its note'); assert.equal((await poly(1)).fill, '#f39c12');
  assert.equal(await page.evaluate(id => infForm[id].porcentaje, ids[1]), '50');
  await page.click('.inf-pop [data-act=poplisto]'); await page.waitForTimeout(300);
  assert((await pop()) !== null, 'Listo without a note: not yet');
  assert(await page.evaluate(() => $('#toast').textContent.includes('qué quedó pendiente')));
  await page.fill('.inf-pop input[data-in=popnota]', 'falta la calle 5');
  await page.screenshot({ path: 'out/informe-mapa-parcial.png' });
  const z0 = await page.evaluate(() => map.getZoom());
  await page.press('.inf-pop input[data-in=popnota]', '-'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => map.getZoom()), z0, 'typing doesn\'t zoom the map');
  await page.fill('.inf-pop input[data-in=popnota]', 'falta la calle 5');
  await page.click('.inf-pop [data-act=poplisto]'); await page.waitForTimeout(400);
  assert.equal(await pop(), null);
  assert.equal(await page.inputValue('[data-in=nota][data-id="' + ids[1] + '"]'), 'falta la calle 5', 'the note is in the list too');
  // a manzana not in the salida: added and marked from the map
  await tapBlock(3); await page.waitForTimeout(300);
  await page.click('.inf-pop [data-act=est][data-v=no]'); await page.waitForTimeout(700);
  assert.equal(await page.evaluate(id => infForm[id].estado, ids[3]), 'no');
  // the name in the list picks it on the map
  await page.click('[data-act=infsel][data-id="' + ids[2] + '"]'); await page.waitForTimeout(400);
  assert((await pop()).includes('Manzana 3')); assert.equal((await poly(2)).weight, 6);
  await page.screenshot({ path: 'out/informe-mapa-2.png' });
  // a manzana of a salida already reported opens "Ya informadas"
  await tapBlock(4); await page.waitForTimeout(400);
  assert(await page.evaluate(() => panel.querySelector('details').open), 'Ya informadas opens');
  assert.deepEqual(await lit(), [ids[4]]);
  // a Parcial without a note is not sent
  await page.keyboard.press('Escape');
  await page.click('.row[data-row="' + ids[2] + '"] [data-act=est][data-v=parcial]');
  await page.click('[data-act=enviar]'); await page.waitForTimeout(600);
  assert(await page.evaluate(() => $('#toast').textContent.includes('Falta la nota de T1·M3')), 'asks for the note');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('territorios-demo')).Informes.length), 1, 'nothing sent');
  assert(await page.evaluate(id => panel.querySelector('[data-in=nota][data-id="' + id + '"]').classList.contains('falta'), ids[2]));
  await page.click('.row[data-row="' + ids[2] + '"] [data-act=est][data-v=completo]'); await page.waitForTimeout(300);
  // send
  await page.keyboard.press('Escape');
  await page.click('[data-act=enviar]'); await page.waitForTimeout(900);
  const sent = await page.evaluate(() => JSON.parse(localStorage.getItem('territorios-demo')).Informes.map(r => r.estado + (r.porcentaje || '')).sort());
  console.log('sent:', sent); assert.deepEqual(sent, ['completo', 'completo', 'completo', 'no', 'parcial50']);
  console.log('errors:', errors); assert.deepEqual(errors, []);
  console.log('Informe en el mapa tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
