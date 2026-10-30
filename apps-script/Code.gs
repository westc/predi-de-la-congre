/**
 * Territorios – Congregación La Villa (Villa 1ro de Mayo, Santa Cruz)
 *
 * The app itself is a static page on GitHub Pages (SITE_URL). This script is its data service:
 * the page sends POST requests here (doPost) and gets JSON back.
 * The Sheet menu "Territorios → Código QR de la app" shows a QR code that opens the page
 * already connected to this Sheet.
 *
 * Google Sheets is the database: one sheet per table below, row 1 = column names.
 * Every value is stored as plain text; the web page does the parsing.
 * (The "Bloques" sheet holds the manzanas; the name is kept so existing data keeps working.)
 *
 * Kinds of users (see who_):
 *  - publicador: anyone with the app link; can only look.
 *  - conductor: opened a personal link made by the superintendente (Conductores sheet); can also send and correct
 *    informes and add houses that asked not to be visited.
 *  - territorios (siervo de territorios): knows his PIN; can do everything except manage the conductores
 *    (he gets their names, never the secret in their links).
 *  - admin (superintendente de servicio): knows his PIN; can do everything.
 * Both PINs are set only from the Sheet menu (Territorios → Cambiar PIN …).
 *
 * Every change made through the app gets a version number and a row in the hidden "Cambios" sheet, so a phone
 * that has version N asks only for what changed since (cambios). A change made by hand in the Sheet (caught by
 * the onChange trigger that setup() installs) makes every phone load everything again.
 */

// New columns go at the END of a list; setup_() adds them to existing sheets.
const TABLES = {
  Bloques:     ['id', 'territorio', 'bloque', 'coords', 'notas'],
  Territorios: ['id', 'color', 'notas'],
  Puntos:      ['id', 'letra', 'nombre', 'lat', 'lng'],
  Salidas:     ['id', 'fecha', 'bloques', 'punto', 'conductor', 'notas', 'notasBloques', 'hora', 'grupo', 'sinTerritorio', 'especial'],
  Informes:    ['id', 'fecha', 'salida', 'bloque', 'estado', 'porcentaje', 'nota', 'quien', 'creado', 'editadoPor', 'editado'],
  Config:      ['id', 'valor'],
  Conductores: ['id', 'nombre', 'clave', 'activo', 'creado'], // clave = the secret in the conductor's link
  NoVisitar:   ['id', 'bloque', 'nota', 'foto', 'quien', 'creado'], // houses that asked not to be visited
  Fotos:       ['id', 'casa', 'datos'], // their pictures, in pieces (see casa)
  Cambios:     ['v', 'tabla', 'id', 'op', 'datos'], // the change log (hidden sheet): op = put | del | reset
};

// Tables getAll leaves out: pictures are big (the page asks for one at a time, foto); the log is for cambios.
const HEAVY = ['Fotos', 'Cambios'];
// Tables the page can't change through save / remove / commit.
const INTERNAS = ['Fotos', 'Cambios'];
// How many changes the log keeps; a phone further behind than that loads everything again.
const MAX_CAMBIOS = 5000;
// A cell holds at most 50,000 characters, so a picture is stored in pieces of this size.
const PIECE = 40000;
// After this many wrong PINs, the PIN is refused for 15 minutes.
const MAX_PIN_FAILS = 10;

// Where the app is published (GitHub Pages).
const SITE_URL = 'https://westc.github.io/predi-de-la-congre/';

// What the page may call through doPost.
// Each one gets who_() as its first argument.
const API = { getAll, cambios, save, remove, commit, informes, casa, borrarCasa, foto };
// The ones that change data: they answer with the data as it is afterwards.
const WRITES = ['save', 'remove', 'commit', 'informes', 'casa', 'borrarCasa'];

/**
 * The page's requests: body = JSON {fn, args, auth: {pin, conductor}, v}.
 * Answers {ok: true, data, who} or {ok: false, error, who}; who = {role, nombre, aviso}.
 * After a change, data is everything (getAll), or only what changed since version v when the page sends v.
 */
