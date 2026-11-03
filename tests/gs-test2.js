// Fake Apps Script services, enough to run Code.gs: roles, change log, deltas, cache, doPost.
const fs = require('fs'), assert = require('assert');
class Sheet {
  constructor(name) { this.name = name; this.d = []; this.maxR = 1000; this.maxC = 26; this.hidden = false; }
  getLastRow() { return this.d.length; }
  getLastColumn() { return Math.max(0, ...this.d.map(r => r.length)); }
  getMaxRows() { return this.maxR; } getMaxColumns() { return this.maxC; }
  insertRowsAfter(a, n) { this.maxR += n; } insertColumnsAfter(a, n) { this.maxC += n; }
  setFrozenRows() {} hideSheet() { this.hidden = true; }
  deleteRow(r) { this.d.splice(r - 1, 1); }
  deleteRows(r, n) { this.d.splice(r - 1, n); }
  getDataRange() { READS[this.name] = (READS[this.name] || 0) + 1; return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  getRange(r, c, nr = 1, nc = 1) {
    const sh = this;
    const get = () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => ((sh.d[r - 1 + i] || [])[c - 1 + j]) ?? ''));
    return {
      getDisplayValues: () => get().map(row => row.map(String)), getValues: get, getValue: () => get()[0][0],
      setValues(v) { v.forEach((row, i) => { const R = (sh.d[r - 1 + i] = sh.d[r - 1 + i] || []); row.forEach((x, j) => { while (R.length < c - 1 + j) R.push(''); R[c - 1 + j] = x; }); }); return this; },
      setNumberFormat() { return this; }, setFontWeight() { return this; },
    };
  }
}
const READS = {}, sheets = {}, props = {}, cache = {};
global.SpreadsheetApp = { getActive: () => ({ getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet(n)), getSheets: () => Object.values(sheets), deleteSheet() {} }) };
global.PropertiesService = { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => delete props[k] }) };
global.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
global.CacheService = { getScriptCache: () => ({
  get: k => cache[k] ?? null, put: (k, v) => { cache[k] = v; }, remove: k => delete cache[k],
  putAll: o => { for (const k in o) { if (Buffer.byteLength(o[k]) > 100 * 1024) throw new Error('value too big'); cache[k] = o[k]; } },
  getAll: ks => Object.fromEntries(ks.filter(k => k in cache).map(k => [k, cache[k]])) }) };
