// Lugares → Mapa para imprimir: a picture of the territories with the meeting points' letters and a legend; print / PDF.
const assert = require('assert'), fs = require('fs');
const { chromium, seed, PHONE, PC } = require('./seed');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const page = await (await browser.newContext(PC)).newPage(); page.on('pageerror', e => errors.push(e.message));
  await seed(page);
  await page.click('#nav [data-tab=lugares]'); await page.click('[data-act=mapaimp]'); await page.waitForTimeout(2500);
  const img = async () => page.evaluate(async () => {
    const i = document.querySelector('#share img'); await i.decode();
    const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0);
    return { w: i.naturalWidth, h: i.naturalHeight, png: c.toDataURL() };
  });
  let r = await img(); console.log('calles:', r.w, 'x', r.h);
  assert.equal(r.w, 1800); assert(r.h > 900);
  fs.writeFileSync('out/mapa-imprimir.png', Buffer.from(r.png.split(',')[1], 'base64'));
  await page.screenshot({ path: 'out/mapa-imprimir-pantalla.png' });
  const t0 = Date.now();
  await page.click('[data-act=mapaimpop][data-k=fondo][data-v=satelite]');
  await page.waitForSelector('[data-act=mapaimpop][data-v=satelite].on', { timeout: 30000 }); console.log('satélite in', Date.now() - t0, 'ms');
  r = await img(); fs.writeFileSync('out/mapa-imprimir-satelite.png', Buffer.from(r.png.split(',')[1], 'base64'));
  await page.click('[data-act=mapaimpprint]'); await page.waitForTimeout(500);
  assert(await page.evaluate(() => document.body.classList.contains('s13') && !!document.querySelector('#s13 .mapa-page img')));
  await page.emulateMedia({ media: 'print' }); await page.pdf({ path: 'out/mapa-imprimir.pdf', format: 'Letter' }); await page.emulateMedia({ media: 'screen' });
  await page.click('[data-act=s13close]');
  // the salida picture still draws (it shares the tile drawing)
  await page.click('#nav [data-tab=hoy]'); await page.click('.sal-card [data-act=ver]'); await page.click('[data-act=share]'); await page.waitForTimeout(2500);
  const s = await page.evaluate(() => document.querySelector('#share img').naturalWidth); assert.equal(s, 1080);
  // on a phone too
  const ph = await (await browser.newContext(PHONE)).newPage(); ph.on('pageerror', e => errors.push(e.message));
  await seed(ph); await ph.click('#nav [data-tab=lugares]'); await ph.click('[data-act=mapaimp]'); await ph.waitForTimeout(2500);
  await ph.screenshot({ path: 'out/mapa-imprimir-movil.png' });
  console.log('errors:', errors); assert.deepEqual(errors, []);
  console.log('Mapa para imprimir tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
