// Screenshots of every section, phone and computer, publicador and superintendente.
const { chromium, seed, login, PHONE, PC } = require('./seed');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  for (const [name, ctx] of [['movil', PHONE], ['pc', PC]]) {
    const page = await (await browser.newContext(ctx)).newPage(); page.on('pageerror', e => errors.push(name + ': ' + e.message));
    await seed(page);
    const shot = async n => { await page.waitForTimeout(450); await page.screenshot({ path: 'out/' + name + '-' + n + '.png' }); };
    for (const t of await page.$$eval('#nav [data-tab]', bs => bs.map(b => b.dataset.tab))) { await page.click('#nav [data-tab=' + t + ']'); await shot('pub-' + t); }
    await page.click('#nav [data-tab=hoy]'); await page.click('.sal-card [data-act=ver]'); await shot('pub-salida');
    await login(page, '1234');
    for (const t of await page.$$eval('#nav [data-tab]', bs => bs.map(b => b.dataset.tab))) { await page.click('#nav [data-tab=' + t + ']'); await shot('admin-' + t); }
    await page.click('#nav [data-tab=planificar]'); await page.click('[data-act=planedit][data-id=m2]'); await shot('admin-plan-editor');
  }
  console.log('errors:', errors);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
