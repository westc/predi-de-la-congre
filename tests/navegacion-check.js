// The redesign: sections per role, ‹ back, the map per screen on phones, ⤢, resizers, editing points in Lugares,
// Planificar list → editor, Territorio → Editar mapa, Más → Conductores, Calendario → Semana modelo.
const assert = require('assert');
const { chromium, seed, login, PHONE, PC } = require('./seed');
const st = page => page.evaluate(() => ({
  tab, modo: ['none', 'top', 'full'].find(m => document.body.classList.contains('m-' + m)), title: $('#title').textContent, back: !$('#back').hidden,
  tabs: [...document.querySelectorAll('#nav [data-tab]')].map(b => b.dataset.tab), on: (document.querySelector('#nav .on') || {}).dataset?.tab,
  mapH: $('#map').offsetHeight, panelW: panel.offsetWidth, panelH: panel.offsetHeight, alto: innerHeight,
}));
const tap = async (page, sel) => { await page.click(sel); await page.waitForTimeout(250); };
const tapBlock = (page, i) => page.evaluate(i => { const b = BL[i]; gBloques.getLayers().find(l => l._bid === b.id).fire('click', { latlng: L.latLng(centroid(b.coords)) }); }, i);
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const nueva = async ctx => { const p = await (await browser.newContext(ctx)).newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept()); return p; };

  // ---- phone, publicador ----
  const ph = await nueva(PHONE);
  await seed(ph);
  let s = await st(ph); console.log('phone start', s);
  assert.deepEqual(s.tabs, ['hoy', 'calendario', 'lugares', 'mapa', 'mas']);
  assert.equal(s.modo, 'none'); assert(!s.back, 'no ‹ at the top of a section'); assert.equal(s.title, 'Territorios · La Villa');
  await tap(ph, '#nav [data-tab=mapa]'); s = await st(ph);
  assert.equal(s.modo, 'full'); assert.equal(s.panelH, 0); assert(s.mapH > s.alto * 0.6, 'Mapa fills the screen: ' + s.mapH);
  await tap(ph, '#nav [data-tab=hoy]');
  await tap(ph, '.sal-card [data-act=ver]'); s = await st(ph);
  assert.equal(s.title, 'Salida'); assert(s.back); assert.equal(s.modo, 'top'); assert(s.mapH > 150 && s.panelH > 150);
  assert(await ph.evaluate(() => map.getBounds().contains(centroid(BL[0].coords))), 'the salida is on the map');
  // ⤢ and back
  await ph.evaluate(() => expandCtl._div.firstChild.click()); s = await st(ph); assert.equal(s.modo, 'full');
  await ph.evaluate(() => expandCtl._div.firstChild.click()); s = await st(ph); assert.equal(s.modo, 'top');
  await tap(ph, '#back'); s = await st(ph); assert.equal(s.tab, 'hoy'); assert.equal(s.modo, 'none'); assert(!s.back);
  // Calendario → a salida → back to the calendar
  await tap(ph, '#nav [data-tab=calendario]');
  assert(!(await ph.$('[data-act=pgnueva]')), 'publishers cannot add salidas');
  await tap(ph, '#panel [data-act=ver][data-id=m1]'); s = await st(ph); assert.equal(s.title, 'Salida'); assert.equal(s.on, 'calendario');
  await tap(ph, '#back'); s = await st(ph); assert.equal(s.tab, 'calendario'); assert.equal(s.title, 'Calendario');
  await tap(ph, '[data-act=pgvista][data-v=calendario]');
  assert(await ph.$('.cal-g'), 'month grid');
  // Lugares: Ver en el mapa shows the map on top just here; ‹ hides it
  await tap(ph, '#nav [data-tab=lugares]'); s = await st(ph); assert.equal(s.modo, 'none');
  assert(!(await ph.$('[data-act=ptadd]')) && !(await ph.$('[data-act=ptedit]')), 'publishers cannot edit points');
  await tap(ph, '[data-act=lugver]'); s = await st(ph); assert.equal(s.modo, 'top'); assert(s.back);
  await tap(ph, '#back'); s = await st(ph); assert.equal(s.modo, 'none'); assert(!s.back);
  // Más: login, text size, no Conductores for publishers
  await tap(ph, '#nav [data-tab=mas]');
  assert(await ph.$('[data-act=login]')); assert(!(await ph.$('[data-act=massub]')));
  // phone map height: drag the bar under the map (on a screen with map)
  await tap(ph, '#nav [data-tab=hoy]'); await tap(ph, '.sal-card [data-act=ver]');
  const h0 = (await st(ph)).mapH, rz = await ph.$eval('#rz', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await ph.mouse.move(rz.x, rz.y); await ph.mouse.down(); await ph.mouse.move(rz.x, rz.y + 90, { steps: 5 }); await ph.mouse.up(); await ph.waitForTimeout(200);
  const h1 = (await st(ph)).mapH; console.log('map height', h0, '→', h1); assert(h1 > h0 + 60);
  assert.equal(+await ph.evaluate(() => store.get('predi-map-h')), h1, 'remembered');

  // ---- phone, superintendente ----
  await login(ph, '1234'); s = await st(ph); console.log('admin', s);
  assert.deepEqual(s.tabs, ['hoy', 'calendario', 'planificar', 'territorio', 'mas']); assert.equal(s.tab, 'calendario');
  assert(await ph.$('#nav [data-tab=hoy] .badge'), 'missing informes badge on Inicio');
  // Calendario → Semana modelo (sub-screen) and back
  await tap(ph, '[data-act=calsub][data-v=modelo]'); s = await st(ph); assert.equal(s.title, 'Semana modelo'); assert(s.back);
  await tap(ph, '[data-act=pgmodelonueva]'); assert(await ph.$('.pg-form'));
  await tap(ph, '#back'); s = await st(ph); assert.equal(s.title, 'Calendario'); assert(!(await ph.$('.pg-form')));
  // a salida's form has 🗺 Manzanas → Planificar editor
  await tap(ph, '[data-act=pgvista][data-v=lista]');
  await tap(ph, '#panel [data-act=pgedit][data-id=m2]'); await tap(ph, '.pg-form [data-act=planedit]');
  s = await st(ph); assert.equal(s.tab, 'planificar'); assert.equal(s.title, 'Elegir manzanas'); assert.equal(s.modo, 'top');
  await tapBlock(ph, 2); await ph.waitForTimeout(200);
  assert.deepEqual(await ph.evaluate(() => plan.bloques), [await ph.evaluate(() => BL[2].id)], 'tapping a manzana chooses it');
  await tap(ph, '#back'); s = await st(ph); // confirm accepted: leaves without saving
  assert.equal(s.title, 'Planificar'); assert.equal(s.modo, 'none'); assert(await ph.$('[data-act=plannueva]'));
  // choose and save
  await tap(ph, '[data-act=planedit][data-id=m2]'); await tapBlock(ph, 3); await tap(ph, '[data-act=plansave]'); await ph.waitForTimeout(500);
  assert.equal(await ph.evaluate(() => DB.Salidas.find(x => x.id === 'm2').bloques), await ph.evaluate(() => BL[3].id));
  s = await st(ph); assert.equal(s.title, 'Planificar'); assert(!(await ph.$('h3.warn')), 'no salida left without manzanas');
  // Territorio: heat map on top; a territory → its screen → back; Editar mapa with the draw tools
  await tap(ph, '#nav [data-tab=territorio]'); s = await st(ph); assert.equal(s.modo, 'top');
  await tap(ph, '.terr-row.click[data-v="2"]'); s = await st(ph); assert.equal(s.title, 'Territorio 2');
  await tap(ph, '#back'); s = await st(ph); assert.equal(s.title, 'Territorio');
  await tap(ph, '[data-act=terrsub][data-v=editar]'); s = await st(ph); assert.equal(s.title, 'Editar mapa');
  assert(await ph.evaluate(() => map.pm.controlsVisible()), 'draw tools');
  await tap(ph, '#back'); assert(!(await ph.evaluate(() => map.pm.controlsVisible())));
  // leaving Editar mapa for another section: Territorio opens on the heat map again
  await tap(ph, '[data-act=terrsub][data-v=editar]'); await tap(ph, '#nav [data-tab=hoy]'); await tap(ph, '#nav [data-tab=territorio]');
  s = await st(ph); assert.equal(s.title, 'Territorio'); assert(!(await ph.evaluate(() => map.pm.controlsVisible())));
  assert(await ph.evaluate(() => gBloques.getLayers().some(l => l.options.fillColor === HEATC[BYID[l._bid].t])), 'heat colors');
  // Más: Informe (not in the tab bar) → ‹ back to Más; Conductores
  await tap(ph, '#nav [data-tab=mas]');
  await tap(ph, '[data-act=ir][data-v=informe]'); s = await st(ph); assert.equal(s.on, 'mas'); assert.equal(s.modo, 'top'); assert(s.back);
  await tap(ph, '#back'); s = await st(ph); assert.equal(s.tab, 'mas');
  await tap(ph, '[data-act=massub][data-v=conductores]'); s = await st(ph); assert.equal(s.title, 'Conductores'); assert(await ph.$('[data-act=csend]'));
  await tap(ph, '#nav [data-tab=mas]'); s = await st(ph); assert.equal(s.title, 'Más', 'its own tab again goes back to its start');
  // Lugares from Más: add a point by tapping the map, then edit one
  await tap(ph, '[data-act=ir][data-v=lugares]'); await tap(ph, '[data-act=ptadd]'); s = await st(ph);
  assert.equal(s.modo, 'top'); assert.equal(s.title, 'Lugar nuevo');
  await ph.evaluate(() => map.fire('click', { latlng: map.getCenter() })); await ph.waitForTimeout(200);
  await ph.fill('#pt-letra', 'c'); await ph.fill('#pt-nombre', 'Salón del Reino');
  await ph.evaluate(() => map.fire('click', { latlng: map.getCenter() })); await ph.waitForTimeout(200); // moving it keeps what was typed
  assert.equal(await ph.inputValue('#pt-nombre'), 'Salón del Reino');
  await tap(ph, '[data-act=ptsave]'); s = await st(ph); assert.equal(s.title, 'Lugares de salida');
  assert(await ph.$('#pending.show'), 'waits for Guardar todo');
  await tap(ph, '#pending [data-act=commit]'); await ph.waitForTimeout(600);
  assert(await ph.evaluate(() => DB.Puntos.some(p => p.letra === 'C' && p.nombre === 'Salón del Reino')));
  await tap(ph, '[data-act=ptedit][data-id=pB]'); s = await st(ph); assert.equal(s.title, 'Editar lugar'); assert.equal(s.modo, 'top');
  assert(await ph.evaluate(() => gPuntos.getLayers().every(m => m.dragging && m.dragging.enabled())), 'points can be dragged');
  await tap(ph, '#back'); s = await st(ph); assert.equal(s.title, 'Lugares de salida');
  await ph.screenshot({ path: 'out/check-movil-lugares-admin.png' });

  // ---- computer ----
  const pc = await nueva(PC);
  await seed(pc);
  s = await st(pc); console.log('computer', s);
  assert.deepEqual(s.tabs, ['hoy', 'calendario', 'lugares', 'mas']); assert(s.mapH > 700, 'map always there');
  const rz2 = await pc.$eval('#rz', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + 300 }; });
  await pc.mouse.move(rz2.x, rz2.y); await pc.mouse.down(); await pc.mouse.move(rz2.x + 180, rz2.y, { steps: 6 }); await pc.mouse.up(); await pc.waitForTimeout(200);
  const w1 = (await st(pc)).panelW; console.log('panel width', s.panelW, '→', w1); assert(w1 > s.panelW + 150);
  await pc.reload(); await pc.waitForTimeout(1200); assert.equal((await st(pc)).panelW, w1, 'width remembered');
  await login(pc, '5678'); s = await st(pc);
  assert.deepEqual(s.tabs, ['hoy', 'calendario', 'informe', 'planificar', 'territorio', 'lugares', 'mas']); assert.equal(s.tab, 'planificar');
  assert(await pc.$('#nav [data-tab=informe] .badge'));
  await tap(pc, '[data-act=massub]').catch(() => {}); // the siervo de territorios has no Conductores
  await tap(pc, '#nav [data-tab=mas]'); assert(!(await pc.$('[data-act=massub]')));
  // phone ⇄ computer: on Mapa, widening the window goes to Inicio
  await ph.setViewportSize({ width: 390, height: 760 }); await tap(ph, '#nav [data-tab=mas]');
  await ph.setViewportSize({ width: 1100, height: 760 }); await ph.waitForTimeout(300);
  s = await st(ph); assert(s.tabs.includes('informe') && !s.tabs.includes('mapa')); assert(s.mapH > 600);

  // ---- conductor (personal link) ----
  const co = await nueva(PHONE);
  await seed(co); await co.goto('http://127.0.0.1:' + (process.env.PORT || 8765) + '/?demo&c=clave-de-prueba-123456'); await co.waitForTimeout(1200);
  s = await st(co); console.log('conductor', s); assert.deepEqual(s.tabs, ['hoy', 'calendario', 'informe', 'mapa', 'mas']);
  await tap(co, '#nav [data-tab=informe]'); s = await st(co); assert.equal(s.modo, 'top'); assert(!s.back);
  await tap(co, '#nav [data-tab=mas]'); assert(await co.$('[data-act=csalir]'));
  await tap(co, '[data-act=csalir]'); s = await st(co); assert.deepEqual(s.tabs, ['hoy', 'calendario', 'lugares', 'mapa', 'mas']);
  assert(await co.$('[data-act=cvolver]'), 'can come back as conductor');

  console.log('errors:', errors); assert.deepEqual(errors, []);
  console.log('Redesign tests passed');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
