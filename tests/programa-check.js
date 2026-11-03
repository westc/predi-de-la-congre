const { chromium } = require('playwright-core');
const assert = require('assert');
const { elegirConductor } = require('./seed');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/?demo'); await page.waitForFunction(() => window.MANZANAS);
  await page.evaluate(() => {
    const Bloques = MANZANAS.slice(0, 8).map((c, i) => ({ id: c.id, territorio: String(Math.floor(i / 4) + 1), bloque: String(i % 4 + 1), coords: JSON.stringify(c.coords), notas: '' }));
    const ll = JSON.parse(Bloques[0].coords)[0];
    const Puntos = [['pA', 'A', 'Flia. Mendoza'], ['pB', 'B', 'Flia. Herrera'], ['pC', 'C', 'Salón del Reino'], ['pD', 'D', 'Plaza Principal'], ['pE', 'E', 'Flia. Vargas']]
      .map(([id, letra, nombre], i) => ({ id, letra, nombre, lat: String(ll[0] - i * 0.001), lng: String(ll[1] + i * 0.001) }));
    const Conductores = [{ id: 'k1', nombre: 'Pedro Gómez', clave: 'CLAVEPEDRO1234567890', activo: 'si' }, { id: 'k2', nombre: 'Juan Pérez', clave: 'CLAVEJUANP1234567890', activo: 'si' }];
    localStorage.clear();
    localStorage.setItem('territorios-demo', JSON.stringify({ Bloques, Territorios: [], Puntos, Salidas: [], Informes: [], Config: [], Conductores, NoVisitar: [], Fotos: [] }));
  });
  const login = async pin => { await page.click('#nav [data-tab=mas]'); await page.click('[data-act=login]'); await page.fill('#pin', pin); await page.click('[data-act=pin]'); await page.waitForTimeout(800); };
  await page.reload(); await page.waitForTimeout(1300);
  // ---- siervo de territorios: everything but the conductores
  await login('5678');
  let r = await page.evaluate(() => ({ role: WHO.role, tabs: [...document.querySelectorAll('#nav [data-tab]')].map(b => b.textContent), claves: DB.Conductores.map(c => c.clave), nombres: DB.Conductores.map(c => c.nombre) }));
  console.log('siervo:', r); assert.equal(r.role, 'territorios'); assert(r.tabs.includes('Calendario') && r.tabs.includes('Planificar')); assert.deepEqual(r.claves, [undefined, undefined]);
  await page.click('#nav [data-tab=mas]');
  assert(!(await page.isVisible('[data-act=massub][data-v=conductores]')), 'no Conductores for the siervo');
  await page.click('[data-act=logout]'); await page.waitForTimeout(800);
  // ---- superintendente: the program
  await login('1234');
  assert.equal(await page.evaluate(() => tab), 'calendario', 'opens on Calendario');
  assert(await page.evaluate(() => DB.Conductores.every(c => c.clave)), 'super has the claves');
  const addModelo = async (dia, hora, punto, extra = {}) => {
    await page.click('[data-act=pgmodelonueva]');
    await page.selectOption('[data-in=pg][data-k=dia]', String(dia)); await page.fill('[data-in=pg][data-k=hora]', hora);
    await page.selectOption('[data-in=pg][data-k=punto]', punto);
    if (extra.grupo) await page.fill('[data-in=pg][data-k=grupo]', extra.grupo);
    if (extra.conductor) await elegirConductor(page, extra.conductor);
    if (extra.notas) await page.fill('[data-in=pg][data-k=notas]', extra.notas);
    if (extra.sin) await page.check('[data-in=pgc][data-k=sinTerritorio]');
    await page.click('[data-act=pgguardar]'); await page.waitForTimeout(600);
  };
  await page.click('[data-act=calsub][data-v=modelo]');
  await addModelo(4, '16:30', 'A', { conductor: 'Juan Pérez' });
  await addModelo(5, '19:00', 'D', { conductor: 'Pedro Gómez', notas: 'Predicación Pública', sin: true });
  await addModelo(0, '16:00', 'E', { grupo: 'Grupo 1', conductor: 'Pedro Gómez' });
  const modelo = await page.evaluate(() => semanaModelo().length); assert.equal(modelo, 3);
  await page.click('#back');
  // generate next month from the model
  await page.click('[data-act=pgmes][data-v="1"]');
  const mes = await page.evaluate(() => prog.mes);
  await page.click('[data-act=pggenerar]'); await page.waitForTimeout(800);
  r = await page.evaluate(m => ({ n: salidasDelMes(m).length, sin: salidasDelMes(m).filter(sinTerr).length, grupos: [...new Set(salidasDelMes(m).map(s => s.grupo))], v: SERVER._v }), mes);
  console.log('generated', mes, r); assert(r.n >= 12 && r.n <= 15); assert(r.sin >= 4);
  assert(!(await page.$('[data-act=pggenerar]')), 'nothing left to add from the model: no button');
  assert.equal(await page.evaluate(m => salidasDelModelo(m).length, mes), 0, 'no repeats');
  // change one conductor, add a special one
  await page.click('.list-item[data-act=pgedit] >> nth=0'); await elegirConductor(page, 'Mario Soto');
  await page.click('[data-act=pgguardar]'); await page.waitForTimeout(600);
  await page.click('[data-act=pgnueva]'); await page.fill('[data-in=pg][data-k=fecha]', mes + '-14'); await page.fill('[data-in=pg][data-k=hora]', '06:30');
  await page.selectOption('[data-in=pg][data-k=punto]', 'C'); await page.fill('[data-in=pg][data-k=notas]', 'Viaje a Puente Caimanes'); await elegirConductor(page, 'Juan Pérez');
  await page.check('[data-in=pgc][data-k=especial]'); await page.check('[data-in=pgc][data-k=sinTerritorio]');
  await page.click('[data-act=pgguardar]'); await page.waitForTimeout(600);
  await page.screenshot({ path: 'out/programa.png' });
  // print + image
  await page.click('[data-act=pgimp]'); await page.click('[data-act=pgimprimir]'); await page.waitForTimeout(300);
  const printed = await page.evaluate(() => ({ rows: document.querySelectorAll('#s13 .pg-t tbody tr').length, esp: document.querySelectorAll('#s13 tr.esp').length, title: document.querySelector('#s13 h1').textContent, nota: !!document.querySelector('#s13 .pg-nota') }));
  console.log('printed:', printed); assert.equal(printed.rows, r.n + 1); assert.equal(printed.esp, 1); assert(printed.nota);
  await page.emulateMedia({ media: 'print' }); await page.pdf({ path: 'out/programa.pdf', format: 'Letter' }); await page.emulateMedia({ media: 'screen' });
  await page.click('[data-act=s13close]');
  await page.click('[data-act=pgimp]'); await page.click('[data-act=pgimagen]'); await page.waitForTimeout(800);
  const img = await page.evaluate(() => { const i = document.querySelector('#share img'); return { w: i.naturalWidth, h: i.naturalHeight, text: document.querySelector('#share textarea').value.split('\n').length }; });
  console.log('image:', img); assert.equal(img.w, 1100); assert.equal(img.text, r.n + 2);
  await page.evaluate(() => { const i = document.querySelector('#share img'); const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); window._png = c.toDataURL(); });
  require('fs').writeFileSync('out/programa-imagen.png', Buffer.from((await page.evaluate(() => window._png)).split(',')[1], 'base64'));
  await page.click('#share [data-act=shareclose]');
  // the program waits as "cambios sin guardar" until Guardar todo
  assert(await page.evaluate(() => pendingCount() > 10)); await page.click('[data-act=commit]'); await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(() => pendingCount()), 0);
  // ---- siervo chooses manzanas for a program salida (second "phone": another tab)
  const page2 = await ctx.newPage(); page2.on('pageerror', e => errors.push('p2: ' + e.message)); page2.on('dialog', d => d.accept());
  await page2.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/?demo'); await page2.evaluate(() => { localStorage.setItem('predi-pin-demo', '5678'); localStorage.removeItem('predi-datos-demo'); });
  await page2.reload(); await page2.waitForTimeout(1500);
  assert.equal(await page2.evaluate(() => WHO.role), 'territorios');
  await page2.click('#nav [data-tab=planificar]');
  const falta = await page2.evaluate(() => [...panel.querySelectorAll('[data-act=planedit]')].map(x => x.textContent).filter(t => t.includes('Elegir manzanas')));
  console.log('siervo sees without manzanas:', falta.length, falta[0]); assert(falta.length >= 4);
  await page2.click('[data-act=planedit]:has-text("Elegir manzanas") >> nth=0');
  const header = await page2.evaluate(() => $('#title').textContent + ' | ' + panel.querySelector('.sal-h').textContent);
  console.log('editing:', header); assert(header.startsWith('Elegir manzanas'));
  await page2.click('[data-act=sugerir]'); await page2.waitForTimeout(200);
  const before2 = await page2.evaluate(() => SERVER._v);
  await page2.click('[data-act=plansave]'); await page2.waitForTimeout(700);
  const after2 = await page2.evaluate(() => SERVER._v);
  const saved = await page2.evaluate(id => DB.Salidas.find(s => s.id === id), await page2.evaluate(() => DB.Salidas.filter(s => s.bloques).map(s => s.id)[0]));
  console.log('saved salida:', { grupo: saved.grupo, conductor: saved.conductor, bloques: saved.bloques.split(',').length, v: before2 + '→' + after2 });
  assert(saved.bloques && after2 > before2);
  // ---- the first "phone" gets only the change
  const v1 = await page.evaluate(() => SERVER._v);
  await page.click('#refresh'); await page.waitForTimeout(800);
  const got = await page.evaluate(id => ({ v: SERVER._v, bloques: DB.Salidas.find(s => s.id === id).bloques }), saved.id);
  console.log('first phone after ↻:', v1, '→', got.v); assert(got.v > v1 && got.bloques === saved.bloques);
  // nothing new → no change
  await page.click('#refresh'); await page.waitForTimeout(800); assert.equal(await page.evaluate(() => SERVER._v), got.v);
  // Hoy shows the program for publicadores
  await page.evaluate(() => { localStorage.removeItem('predi-pin-demo'); });
  console.log('errors:', errors); console.log('Programa tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
