// Calendario → 🖨 for everyone: the program for this week, next week, the month or chosen dates; print or picture.
const assert = require('assert');
const { chromium, PHONE } = require('./seed');
const PORT = process.env.PORT || 8765;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const page = await (await browser.newContext(PHONE)).newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/?demo'); await page.waitForFunction(() => window.MANZANAS);
  const hoy = await page.evaluate(() => ymd(new Date()));
  await page.evaluate(() => {
    const f = n => sumarDias(ymd(new Date()), n);
    const S = (id, n, hora, extra) => ({ id, fecha: f(n), hora, punto: '', grupo: '', conductor: 'Juan Pérez', notas: 'Casa ' + id, notasBloques: '', bloques: '', sinTerritorio: '', especial: '', ...extra });
    // one a day for 40 days, one of them especial
    const Salidas = Array.from({ length: 40 }, (_, i) => S('s' + i, i - 5, '08:30', i === 10 ? { especial: 'si' } : {}));
    localStorage.clear();
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques: [], Territorios: [], Puntos: [], Salidas, Informes: [], Config: [], Conductores: [], NoVisitar: [], Fotos: [] }));
  });
  await page.reload(); await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => WHO.role), 'publicador');
  await page.click('#nav [data-tab=calendario]'); await page.click('[data-act=pgimp]'); await page.waitForTimeout(200);
  const info = () => page.evaluate(() => document.querySelector('#share .box p').textContent);
  // the month being viewed
  let t = await info(); console.log('mes:', t);
  const diasMes = await page.evaluate(() => { const [y, m] = prog.mes.split('-').map(Number); return new Date(y, m, 0).getDate(); });
  assert(/^[a-z]+ de \d{4} · \d+ salidas$/.test(t), t);
  // this week and next: Monday to Sunday, 7 salidas each
  await page.click('[data-act=pgimprango][data-v=semana]'); t = await info(); console.log('semana:', t); assert(t.startsWith('del ') && t.endsWith('· 7 salidas'));
  await page.click('[data-act=pgimprango][data-v=proxima]'); t = await info(); console.log('próxima:', t); assert(t.endsWith('· 7 salidas'));
  // chosen dates, across months
  await page.click('[data-act=pgimprango][data-v=fechas]');
  const [d1, d2] = await page.evaluate(() => { const [y, m] = ymd(new Date()).split('-').map(Number); return [ymd(new Date(y, m - 1, 28)), ymd(new Date(y, m, 3))]; });
  await page.fill('[data-pi=desde]', d1); await page.dispatchEvent('[data-pi=desde]', 'change');
  await page.fill('[data-pi=hasta]', d2); await page.dispatchEvent('[data-pi=hasta]', 'change'); await page.waitForTimeout(200);
  t = await info(); console.log('fechas:', t); assert(/^del 28 de [a-z]+ al 3 de [a-z]+ de \d{4} · \d+ salidas$/.test(t), t);
  await page.screenshot({ path: 'out/programa-elegir.png' });
  await page.click('[data-act=pgimprimir]'); await page.waitForTimeout(300);
  const pr = await page.evaluate(() => ({ h1: document.querySelector('#s13 .pg-page h1').textContent, filas: [...document.querySelectorAll('#s13 .pg-t tbody tr td:first-child')].map(td => td.textContent) }));
  console.log('printed:', pr.h1, pr.filas.slice(0, 3), '…');
  assert(pr.h1.startsWith('DEL 28 DE ')); assert(/^\*?\*?28\/\d+$/.test(pr.filas[0]), 'day/month across months');
  await page.click('[data-act=s13close]');
  // the picture of next week
  await page.click('[data-act=pgimp]'); await page.click('[data-act=pgimprango][data-v=proxima]'); await page.click('[data-act=pgimagen]'); await page.waitForTimeout(900);
  const img = await page.evaluate(() => ({ w: document.querySelector('#share img').naturalWidth, lineas: document.querySelector('#share textarea').value.split('\n').length, t: document.querySelector('#share .row-t span').textContent }));
  console.log('image:', img); assert.equal(img.w, 1100); assert(img.t.startsWith('Programa · del '));
  const msg = await page.inputValue('#share textarea'); console.log('message:', msg);
  assert(/^Hola, aquí está el programa de predicación del \d+ (de [a-z]+ )?al \d+ de [a-z]+ de \d{4}\.$/.test(msg), msg);
  await page.fill('#share textarea', 'Programa de la semana'); assert.equal(await page.evaluate(() => shareData.text), 'Programa de la semana', 'it can be changed');
  await page.click('#share [data-act=shareclose]');
  // a range without salidas can't be printed
  await page.click('[data-act=pgimp]'); await page.click('[data-act=pgimprango][data-v=fechas]');
  await page.fill('[data-pi=desde]', '2020-01-01'); await page.dispatchEvent('[data-pi=desde]', 'change');
  await page.fill('[data-pi=hasta]', '2020-01-05'); await page.dispatchEvent('[data-pi=hasta]', 'change'); await page.waitForTimeout(200);
  assert(await page.isDisabled('[data-act=pgimprimir]')); assert((await info()).includes('no hay salidas'));
  // the month's heading stays as on paper
  assert.equal(await page.evaluate(() => tituloPrograma('2026-11-01', '2026-11-30')), 'NOVIEMBRE 2026');
  assert.equal(await page.evaluate(() => rangoNombre('2026-12-29', '2027-01-04')), 'del 29 de diciembre de 2026 al 4 de enero de 2027');
  console.log('errors:', errors); assert.deepEqual(errors, []);
  console.log('Programa para imprimir tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
