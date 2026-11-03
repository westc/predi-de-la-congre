// A meeting point's optional picture: chosen in its form, sent with Guardar todo (Descartar drops it), seen by everyone.
const assert = require('assert'), fs = require('fs'), path = require('path');
const { chromium, seed, login, PC } = require('./seed');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const page = await (await browser.newContext(PC)).newPage(); page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await seed(page);
  // a picture to choose (made here, saved as a file)
  const jpg = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 900; c.height = 600; const x = c.getContext('2d');
    x.fillStyle = '#c33'; x.fillRect(0, 0, 900, 600); x.fillStyle = '#fff'; x.font = 'bold 120px sans-serif'; x.fillText('Casa', 260, 340); return c.toDataURL('image/jpeg', 0.9); });
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  const file = path.join(__dirname, 'out', 'foto-lugar.jpg'); fs.writeFileSync(file, Buffer.from(jpg.split(',')[1], 'base64'));
  const guardado = () => page.evaluate(() => { const d = JSON.parse(localStorage.getItem('territorios-demo')); const p = d.Puntos.find(x => x.id === 'pB'); return { foto: p.foto || '', fotos: d.Fotos.filter(f => f.casa === 'pB').length }; });
  await login(page, '1234');
  await page.click('#nav [data-tab=lugares]'); await page.click('[data-act=ptedit][data-id=pB]'); await page.waitForTimeout(200);
  await page.fill('#pt-nombre', 'Plaza Principal (kiosco)');
  await page.setInputFiles('[data-in=ptfoto]', file); await page.waitForTimeout(800);
  assert(await page.$('#panel img.nv-foto'), 'preview'); assert.equal(await page.inputValue('#pt-nombre'), 'Plaza Principal (kiosco)', 'what was typed stays');
  await page.screenshot({ path: 'out/punto-foto-form.png' });
  await page.click('[data-act=ptsave]'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => pendingCount()), 1, 'one change waiting'); assert.deepEqual(await guardado(), { foto: '', fotos: 0 }, 'nothing sent yet');
  // Descartar drops it
  await page.click('#pending [data-act=discard]'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => Object.keys(PEND_FOTOS).length), 0);
  // again, and Guardar todo
  await page.click('[data-act=ptedit][data-id=pB]'); await page.setInputFiles('[data-in=ptfoto]', file); await page.waitForTimeout(800);
  await page.click('[data-act=ptsave]'); await page.click('#pending [data-act=commit]'); await page.waitForTimeout(1500);
  let g = await guardado(); console.log('saved:', g); assert(g.foto && g.fotos === 1);
  assert.equal(await page.evaluate(() => pendingCount()), 0);
  // everyone sees 📷 Foto in Lugares, in the salida and in the map's bubble
  await page.evaluate(() => localStorage.setItem('predi-pin-demo', '')); await page.reload(); await page.waitForTimeout(1300);
  assert.equal(await page.evaluate(() => WHO.role), 'publicador');
  await page.click('#nav [data-tab=lugares]');
  await page.click('[data-act=ptfotover][data-id=pB]'); await page.waitForTimeout(900);
  const img = await page.evaluate(() => { const i = document.querySelector('#share img'); return i && i.src.startsWith('data:image/jpeg') && i.naturalWidth; });
  console.log('photo width:', img); assert(img > 100);
  await page.screenshot({ path: 'out/punto-foto-ver.png' });
  await page.click('#share [data-act=shareclose]');
  await page.click('#nav [data-tab=hoy]'); await page.click('[data-act=ver][data-id=m1]'); await page.waitForTimeout(300);
  assert(await page.$('#panel [data-act=ptfotover][data-id=pB]'), 'in the salida whose meeting point it is');
  // taking it away
  await login(page, '1234'); await page.click('#nav [data-tab=lugares]');
  await page.click('[data-act=ptedit][data-id=pB]'); await page.click('[data-act=ptsinfoto]');
  assert(await page.evaluate(() => panel.textContent.includes('La foto se quitará al guardar')));
  await page.click('[data-act=ptsave]'); await page.click('#pending [data-act=commit]'); await page.waitForTimeout(1500);
  assert.deepEqual(await guardado(), { foto: '', fotos: 0 });
  // a new place with a picture: saved together
  await page.click('[data-act=ptadd]'); await page.evaluate(() => map.fire('click', { latlng: map.getCenter() })); await page.waitForTimeout(200);
  await page.fill('#pt-letra', 'N'); await page.fill('#pt-nombre', 'Casa nueva');
  await page.setInputFiles('[data-in=ptfoto]', file); await page.waitForTimeout(800);
  await page.click('[data-act=ptsave]'); await page.click('#pending [data-act=commit]'); await page.waitForTimeout(1500);
  const n = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('territorios-demo')); const p = d.Puntos.find(x => x.letra === 'N'); return p && p.foto && d.Fotos.some(f => f.casa === p.id); });
  assert(n, 'new place and its picture');
  console.log('errors:', errors); assert.deepEqual(errors, []);
  console.log('Foto del lugar tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
