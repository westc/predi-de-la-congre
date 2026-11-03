const { chromium, devices } = require('playwright-core');
const assert = require('assert');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/?demo'); await page.waitForFunction(() => window.MANZANAS);
  await page.evaluate(() => {
    const Bloques = MANZANAS.slice(0, 4).map((c, i) => ({ id: c.id, territorio: '1', bloque: String(i + 1), coords: JSON.stringify(c.coords), notas: '' }));
    const ll = JSON.parse(Bloques[0].coords)[0];
    const Puntos = [{ id: 'pA', letra: 'A', nombre: 'Flia. Mendoza', lat: String(ll[0]), lng: String(ll[1]) },
                    { id: 'pB', letra: 'B', nombre: 'Plaza Principal', lat: String(ll[0] - 0.002), lng: String(ll[1] + 0.002) },
                    { id: 'pC', letra: 'C', nombre: 'Salón del Reino', lat: String(ll[0] - 0.003), lng: String(ll[1]) }];
    const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
    const sal = (id, f, hora, punto, extra = {}) => ({ id, fecha: f, hora, punto, grupo: '', conductor: 'Juan Pérez', notas: '', notasBloques: '', bloques: '', sinTerritorio: '', especial: '', ...extra });
    const Salidas = [sal('a1', day(3), '17:00', 'A', { grupo: 'Grupo 1' }), sal('a2', day(5), '08:30', 'A'), sal('a3', day(10), '08:30', 'A'), sal('a4', day(12), '08:30', 'A'),
                     sal('c1', day(1), '06:30', 'C'), sal('old', day(-2), '08:30', 'B')];
    localStorage.clear();
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos, Salidas, Informes: [], Config: [{ id: 'puntos_archivados', valor: '["pC"]' }], Conductores: [], NoVisitar: [], Fotos: [] }));
  });
  await page.reload(); await page.waitForTimeout(1300);
  assert.equal(await page.evaluate(() => WHO.role), 'publicador');
  await page.click('#nav [data-tab=lugares]'); await page.waitForTimeout(200);
  const cards = await page.evaluate(() => [...panel.querySelectorAll('.card')].map(c => c.textContent.replace(/\s+/g, ' ').trim()));
  console.log('lugares:'); cards.forEach(c => console.log('  ', c.slice(0, 140)));
  assert.equal(cards.length, 3, 'archived point shown while a salida still uses it');
  assert(cards[0].includes('Salón del Reino') && cards[1].includes('Flia. Mendoza') && cards[2].includes('Plaza Principal'), 'soonest next salida first');
  assert(cards[1].includes('Grupo 1') && cards[1].includes('Después:'), 'next salida with its group, and the following ones');
  assert(cards[2].includes('Sin salidas programadas'), 'past salidas are not "next"');
  await page.screenshot({ path: 'out/lugares.png' });
  // Compartir: location + next salidas, with WhatsApp and a QR
  await page.click('[data-act=lugcompartir][data-id=pA]');
  await page.waitForTimeout(800);
  const share = await page.evaluate(() => ({ link: document.querySelector('#share-link').value, wa: decodeURIComponent(document.querySelector('#share a[href*="wa.me"]').href.split('text=')[1]), qr: !!document.querySelector('#share img.qr') }));
  console.log('share text:\n' + share.wa);
  assert(share.link.startsWith('https://www.google.com/maps/search/?api=1&query=')); assert(share.wa.includes('Próximas salidas:') && share.wa.includes('Grupo 1'));
  await page.click('#share [data-act=shareclose]');
  // tapping the next salida opens it
  await page.click('[data-act=ver][data-id=a1]'); await page.waitForTimeout(300);
  assert(await page.evaluate(() => verSalida === 'a1' && tab === 'lugares'));
  await page.click('#back');
  // the point on the map shows the same
  await page.evaluate(() => { const m = gPuntos.getLayers().find(l => l.getTooltip().getContent() === 'Flia. Mendoza'); m.fire('click'); });
  await page.waitForTimeout(300);
  const pop = await page.evaluate(() => document.querySelector('.leaflet-popup-content').textContent);
  console.log('map popup:', pop.replace(/\s+/g, ' ').slice(0, 120)); assert(pop.includes('Próxima') && pop.includes('Cómo llegar'));
  console.log('errors:', errors); console.log('Lugares tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
