// The app is "Territorios"; the congregation's name is set in Más (Config "congregacion") and goes on the program,
// the printed map and the shared texts. Without it, they leave it out.
const assert = require('assert');
const { chromium, seed, login, PC } = require('./seed');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const page = await (await browser.newContext(PC)).newPage(); page.on('pageerror', e => errors.push(e.message));
  await seed(page);
  assert.equal(await page.title(), 'Territorios'); assert.equal(await page.textContent('#title'), 'Territorios');
  assert.equal(await page.getAttribute('meta[property="og:title"]', 'content'), 'Territorios');
  assert.equal(await page.getAttribute('meta[property="og:image"]', 'content'), 'https://westc.github.io/predi-de-la-congre/icons/og-image.jpg');
  const programa = async () => { await page.click('#nav [data-tab=calendario]'); await page.click('[data-act=pgimp]'); await page.click('[data-act=pgimprimir]'); await page.waitForTimeout(200);
    const t = await page.textContent('#s13 .pg-sup'); await page.click('[data-act=s13close]'); return t; };
  // not set yet: left out, and the admin is told where to set it
  assert.equal(await programa(), 'PROGRAMA PARA LA PREDICACIÓN');
  await login(page, '1234');
  await page.click('#nav [data-tab=mas]');
  assert(await page.evaluate(() => panel.textContent.includes('Ponlo para que salga en el programa')));
  await page.fill('#cong', 'Villa Prueba'); await page.click('[data-act=congsave]'); await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => CONFIG.congregacion), 'Villa Prueba');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('territorios-demo')).Config.find(c => c.id === 'congregacion').valor), 'Villa Prueba', 'saved in the Sheet');
  assert.equal(await programa(), 'PROGRAMA PARA LA PREDICACIÓN - CONGRE. "VILLA PRUEBA"');
  // shared texts and the printed map's title
  await page.click('#nav [data-tab=mas]'); await page.click('[data-act=appshare]'); await page.waitForTimeout(600);
  assert((await page.evaluate(() => shareData.text)).startsWith('App de territorios de la congregación Villa Prueba:'));
  await page.click('#share [data-act=shareclose]');
  await page.click('#nav [data-tab=lugares]'); await page.click('[data-act=mapaimp]'); await page.waitForTimeout(2500);
  assert.equal(await page.evaluate(() => shareData.text), 'Mapa de los territorios y lugares de salida — Villa Prueba');
  console.log('errors:', errors); assert.deepEqual(errors, []);
  console.log('Congregación tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