function doPost(e) {
  let out, who;
  try {
    setup_();
    const req = JSON.parse(e.postData.contents);
    who = who_(req.auth);
    if (!Object.prototype.hasOwnProperty.call(API, req.fn)) throw new Error('Función desconocida: ' + req.fn);
    let data = API[req.fn].apply(null, [who].concat(req.args || []));
    if (WRITES.indexOf(req.fn) >= 0) data = typeof req.v === 'number' ? { _delta: cambios(who, req.v) } : getAll(who);
    out = { ok: true, data, who };
  } catch (err) {
    out = { ok: false, error: (err && err.message) || String(err), who };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Old links to this script (and Google Sites embeds) now point people to the app. */
function doGet(e) {
  const link = appLink_((e && e.parameter && e.parameter.salida) || '');
  const html = '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<div style="font:16px system-ui,sans-serif;text-align:center;padding:40px 16px">' +
    '<p>La app de territorios ahora está aquí:</p>' +
    (link ? '<p><a href="' + link + '" target="_blank" style="display:inline-block;background:#1f4fbf;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Abrir la app</a></p>'
      : '<p>Pídele el código QR al encargado del territorio.</p>') + '</div>';
  return HtmlService.createHtmlOutput(html).setTitle('Territorios La Villa')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ---------- Sheet menu: QR code that opens the app connected to this Sheet ----------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Territorios')
    .addItem('Código QR de la app', 'showQr')
    .addItem('Cambiar PIN del superintendente de servicio…', 'askPin')
    .addItem('Cambiar PIN del siervo de territorios…', 'askPinTerritorios')
    .addItem('Cambiar el enlace de la aplicación web…', 'askWebAppUrl')
    .addToUi();
}

function askPin() {
  askPin_('ADMIN_PIN', 'TERRITORIOS_PIN', 'PIN del superintendente de servicio',
    'Con él se entra a todo en la app, también a los conductores y sus enlaces.');
}
function askPinTerritorios() {
  askPin_('TERRITORIOS_PIN', 'ADMIN_PIN', 'PIN del siervo de territorios',
    'Con él se entra a todo en la app menos a los conductores.');
}
function askPin_(prop, other, title, what) {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt(title, 'Escribe el PIN nuevo (al menos 4 caracteres, sin espacios). ' + what, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const pin = r.getResponseText().trim();
  if (!/^\S{4,}$/.test(pin)) {
    ui.alert('El PIN tiene que tener al menos 4 caracteres, sin espacios.');
    return;
  }
  const props = PropertiesService.getScriptProperties();
  if (pin === props.getProperty(other)) {
    ui.alert('Ese PIN ya es el del otro hermano. Elige uno distinto.');
    return;
  }
  props.setProperty(prop, pin);
  CacheService.getScriptCache().remove('pinFails');
  ui.alert('PIN guardado. Quien ya había entrado con el PIN anterior tendrá que entrar de nuevo.');
}

/** The web app's deployment id (the part between /s/ and /exec), or ''. */
function webAppId_() {
  let url = PropertiesService.getScriptProperties().getProperty('WEBAPP_URL') || '';
  if (!url) {
    const own = ScriptApp.getService().getUrl() || '';
    if (/\/exec$/.test(own)) url = own; // only a real deployment, not the editor's /dev link
  }
  const m = url.match(/\/s\/([\w-]+)\/exec/);
  return m ? m[1] : '';
}

/** Link to the app connected to this Sheet (optionally straight to one salida). */
function appLink_(salida) {
  const id = webAppId_();
  if (!id) return '';
  return SITE_URL + '?api=' + id + (salida ? '&salida=' + encodeURIComponent(salida) : '');
}

function showQr() {
  if (!webAppId_() && !askWebAppUrl()) return;
  const page = HtmlService.createTemplateFromFile('Qr');
  page.link = appLink_('');
  SpreadsheetApp.getUi().showModalDialog(page.evaluate().setWidth(420).setHeight(560), 'Código QR de la app');
}

/** Asks for the web app URL (Deploy → Manage deployments). Returns true if one was saved. */
function askWebAppUrl() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Enlace de la aplicación web',
    'Pega la "URL de la aplicación web" que termina en /exec.\n' +
    '(En Apps Script: Implementar → Administrar implementaciones / Deploy → Manage deployments)',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return false;
  const url = r.getResponseText().trim();
  if (!/^https:\/\/script\.google\.com\/.*\/s\/[\w-]+\/exec/.test(url)) {
    ui.alert('Ese enlace no parece la URL de la aplicación web. Tiene que empezar con https://script.google.com/ y terminar en /exec.');
    return false;
  }
  PropertiesService.getScriptProperties().setProperty('WEBAPP_URL', url);
  return true;
}

/** Run once from the editor to create the sheets and approve permissions (doPost also creates sheets). */
function setup() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('SCHEMA');
  setup_();
  // Changes made by hand in the Sheet: every phone loads everything again (see alCambiarHoja).
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'alCambiarHoja')) {
    ScriptApp.newTrigger('alCambiarHoja').forSpreadsheet(SpreadsheetApp.getActive()).onChange().create();
  }
  const falta = [['ADMIN_PIN', 'del superintendente de servicio'], ['TERRITORIOS_PIN', 'del siervo de territorios']]
    .filter(p => !props.getProperty(p[0])).map(p => p[1]);
  Logger.log(falta.length ? 'Falta el PIN ' + falta.join(' y el ') + ': en la hoja, usa el menú Territorios.' : 'Listo.');
}

