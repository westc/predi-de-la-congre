const { chromium } = require('playwright-core');
const assert = require('assert');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  // record every overlay message shown
  await page.addInitScript(() => {
    window.SEEN = [];
    const rec = () => { if (document.body.classList.contains('busy')) window.SEEN.push(document.getElementById('saving-msg').textContent); };
    document.addEventListener('DOMContentLoaded', () => { rec(); new MutationObserver(rec).observe(document.body, { attributes: true, attributeFilter: ['class'] }); });
  });
  await page.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/?demo'); await page.waitForFunction(() => window.MANZANAS);
  await page.evaluate(() => {
    const Bloques = MANZANAS.slice(0, 3).map((c, i) => ({ id: c.id, territorio: '1', bloque: String(i + 1), coords: JSON.stringify(c.coords), notas: '' }));
    localStorage.clear();
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos: [], Salidas: [], Informes: [], Config: [], Conductores: [], NoVisitar: [], Fotos: [] }));
    localStorage.setItem('predi-pin-demo', '1234'); localStorage.setItem('predi-who-demo', JSON.stringify({ role: 'admin', nombre: '' }));
  });
  await page.reload(); await page.waitForTimeout(1200);   // first load (no saved copy yet)
  await page.reload(); await page.waitForTimeout(1200);   // opening again, with the saved copy
  let seen = await page.evaluate(() => SEEN.splice(0));
  console.log('opening with a saved copy:', seen); assert(seen.includes('Buscando cambios…'));
  assert(!(await page.evaluate(() => document.body.classList.contains('busy'))), 'overlay gone after loading');
  await page.click('#refresh'); await page.waitForTimeout(800);
  seen = await page.evaluate(() => SEEN.splice(0)); console.log('↻:', seen); assert(seen.includes('Buscando cambios…'));
  await page.evaluate(() => { lastLoad = 0; }); await page.click('#nav [data-tab=informe]'); await page.waitForTimeout(800);
  seen = await page.evaluate(() => SEEN.splice(0)); console.log('opening Informe:', seen); assert(seen.includes('Buscando cambios…'));
  // a load that hangs: "Seguir sin esperar" after 4 s, and the data still lands afterwards
  await page.evaluate(() => {
    window._api = api; window._release = null;
    api = fn => fn === 'getAll' ? new Promise(res => { window._release = () => res(_api('getAll')); }) : _api(fn);
    refresh(true);
  });
  await page.waitForTimeout(1500); assert(await page.isHidden('#saving-skip'), 'no skip button at first');
  await page.waitForTimeout(3000); assert(await page.isVisible('#saving-skip'), 'skip button after 4 s');
  await page.screenshot({ path: 'out/overlay-skip.png' });
  await page.click('#saving-skip');
  assert(!(await page.evaluate(() => document.body.classList.contains('busy'))), 'overlay hidden after skipping');
  await page.click('#nav [data-tab=planificar]'); // the app is usable again
  await page.evaluate(() => { _release(); }); await page.waitForTimeout(800);
  assert(await page.evaluate(() => $('#toast').textContent.includes('Datos actualizados')), 'data arrived after skipping');
  // two at once: the first to finish doesn't hide the overlay for the other
  const both = await page.evaluate(async () => {
    api = window._api;
    const slow = busy(new Promise(r => setTimeout(r, 900)), 'Lento');
    const fast = busy(new Promise(r => setTimeout(r, 200)), 'Rápido');
    await fast; const midway = document.body.classList.contains('busy');
    await slow; return { midway, after: document.body.classList.contains('busy') };
  });
  console.log('overlapping:', both); assert(both.midway && !both.after);
  console.log('errors:', errors); console.log('Overlay tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
