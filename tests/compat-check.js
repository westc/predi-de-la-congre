const { chromium } = require('playwright-core');
const assert = require('assert');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/?demo'); await page.waitForFunction(() => window.MANZANAS);
  await page.evaluate(() => {
    const Bloques = MANZANAS.slice(0, 3).map((c, i) => ({ id: c.id, territorio: '1', bloque: String(i + 1), coords: JSON.stringify(c.coords), notas: '' }));
    localStorage.clear();
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos: [], Salidas: [], Informes: [], Config: [], Conductores: [], NoVisitar: [], Fotos: [] }));
    localStorage.setItem('predi-pin-demo', '1234');
  });
  await page.reload(); await page.waitForTimeout(1300);
  // behave like the old Apps Script: no "cambios", no version, changes answer with everything
  await page.evaluate(() => {
    const real = api;
    window.calls = [];
    api = async (fn, ...args) => {
      calls.push(fn);
      if (fn === 'cambios') throw new Error('Función desconocida: cambios');
      const d = await real(fn, ...args);
      if (d && d._delta) { const full = await real('getAll'); delete full._v; return full; }
      if (fn === 'getAll' && d) delete d._v;
      return d;
    };
  });
  await page.click('#refresh'); await page.waitForTimeout(1500);
  console.log('↻ with the old script:', await page.evaluate(() => calls.splice(0)), 'version:', await page.evaluate(() => SERVER._v));
  await page.evaluate(() => saveRows('Salidas', [{ id: 's1', fecha: ymd(new Date()), hora: '09:00', punto: '', conductor: 'X', bloques: BL[0].id }]));
  await page.waitForTimeout(800);
  assert(await page.evaluate(() => DB.Salidas.some(s => s.id === 's1')), 'a save works with the old script');
  await page.click('#refresh'); await page.waitForTimeout(1200);
  assert(await page.evaluate(() => DB.Salidas.some(s => s.id === 's1')));
  console.log('errors:', errors); console.log('Compat tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