/** Installed by setup(): something was changed by hand in the Sheet, so every phone loads everything again. */
function alCambiarHoja() {
  setup_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    log_('*', [{ id: '', op: 'reset' }]);
  } finally {
    lock.releaseLock();
  }
}

/** Creates missing sheets and columns. Skipped once the current schema is in place. */
function setup_() {
  const props = PropertiesService.getScriptProperties();
  const schema = JSON.stringify(TABLES);
  if (props.getProperty('SCHEMA') === schema) return;
  const ss = SpreadsheetApp.getActive();
  for (const name in TABLES) {
    const cols = TABLES[name];
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@');
      sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
      sh.setFrozenRows(1);
      if (name === 'Cambios') sh.hideSheet(); // for the app only
      continue;
    }
    const have = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getDisplayValues()[0];
    const missing = cols.filter(c => have.indexOf(c) < 0);
    if (!missing.length) continue;
    const at = have[0] === '' ? 1 : have.length + 1;
    const extra = at + missing.length - 1 - sh.getMaxColumns();
    if (extra > 0) sh.insertColumnsAfter(sh.getMaxColumns(), extra);
    sh.getRange(1, at, sh.getMaxRows(), missing.length).setNumberFormat('@');
    sh.getRange(1, at, 1, missing.length).setValues([missing]).setFontWeight('bold');
  }
  const blank = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);
  props.setProperty('SCHEMA', schema);
}

function sheet_(table) {
  if (!TABLES[table]) throw new Error('Tabla desconocida: ' + table);
  return SpreadsheetApp.getActive().getSheetByName(table);
}

/** Which role a PIN opens: 'admin', 'territorios' or ''. */
function pinRole_(pin) {
  const props = PropertiesService.getScriptProperties(), p = String(pin);
  if (props.getProperty('ADMIN_PIN') && p === props.getProperty('ADMIN_PIN')) return 'admin';
  if (props.getProperty('TERRITORIOS_PIN') && p === props.getProperty('TERRITORIOS_PIN')) return 'territorios';
  return '';
}
/** The superintendente or the siervo de territorios. */
function esAdmin_(who) { return who.role === 'admin' || who.role === 'territorios'; }
/** A conductor's row without the secret of their link (for the siervo de territorios). */
function sinClave_(r) { const c = Object.assign({}, r); delete c.clave; return c; }

/**
 * Who is asking, from auth = {pin, conductor}.
 * aviso explains a PIN (pinMal) or conductor link (enlaceMal) that didn't work, so the page can forget it.
 */
function who_(auth) {
  auth = auth || {};
  const who = { role: 'publicador', nombre: '', aviso: '', pinMal: false, enlaceMal: false };
  if (auth.pin) {
    const cache = CacheService.getScriptCache();
    const fails = +(cache.get('pinFails') || 0);
    const role = fails < MAX_PIN_FAILS ? pinRole_(auth.pin) : '';
    if (role) return { role, nombre: '' };
    if (fails < MAX_PIN_FAILS) cache.put('pinFails', String(fails + 1), 15 * 60);
    who.pinMal = true;
    who.aviso = fails < MAX_PIN_FAILS ? 'PIN incorrecto.' : 'Demasiados intentos con un PIN equivocado. Espera 15 minutos.';
  }
  if (auth.conductor) {
    const c = rows_('Conductores').find(r => r.clave === String(auth.conductor) && r.activo !== 'no');
    if (c) return Object.assign(who, { role: 'conductor', nombre: c.nombre });
    who.enlaceMal = true;
    who.aviso = who.aviso || 'Tu enlace de conductor ya no sirve. Pide uno nuevo al encargado del territorio.';
  }
  return who;
}

