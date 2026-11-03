const { chromium, devices } = require('playwright-core');
const assert = require('assert');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/?demo'); await page.waitForFunction(() => window.MANZANAS);
  await page.evaluate(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    const Bloques = MANZANAS.slice(0, 6).map((c, i) => ({ id: c.id, territorio: String(i < 3 ? 1 : 2), bloque: String(i % 3 + 1), coords: JSON.stringify(c.coords), notas: '' }));
    const Salidas = [{ id: 's1', fecha: ymd(new Date()), hora: '09:00', bloques: Bloques.slice(0, 3).map(b => b.id).join(','), punto: 'A', conductor: 'Hno. Mario Soto', notas: 'Llevar invitaciones para la conmemoración', notasBloques: '' }];
    const Puntos = [{ id: 'pA', letra: 'A', nombre: 'Salón del Reino de la congregación', lat: '-17.7944', lng: '-63.1340' }];
    localStorage.clear();
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos, Salidas, Informes: [], Config: [], Conductores: [], NoVisitar: [], Fotos: [] }));
    localStorage.setItem('predi-pin-demo', '1234'); localStorage.setItem('predi-who-demo', JSON.stringify({ role: 'admin', nombre: '' }));
  });
  await page.reload(); await page.waitForTimeout(1300); await page.click('#nav [data-tab=mas]');
  const size = () => page.evaluate(() => getComputedStyle(document.body).fontSize);
  console.log('default:', await size(), await page.textContent('.letra b')); assert.equal(await size(), '16.95px');
  await page.click('[data-act=letra][data-v="1"]'); console.log('A+:', await size());
  await page.click('[data-act=letra][data-v="1"]'); console.log('A+ A+:', await size(), await page.textContent('.letra b'));
  assert(await page.isDisabled('[data-act=letra][data-v="1"]'), 'A+ disabled at the largest');
  await page.reload(); await page.waitForTimeout(1300); await page.click('#nav [data-tab=mas]');
  assert.equal(await size(), '22.5px', 'remembered after reopening');
  const overflow = async name => { const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); console.log(name, 'sideways overflow px:', o); assert(o <= 0); };
  await overflow('Hoy');
  await page.evaluate(() => { panel.scrollTop = 0; }); await page.screenshot({ path: 'out/letra-grande.png' });
  for (const t of ['hoy', 'calendario', 'planificar', 'territorio']) { await page.click('#nav [data-tab=' + t + ']'); await page.waitForTimeout(200); await overflow(t); }
  await page.click('#nav [data-tab=mas]');
  for (let i = 0; i < 3; i++) await page.click('[data-act=letra][data-v="-1"]');
  console.log('smallest:', await size(), await page.textContent('.letra b')); assert.equal(await size(), '15px');
  assert(await page.isDisabled('[data-act=letra][data-v="-1"]'));
  // every tab tappable at every size (nothing on top of it), on the phone
  for (let i = 0; i < 4; i++) {
    const blocked = await page.evaluate(() => [...document.querySelectorAll('#nav [data-tab], #refresh')].filter(b => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !b.contains(e); }).map(b => b.textContent));
    console.log(await page.textContent('.letra b'), '→ tabs blocked:', blocked, 'header height:', await page.evaluate(() => Math.round(document.querySelector('header').getBoundingClientRect().height)));
    assert.deepEqual(blocked, []);
    if (i < 3) await page.click('[data-act=letra][data-v="1"]');
  }
  await page.screenshot({ path: 'out/letra-tabs.png' });
  console.log('errors:', errors); console.log('Letra tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
