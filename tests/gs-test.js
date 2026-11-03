// Minimal fake of the Apps Script services Code.gs uses, to run casa / foto / borrarCasa.
const fs = require('fs');
class Sheet {
  constructor(name) { this.name = name; this.d = []; this.maxR = 1000; this.maxC = 26; }
  getLastRow() { return this.d.length; }
  getLastColumn() { return Math.max(0, ...this.d.map(r => r.length)); }
  getMaxRows() { return this.maxR; } getMaxColumns() { return this.maxC; }
  insertRowsAfter(a, n) { this.maxR += n; } insertColumnsAfter(a, n) { this.maxC += n; }
  setFrozenRows() {} hideSheet() {} deleteRows(r, n) { this.d.splice(r - 1, n); }
  deleteRow(r) { this.d.splice(r - 1, 1); }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  getRange(r, c, nr = 1, nc = 1) {
    const sh = this;
    const get = () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => ((sh.d[r - 1 + i] || [])[c - 1 + j]) ?? ''));
    return {
      getDisplayValues: () => get().map(row => row.map(String)), getValues: get, getValue: () => get()[0][0],
      setValues(v) {
        if (v.some(x => x.some(y => String(y).length > 50000))) throw new Error('cell over 50000 chars');
        v.forEach((row, i) => { const R = (sh.d[r - 1 + i] = sh.d[r - 1 + i] || []); row.forEach((x, j) => { while (R.length < c - 1 + j) R.push(''); R[c - 1 + j] = x; }); });
        return this;
      },
      setNumberFormat() { return this; }, setFontWeight() { return this; },
    };
  }
}
const sheets = {};
global.SpreadsheetApp = { getActive: () => ({
  getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet(n)),
  getSheets: () => Object.values(sheets), deleteSheet() {} }) };
const props = {};
global.PropertiesService = { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: k => delete props[k] }) };
global.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
global.CacheService = { getScriptCache: () => ({ get: () => null, put() {}, remove() {}, putAll() {}, getAll: () => ({}) }) };
eval(fs.readFileSync(require('path').join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8') + ';global.T={setup_,casa,foto,borrarCasa,getAll,rows_,informes};');
const assert = require('assert');
T.setup_();
const admin = { role: 'admin', nombre: '' }, cond = { role: 'conductor', nombre: 'Hno. Pérez' }, pub = { role: 'publicador', nombre: '', aviso: '' };
const big = 'data:image/jpeg;base64,' + 'A'.repeat(163000), small = 'data:image/jpeg;base64,' + 'B'.repeat(1000);

assert.throws(() => T.casa(pub, { id: 'c1', bloque: 'b1', nota: 'x' }, ''), /Solo los conductores/);
assert.throws(() => T.casa(cond, { id: 'c1', bloque: 'b1', nota: '  ' }, ''), /Falta la dirección/);
assert.throws(() => T.casa(cond, { id: 'c1', bloque: 'b1', nota: 'x' }, 'data:image/png;base64,AAAA'), /no es válida/);
T.casa(cond, { id: 'c1', bloque: 'b1', nota: 'Casa verde', quien: 'mentira', creado: 'z' }, big);
assert(!('Fotos' in T.getAll(cond)), 'getAll must not send Fotos');
let c1 = T.rows_('NoVisitar').find(r => r.id === 'c1');
assert.equal(c1.quien, 'Hno. Pérez'); assert.match(c1.foto, /^5\./);
assert.equal(T.rows_('Fotos').length, 5);
assert.equal(T.foto(pub, 'c1'), big, 'picture comes back whole');
// a conductor retry changes nothing; an admin change replaces the picture
T.casa(cond, { id: 'c1', bloque: 'b1', nota: 'otra' }, small);
assert.equal(T.rows_('NoVisitar')[0].nota, 'Casa verde'); assert.equal(T.foto(pub, 'c1'), big);
T.casa(cond, { id: 'c2', bloque: 'b2', nota: 'Sin foto' }, '');
assert.equal(T.rows_('NoVisitar').find(r => r.id === 'c2').foto, '');
T.casa(admin, { id: 'c1', bloque: 'b1', nota: 'Casa verde, reja negra', quien: 'Hno. Pérez', creado: 'z' }, small);
assert.equal(T.rows_('Fotos').length, 1); assert.equal(T.foto(pub, 'c1'), small);
T.casa(admin, { id: 'c1', bloque: 'b3', nota: 'movida', quien: 'Hno. Pérez', creado: 'z' }, null);
c1 = T.rows_('NoVisitar').find(r => r.id === 'c1');
assert.equal(c1.bloque, 'b3'); assert.equal(T.foto(pub, 'c1'), small, 'null keeps the picture');
T.casa(admin, { id: 'c1', bloque: 'b3', nota: 'movida' }, '');
assert.equal(T.rows_('Fotos').length, 0); assert.equal(T.foto(pub, 'c1'), '');
T.casa(admin, { id: 'c1', bloque: 'b3', nota: 'movida' }, big);
assert.throws(() => T.borrarCasa(cond, 'c1'), /Solo el superintendente/);
T.borrarCasa(admin, 'c1');
assert.equal(T.rows_('Fotos').length, 0); assert.deepEqual(T.rows_('NoVisitar').map(r => r.id), ['c2']);
console.log('Apps Script tests passed');

// ---------- informes ----------
const inf = (id, estado, extra) => Object.assign({ id, fecha: '2026-10-27', salida: 's1', bloque: 'b1', estado, porcentaje: '', nota: '', quien: 'phone', creado: '2026-10-27T10:00:00Z' }, extra);
assert.throws(() => T.informes(pub, [inf('i1', 'completo')], []), /Solo los conductores/);
T.informes(cond, [inf('i1', 'parcial', { porcentaje: '50' })], []);
let i1 = T.rows_('Informes').find(r => r.id === 'i1');
assert.equal(i1.quien, 'Hno. Pérez'); assert.equal(i1.editadoPor, '');
T.informes(cond, [inf('i1', 'parcial', { porcentaje: '50' })], []); // retry: unchanged
assert.equal(T.rows_('Informes').find(r => r.id === 'i1').editado, '');
const otro = { role: 'conductor', nombre: 'Hno. Gómez' };
T.informes(otro, [inf('i1', 'completo', { quien: 'x', creado: 'y' })], []);
i1 = T.rows_('Informes').find(r => r.id === 'i1');
assert.equal(i1.estado, 'completo'); assert.equal(i1.quien, 'Hno. Pérez'); assert.equal(i1.creado, '2026-10-27T10:00:00Z');
assert.equal(i1.editadoPor, 'Hno. Gómez'); assert(i1.editado);
T.informes(admin, [inf('i2', 'no', { quien: 'Hno. Admin' })], ['i1']);
assert.deepEqual(T.rows_('Informes').map(r => r.id + ':' + r.quien), ['i2:Hno. Admin']);
T.informes(admin, [inf('i2', 'completo')], []);
assert.equal(T.rows_('Informes')[0].editadoPor, 'Superintendente de servicio');
console.log('Informes tests passed');