function rows_(table) {
  const values = sheet_(table).getDataRange().getDisplayValues();
  const cols = values.shift() || [];
  return values
    .filter(r => r[0] !== '')
    .map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
}

/**
 * Everything the page shows, as this person may see it, with _v = the version it's at. Kept ready in the cache
 * (per version and kind of user), so most loads don't read the sheets. The version is read first: data read
 * after it may already include newer changes, which the page simply gets again from cambios.
 */
function getAll(who) {
  const v = version_();
  const vista = who.role === 'admin' ? 'admin' : who.role === 'territorios' ? 'terr' : 'pub';
  const key = 'all-' + vista + '-' + v;
  const hit = cacheGet_(key);
  if (hit) return JSON.parse(hit);
  const out = { _v: v };
  for (const table in TABLES) {
    if (HEAVY.indexOf(table) >= 0) continue;
    if (table === 'Conductores') {
      if (vista !== 'pub') out[table] = rows_(table).map(r => vista === 'admin' ? r : sinClave_(r));
    } else {
      out[table] = rows_(table);
    }
  }
  cachePut_(key, JSON.stringify(out));
  return out;
}

/**
 * What changed since version "since", as this person may see it: { version, cambios: [{t, id, op, row}] }, or
 * { version, reset: true } when the page has to load everything (a hand edit, or it's too far behind).
 */
function cambios(who, since) {
  const props = PropertiesService.getScriptProperties();
  const v = version_();
  since = Number(since);
  if (!(since >= 0) || since > v || since < +(props.getProperty('RESET_V') || 0)) return { version: v, reset: true };
  if (since === v) return { version: v, cambios: [] };
  const sh = sheet_('Cambios'), last = sh.getLastRow(), n = v - since;
  if (last - 1 < n) return { version: v, reset: true };
  const rows = sh.getRange(last - n + 1, 1, n, 5).getDisplayValues();
  if (+rows[0][0] !== since + 1 || +rows[n - 1][0] !== v) return { version: v, reset: true }; // the log doesn't line up
  const out = [];
  for (const r of rows) {
    const t = r[1];
    if (t === '*') return { version: v, reset: true };
    if (t === 'Conductores' && !esAdmin_(who)) continue;
    let row = r[4] ? JSON.parse(r[4]) : null;
    if (t === 'Conductores' && who.role !== 'admin' && row) row = sinClave_(row);
    out.push({ t, id: r[2], op: r[3], row });
  }
  return { version: v, cambios: out };
}

function version_() { return +(PropertiesService.getScriptProperties().getProperty('DATA_V') || 0); }

/** Records changes (inside the lock): each one gets the next version and a row in Cambios. */
function log_(table, entries) {
  if (!entries.length || (table !== '*' && HEAVY.indexOf(table) >= 0)) return;
  const props = PropertiesService.getScriptProperties();
  let v = version_();
  const vals = entries.map(e => [String(++v), table, String(e.id), e.op, e.row ? JSON.stringify(e.row) : '']);
  const sh = sheet_('Cambios');
  const start = sh.getLastRow() + 1;
  const extra = start + vals.length - 1 - sh.getMaxRows();
  if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra + 100);
  sh.getRange(start, 1, vals.length, 5).setNumberFormat('@').setValues(vals);
  props.setProperty('DATA_V', String(v));
  if (table === '*') props.setProperty('RESET_V', String(v));
  if (sh.getLastRow() - 1 > MAX_CAMBIOS + 1000) sh.deleteRows(2, 1000); // the oldest go
}

