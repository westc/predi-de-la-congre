// Help: the guided tour (first time per role, replay from Más) and the ? tips for each screen.
const assert = require('assert');
const { chromium, seed, PHONE, PC } = require('./seed');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const nueva = async ctx => { const c = await browser.newContext(ctx); await c.addInitScript(() => { window.TOUR_EN_PRUEBAS = true; }); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message)); return p; };
  const tourSt = page => page.evaluate(() => tour && { i: tour.i, n: tour.pasos.length, tab, texto: $('#tour .tour-tip').textContent, hole: (() => { const r = $('#tour .tour-hole').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })() });
  const sig = async page => { await page.click('#tour [data-tour="1"]'); await page.waitForTimeout(500); };

  for (const [nombre, ctx] of [['movil', PHONE], ['pc', PC]]) {
    const page = await nueva(ctx);
    await seed(page); await page.waitForTimeout(800);
    let t = await tourSt(page); console.log(nombre, 'first open:', t && t.texto.slice(0, 60), t && t.n);
    assert(t && t.i === 0, 'the tour opens by itself the first time');
    await page.screenshot({ path: 'out/ayuda-' + nombre + '-0.png' });
    await sig(page); t = await tourSt(page);
    assert.equal(t.tab, 'hoy'); assert(t.hole[2] > 20, 'spotlight on the Inicio button');
    await sig(page); t = await tourSt(page); assert.equal(t.tab, 'calendario', 'the section opens behind');
    await page.screenshot({ path: 'out/ayuda-' + nombre + '-2.png' });
    while (!(await page.evaluate(() => tour.i === tour.pasos.length - 1))) await sig(page);
    await page.screenshot({ path: 'out/ayuda-' + nombre + '-fin.png' });
    await sig(page);
    assert.equal(await page.evaluate(() => tour), null); assert(await page.evaluate(() => $('#tour').hidden));
    assert.equal(await page.evaluate(() => tab), 'hoy', 'back where it started');
    await page.reload(); await page.waitForTimeout(1600);
    assert.equal(await page.evaluate(() => tour), null, 'not again after it was seen');
    // ? on a few screens
    const ayuda = async () => { await page.click('#help'); await page.waitForTimeout(200); const r = await page.evaluate(() => ({ t: $('#share .row-t span').textContent, n: $$n() })); await page.click('#share [data-act=shareclose]'); return r; };
    await page.evaluate(() => { window.$$n = () => document.querySelectorAll('#share ul.ayuda li').length; });
    let a = await ayuda(); console.log('? Inicio:', a); assert.equal(a.t, 'Inicio'); assert(a.n >= 3);
    await page.click('.sal-card [data-act=ver]'); a = await ayuda(); assert.equal(a.t, 'Salida');
    await page.click('#back');
    await page.click('#nav [data-tab=lugares]'); a = await ayuda(); assert.equal(a.t, 'Lugares');
    // Saltar, and replay from Más
    await page.click('#nav [data-tab=mas]'); await page.click('[data-act=guia]'); await page.waitForTimeout(400);
    t = await tourSt(page); assert(t && t.i === 0);
    await page.click('#tour [data-tour=fin]'); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => tour), null); assert.equal(await page.evaluate(() => tab), 'mas');
    // the superintendente gets their own tour after entering the PIN
    await page.click('[data-act=login]'); await page.fill('#pin', '1234'); await page.click('[data-act=pin]'); await page.waitForTimeout(1200);
    t = await tourSt(page); console.log(nombre, 'admin tour:', t && t.texto.slice(0, 80), t && t.n);
    assert(t && t.texto.includes('superintendente'));
    await sig(page); await sig(page); await sig(page); t = await tourSt(page);
    await page.screenshot({ path: 'out/ayuda-' + nombre + '-admin.png' });
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => tour), null, 'Esc closes it');
    await page.click('#nav [data-tab=planificar]'); await page.click('[data-act=plannueva]');
    await page.click('#help'); await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => $('#share .row-t span').textContent), 'Elegir manzanas');
    await page.screenshot({ path: 'out/ayuda-' + nombre + '-tips.png' });
  }
  console.log('errors:', errors); assert.deepEqual(errors, []);
  console.log('Ayuda tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
