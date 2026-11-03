// Lugares: a meeting point's location from a Google Maps link (long or short) or coordinates.
const assert = require('assert');
const { chromium, seed, login, PHONE } = require('./seed');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const page = await (await browser.newContext(PHONE)).newPage(); page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await seed(page);
  // the reader
  const casos = await page.evaluate(() => [
    '-17.791546, -63.137177',
    '(-17.791546,-63.137177)',
    '17°47\'29.6"S 63°08\'13.8"W',
    'https://www.google.com/maps/place/Sal%C3%B3n+del+Reino/@-17.7900,-63.1300,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-17.7915462!4d-63.1371772',
    'https://maps.google.com/?q=-17.791546,-63.137177',
    'https://www.google.com/maps/search/?api=1&query=-17.791546%2C-63.137177',
    'https://www.google.com/maps/@-17.791546,-63.137177,18z',
    'hola', 'https://maps.app.goo.gl/AbCdEf',
  ].map(t => leerUbicacion(t)));
  console.log(casos);
  casos.slice(0, 7).forEach((u, i) => { assert(u, 'case ' + i); assert(Math.abs(u.lat + 17.7915) < 0.001 && Math.abs(u.lng + 63.1372) < 0.001, 'case ' + i + ' ' + JSON.stringify(u)); });
  assert.equal(casos[3].nombre, 'Salón del Reino', 'the place name from the link');
  assert.equal(casos[7], null); assert.equal(casos[8], null, 'short links need the Sheet');
  // new point from coordinates
  await login(page, '1234');
  await page.click('#nav [data-tab=mas]'); await page.click('[data-act=ir][data-v=lugares]'); await page.click('[data-act=ptadd]'); await page.waitForTimeout(200);
  await page.fill('#pt-ubic', '-17.7935, -63.1335'); await page.click('[data-act=ptubic]'); await page.waitForTimeout(400);
  assert(await page.$('#pt-letra'), 'the form opens');
  assert.deepEqual(await page.evaluate(() => [editSel.lat, editSel.lng]), ['-17.793500', '-63.133500']);
  assert(await page.evaluate(() => map.getBounds().contains([-17.7935, -63.1335])), 'the map goes there');
  await page.fill('#pt-letra', 'S'); await page.fill('#pt-nombre', 'Casa Sur');
  await page.click('[data-act=ptsave]'); await page.waitForTimeout(300); await page.click('#pending [data-act=commit]'); await page.waitForTimeout(800);
  assert(await page.evaluate(() => DB.Puntos.some(p => p.letra === 'S' && p.lat === '-17.793500')));
  // a short link (the demo follows it to the plaza): fills in the name too
  await page.click('[data-act=ptadd]'); await page.fill('#pt-ubic', 'https://maps.app.goo.gl/AbCdEf'); await page.click('[data-act=ptubic]'); await page.waitForTimeout(900);
  assert.equal(await page.inputValue('#pt-nombre'), 'Plaza Primero de Mayo');
  assert.deepEqual(await page.evaluate(() => [+editSel.lat, +editSel.lng]), await page.evaluate(() => PLAZA.map(x => +x.toFixed(6))));
  await page.screenshot({ path: 'out/punto-enlace.png' });
  await page.click('[data-act=ptcancel]');
  // moving a saved point with a link: kept until Listo, shown with a red ?
  await page.click('[data-act=ptedit][data-id=pB]'); await page.fill('#pt-ubic', '17°47\'40"S 63°08\'00"W'); await page.click('[data-act=ptubic]'); await page.waitForTimeout(400);
  assert(await page.evaluate(() => panel.textContent.includes('Nueva ubicación')));
  assert.equal(await page.inputValue('#pt-nombre'), 'Plaza Principal', 'its name stays');
  assert(await page.evaluate(() => gTemp.getLayers().length === 1));
  await page.click('[data-act=ptsave]'); await page.waitForTimeout(300);
  const b = await page.evaluate(() => DB.Puntos.find(p => p.id === 'pB')); console.log('moved B:', b.lat, b.lng);
  assert(Math.abs(b.lat - -17.794444) < 0.00001 && Math.abs(b.lng - -63.133333) < 0.00001);
  // far away: asks first (accepted here); nonsense: says so
  await page.click('[data-act=ptadd]'); await page.fill('#pt-ubic', 'cualquier cosa'); await page.click('[data-act=ptubic]'); await page.waitForTimeout(300);
  assert(await page.evaluate(() => $('#toast').textContent.includes('No encontré la ubicación')));
  console.log('errors:', errors); assert.deepEqual(errors, []);
  console.log('Punto desde enlace tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