// A cache value holds up to 100 KB, so the full data is kept in pieces (30,000 characters: room for accents).
const CACHE_PIECE = 30000;
function cachePut_(key, str) {
  const n = Math.ceil(str.length / CACHE_PIECE), parts = {};
  for (let i = 0; i < n; i++) parts[key + ':' + i] = str.slice(i * CACHE_PIECE, (i + 1) * CACHE_PIECE);
  parts[key] = String(n);
  try { CacheService.getScriptCache().putAll(parts, 21600); } catch (e) { /* too big to keep: read the sheets next time */ }
}
function cacheGet_(key) {
  const c = CacheService.getScriptCache(), n = +(c.get(key) || 0);
  if (!n) return null;
  const keys = [];
  for (let i = 0; i < n; i++) keys.push(key + ':' + i);
  const got = c.getAll(keys);
  return keys.every(k => got[k] != null) ? keys.map(k => got[k]).join('') : null;
}

function locked_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    fn();
  } finally {
    lock.releaseLock();
  }
}

function needAdmin_(who) {
  if (!esAdmin_(who)) throw new Error(who.aviso || 'Solo el superintendente de servicio o el siervo de territorios pueden hacer esto.');
}
function needSuper_(who) {
  if (who.role !== 'admin') {
    throw new Error(who.role === 'territorios' ? 'Solo el superintendente de servicio puede cambiar los conductores.'
      : who.aviso || 'Solo el superintendente de servicio puede hacer esto.');
  }
}
/** Tables the page can't write, and the conductores (only the superintendente). */
function checkTable_(who, table) {
  if (INTERNAS.indexOf(table) >= 0) throw new Error('Tabla protegida: ' + table);
  if (table === 'Conductores') needSuper_(who);
}

/** Insert or update rows (matched by id). New rows are written in one block. */
/** Insert or update rows (matched by id). New rows are written in one block. Every change goes in the log. */
function write_(table, rows, admin) {
  const sh = sheet_(table);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getDisplayValues().map(r => r[0]);
  const fresh = [], logged = [];
  rows.forEach(row => {
    const id = String(row.id || '');
    if (!id) throw new Error('Fila sin id');
    const vals = header.map(c => row[c] == null ? '' : String(row[c]));
    const n = ids.indexOf(id) + 1;
    if (n === 0) {
      ids.push(id);
      fresh.push(vals);
    } else if (admin) { // conductores may only add, never overwrite
      sh.getRange(n, 1, 1, header.length).setNumberFormat('@').setValues([vals]);
    } else {
      return;
    }
    logged.push({ id, op: 'put', row: Object.fromEntries(header.map((c, i) => [c, vals[i]])) });
  });
  if (fresh.length) {
    const start = sh.getLastRow() + 1;
    const extra = start + fresh.length - 1 - sh.getMaxRows();
    if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra + 100);
    sh.getRange(start, 1, fresh.length, header.length).setNumberFormat('@').setValues(fresh);
  }
  log_(table, logged);
}

function delete_(table, ids) {
  const sh = sheet_(table);
  const all = sh.getRange(1, 1, sh.getLastRow(), 1).getDisplayValues().map(r => r[0]);
  const wanted = ids.map(String), gone = [];
  for (let i = all.length - 1; i >= 1; i--) {
    if (wanted.indexOf(all[i]) >= 0) {
      sh.deleteRow(i + 1);
      gone.push({ id: all[i], op: 'del' });
    }
  }
  log_(table, gone);
}

function save(who, table, rows) {
  if (who.role === 'conductor' && table === 'Informes') {
    rows.forEach(r => { r.quien = who.nombre; }); // the name comes from the link, not from the phone
    return locked_(() => write_(table, rows, false));
  }
  if (!esAdmin_(who) && table === 'Informes') {
    throw new Error(who.aviso || 'Solo los conductores pueden enviar informes. Pide tu enlace al encargado del territorio.');
  }
  needAdmin_(who);
  checkTable_(who, table);
  return locked_(() => write_(table, rows, true));
}

function remove(who, table, ids) {
  needAdmin_(who);
  checkTable_(who, table);
  return locked_(() => delete_(table, ids));
}

/** Several saves and deletes in one trip: { save: {Table: [rows]}, remove: {Table: [ids]} }. */
function commit(who, changes) {
  needAdmin_(who);
  Object.keys(changes.save || {}).concat(Object.keys(changes.remove || {})).forEach(t => checkTable_(who, t));
  return locked_(() => {
    for (const table in changes.save || {}) write_(table, changes.save[table], true);
    for (const table in changes.remove || {}) delete_(table, changes.remove[table]);
  });
}