const triggers = [];
global.ScriptApp = { getProjectTriggers: () => triggers, newTrigger: h => ({ forSpreadsheet: () => ({ onChange: () => ({ create: () => triggers.push({ getHandlerFunction: () => h }) }) }) }) };
global.ContentService = { createTextOutput: s => ({ setMimeType: () => s }), MimeType: { JSON: 'json' } };
global.Logger = { log: () => {} };
eval(fs.readFileSync(require('path').join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8') +
  ';global.T={setup,doPost,alCambiarHoja,rows_,version_};');
const post = (fn, args, auth, v) => JSON.parse(T.doPost({ postData: { contents: JSON.stringify({ fn, args, auth, v }) } }));
T.setup();
assert(sheets.Cambios.hidden, 'Cambios is hidden'); assert.equal(triggers.length, 1, 'trigger installed');
props.ADMIN_PIN = '1111'; props.TERRITORIOS_PIN = '2222';
const SUP = { pin: '1111' }, TER = { pin: '2222' };
// ---- roles
assert.equal(post('getAll', [], SUP).who.role, 'admin');
assert.equal(post('getAll', [], TER).who.role, 'territorios');
let r = post('getAll', [], { pin: '9999' }); assert.equal(r.who.role, 'publicador'); assert(r.who.pinMal);
// conductores: only the superintendente
r = post('save', ['Conductores', [{ id: 'k1', nombre: 'Pedro', clave: 'SECRETO123456789012', activo: 'si' }]], TER);
assert(!r.ok && /superintendente/.test(r.error), 'territorios cannot create conductores');
r = post('commit', [{ save: { Conductores: [{ id: 'k9', nombre: 'X', clave: 'y' }] } }], TER); assert(!r.ok);
r = post('remove', ['Conductores', ['k1']], TER); assert(!r.ok);
r = post('save', ['Conductores', [{ id: 'k1', nombre: 'Pedro Gómez', clave: 'SECRETO123456789012', activo: 'si' }]], SUP); assert(r.ok, r.error);
assert.equal(r.data.Conductores[0].clave, 'SECRETO123456789012', 'super sees claves');
r = post('getAll', [], TER); assert.equal(r.data.Conductores[0].nombre, 'Pedro Gómez'); assert(!('clave' in r.data.Conductores[0]), 'territorios: no clave');
assert(!('Conductores' in post('getAll', [], {}).data), 'publicador: no conductores');
assert(!('Cambios' in post('getAll', [], SUP).data) && !('Fotos' in post('getAll', [], SUP).data));
r = post('save', ['Cambios', [{ id: 'x' }]], SUP); assert(!r.ok, 'Cambios is protected');
// territorios can do the rest: salidas with the new columns
r = post('save', ['Salidas', [{ id: 's1', fecha: '2026-11-03', hora: '08:30', punto: 'A', conductor: 'Juan Pérez', grupo: '', sinTerritorio: '', especial: '' }]], TER); assert(r.ok, r.error);
assert.equal(r.data.Salidas[0].hora, '08:30'); assert('grupo' in r.data.Salidas[0]);
// ---- versions and cambios
const v0 = post('getAll', [], {}).data._v;
r = post('save', ['Salidas', [{ id: 's2', fecha: '2026-11-04', hora: '16:00', punto: 'B', grupo: 'Grupo 1', sinTerritorio: '', especial: '' }]], SUP, v0);
assert(r.data._delta, 'a write with v answers with the changes'); assert.equal(r.data._delta.cambios.length, 1);
assert.equal(r.data._delta.cambios[0].row.grupo, 'Grupo 1'); assert.equal(r.data._delta.version, v0 + 1);
post('remove', ['Salidas', ['s1']], SUP);
post('informes', [[{ id: 'i1', fecha: '2026-11-04', salida: 's2', bloque: 'b1', estado: 'completo' }], []], { conductor: 'SECRETO123456789012' });
r = post('cambios', [v0], {}); assert(r.ok, r.error);
console.log('cambios since', v0, '→', r.data.cambios.map(c => c.t + ':' + c.op + ':' + c.id).join(' '), 'version', r.data.version);
assert.deepEqual(r.data.cambios.map(c => c.op + c.id), ['puts2', 'dels1', 'puti1']);
assert.equal(r.data.cambios[2].row.quien, 'Pedro Gómez');
// publicador doesn't get conductores changes; territorios gets them without clave
const vc = r.data.version;
post('save', ['Conductores', [{ id: 'k2', nombre: 'Luis Ramos', clave: 'OTROSECRETO12345678', activo: 'si' }]], SUP);
assert.equal(post('cambios', [vc], {}).data.cambios.length, 0);
const ct = post('cambios', [vc], TER).data.cambios[0]; assert.equal(ct.row.nombre, 'Luis Ramos'); assert(!('clave' in ct.row));
assert.equal(post('cambios', [vc], SUP).data.cambios[0].row.clave, 'OTROSECRETO12345678');
// nothing new; ahead or nonsense → reset
const vNow = T.version_();
assert.deepEqual(post('cambios', [vNow], {}).data, { version: vNow, cambios: [] });
assert(post('cambios', [vNow + 5], {}).data.reset); assert(post('cambios', ['x'], {}).data.reset);
// ---- old pages (no v) still get everything after a write
r = post('save', ['Puntos', [{ id: 'p1', letra: 'A', nombre: 'Salón', lat: '1', lng: '2' }]], SUP);
assert(Array.isArray(r.data.Puntos) && !r.data._delta);
// ---- a hand edit in the Sheet: everyone reloads
const before = T.version_(); T.alCambiarHoja();
assert(post('cambios', [before], {}).data.reset, 'hand edit → reset');
const after = T.version_(); assert.deepEqual(post('cambios', [after], {}).data.cambios, []);
// ---- cache: the second load doesn't read the sheets
for (const k in READS) delete READS[k];
post('getAll', [], {}); const reads1 = Object.values(READS).reduce((a, b) => a + b, 0);
post('getAll', [], {}); const reads2 = Object.values(READS).reduce((a, b) => a + b, 0) - reads1;
console.log('sheet reads: first load', reads1, '· second load', reads2);
assert(reads1 > 0 && reads2 === 0, 'second load comes from the cache');
// big data in pieces
const big = Array.from({ length: 3000 }, (_, i) => ({ id: 'x' + i, fecha: '2025-01-01', salida: '', bloque: 'b' + i, estado: 'completo', nota: 'ñandú áéíóú '.repeat(5) }));
post('save', ['Informes', big], SUP);
const full = post('getAll', [], {}).data; assert.equal(full.Informes.length, 3001);
for (const k in READS) delete READS[k];
const again = post('getAll', [], {}).data; assert.equal(again.Informes.length, 3001); assert.equal(Object.keys(READS).length, 0, 'big data also from the cache');
console.log('cache pieces for the full data:', cache['all-pub-' + full._v]);
// pruning: the log keeps the newest; a phone too far behind reloads
props.DATA_V = String(T.version_()); // (unchanged)
const vb = T.version_();
for (let i = 0; i < 70; i++) post('save', ['Informes', Array.from({ length: 100 }, (_, j) => ({ id: 'p' + i + '-' + j, fecha: '2025-02-01', bloque: 'b', estado: 'no' }))], SUP);
console.log('log rows:', sheets.Cambios.getLastRow() - 1);
assert(sheets.Cambios.getLastRow() - 1 <= 6000);
assert(post('cambios', [vb], {}).data.reset, 'too far behind → reset');
assert.equal(post('cambios', [T.version_() - 10], {}).data.cambios.length, 10);
// ---- enlace: Google Maps short links, followed by the script (only Google's, only for the admin)
const RED = {
  'https://maps.app.goo.gl/abc': { Location: 'https://www.google.com/maps/place/Sal%C3%B3n/@-17.79,-63.13,17z/data=!3d-17.7915!4d-63.1371' },
  'https://maps.app.goo.gl/sinxy': { Location: 'https://maps.google.com/maps?cid=123' },
  'https://maps.google.com/maps?cid=123': { body: '<html>... [null,null,-17.7801,-63.1402] ...</html>' },
  'https://maps.app.goo.gl/mal': { Location: 'https://ejemplo.com/' },
};
const pedidos = [];
global.UrlFetchApp = { fetch: (u, o) => { pedidos.push(u); assert.equal(o.followRedirects, false); const x = RED[u] || {}; return { getHeaders: () => (x.Location ? { Location: x.Location } : {}), getContentText: () => x.body || '' }; } };
r = post('enlace', ['https://maps.app.goo.gl/abc'], TER); assert(r.ok, r.error);
assert(r.data.url.includes('!3d-17.7915!4d-63.1371'));
r = post('enlace', ['https://maps.app.goo.gl/sinxy'], SUP); assert(r.ok, r.error);
assert.deepEqual([r.data.lat, r.data.lng], [-17.7801, -63.1402], 'coordinates from the page when the address has none');
assert(!post('enlace', ['https://maps.app.goo.gl/mal'], SUP).ok, 'only to Google');
const n = pedidos.length;
assert(!post('enlace', ['https://ejemplo.com/x'], SUP).ok, 'only Google short links'); assert.equal(pedidos.length, n, 'never fetched');
assert(!post('enlace', ['https://maps.app.goo.gl/abc'], {}).ok, 'not for publicadores');
console.log('Apps Script v2 tests passed');