/**
 * Saves informes (conductor or admin): new rows are added, rows already there are updated, and the
 * ids in borrar are deleted. An update keeps who reported first (quien, creado); editadoPor and
 * editado say who changed it last. Resending a row unchanged (a retry) changes nothing.
 */
function informes(who, rows, borrar) {
  if (who.role === 'publicador') {
    throw new Error(who.aviso || 'Solo los conductores pueden enviar informes. Pide tu enlace al encargado del territorio.');
  }
  return locked_(() => {
    const old = {};
    rows_('Informes').forEach(r => { old[r.id] = r; });
    const ahora = new Date().toISOString();
    const keep = rows.filter(r => {
      const o = old[String(r.id)];
      if (!o) {
        if (who.role === 'conductor') r.quien = who.nombre; // the name comes from the link, not from the phone
        return true;
      }
      if (['fecha', 'salida', 'bloque', 'estado', 'porcentaje', 'nota'].every(k => String(r[k] == null ? '' : r[k]) === o[k])) return false;
      Object.assign(r, { quien: o.quien, creado: o.creado, editado: ahora,
        editadoPor: who.role === 'conductor' ? who.nombre
          : String(r.editadoPor || '') || (who.role === 'territorios' ? 'Siervo de territorios' : 'Superintendente de servicio') });
      return true;
    });
    if (keep.length) write_('Informes', keep, true);
    if ((borrar || []).length) delete_('Informes', borrar);
  });
}

// ---------- houses that asked not to be visited ----------

/**
 * Adds a house (conductor or admin), or changes one (admin only).
 * foto: a JPEG data: URL, '' for no picture, or null to keep the one it has.
 * A conductor sending a house that is already there (a retry) changes nothing.
 */
function casa(who, row, foto) {
  if (who.role === 'publicador') {
    throw new Error(who.aviso || 'Solo los conductores pueden registrar casas. Pide tu enlace al encargado del territorio.');
  }
  if (!String(row.id || '') || !String(row.bloque || '')) throw new Error('Falta la manzana de la casa.');
  if (!String(row.nota || '').trim()) throw new Error('Falta la dirección o descripción de la casa.');
  if (foto && !(/^data:image\/jpeg;base64,[\w+\/=]+$/.test(foto) && foto.length <= 200000)) {
    throw new Error('La foto no es válida o es demasiado grande.');
  }
  return locked_(() => {
    const old = rows_('NoVisitar').find(r => r.id === String(row.id));
    if (old && !esAdmin_(who)) return;
    if (who.role === 'conductor') row.quien = who.nombre; // the name comes from the link, not from the phone
    row.foto = old ? old.foto : '';
    if (foto != null) {
      if (old) delete_('Fotos', fotoIds_(old));
      const pieces = [];
      for (let i = 0; i < foto.length; i += PIECE) pieces.push({ id: row.id + '-' + pieces.length, casa: row.id, datos: foto.slice(i, i + PIECE) });
      if (pieces.length) write_('Fotos', pieces, true);
      // How many pieces, plus a stamp so phones know when a picture was replaced.
      row.foto = pieces.length ? pieces.length + '.' + Date.now().toString(36) : '';
    }
    write_('NoVisitar', [row], true);
  });
}

function borrarCasa(who, id) {
  needAdmin_(who);
  return locked_(() => {
    const old = rows_('NoVisitar').find(r => r.id === String(id));
    if (old) delete_('Fotos', fotoIds_(old));
    delete_('NoVisitar', [id]);
  });
}

/** One house's picture as a data: URL ('' if it has none). */
function foto(who, id) {
  const sh = sheet_('Fotos'), n = sh.getLastRow();
  if (n < 2) return '';
  const pieces = [];
  sh.getRange(2, 1, n - 1, 2).getDisplayValues().forEach((r, i) => {
    if (r[1] === String(id)) pieces[+r[0].slice(r[0].lastIndexOf('-') + 1)] = i + 2;
  });
  return pieces.map(row => sh.getRange(row, 3).getValue()).join('');
}

function fotoIds_(casaRow) {
  const n = parseInt(casaRow.foto, 10) || 0, ids = [];
  for (let i = 0; i < n; i++) ids.push(casaRow.id + '-' + i);
  return ids;
}
