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
 * Admin actions (editing manzanas, planning) need the PIN stored in
 * Project Settings → Script properties → ADMIN_PIN.
 */

// New columns go at the END of a list; setup_() adds them to existing sheets.
const TABLES = {
  Bloques:     ['id', 'territorio', 'bloque', 'coords', 'notas'],
  Territorios: ['id', 'color', 'notas'],
  Puntos:      ['id', 'letra', 'nombre', 'lat', 'lng'],
  Salidas:     ['id', 'fecha', 'bloques', 'punto', 'conductor', 'notas', 'notasBloques', 'hora'],
  Informes:    ['id', 'fecha', 'salida', 'bloque', 'estado', 'porcentaje', 'nota', 'quien', 'creado'],
  Config:      ['id', 'valor'],
};

// Tables anyone with the link may add rows to (field reports).
const PUBLIC_APPEND = ['Informes'];

// Where the app is published (GitHub Pages).
const SITE_URL = 'https://westc.github.io/predi-de-la-congre/';

// What the page may call through doPost.
const API = { getAll, save, remove, commit, checkPin };

/** The page's requests: body = JSON {fn, args}. Answers {ok: true, data} or {ok: false, error}. */
function doPost(e) {
  let out;
  try {
    setup_();
    const req = JSON.parse(e.postData.contents);
    if (!Object.prototype.hasOwnProperty.call(API, req.fn)) throw new Error('Función desconocida: ' + req.fn);
    out = { ok: true, data: API[req.fn].apply(null, req.args || []) };
  } catch (err) {
    out = { ok: false, error: (err && err.message) || String(err) };
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
    .addItem('Cambiar el enlace de la aplicación web…', 'askWebAppUrl')
    .addToUi();
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
  PropertiesService.getScriptProperties().deleteProperty('SCHEMA');
  setup_();
  if (!PropertiesService.getScriptProperties().getProperty('ADMIN_PIN')) {
    Logger.log('Falta el PIN: agrega ADMIN_PIN en Configuración del proyecto → Propiedades del script.');
  } else {
    Logger.log('Listo.');
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

function isAdmin_(pin) {
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');
  return !!real && String(pin) === real;
}

function checkPin(pin) {
  return isAdmin_(pin);
}

function getAll() {
  const out = {};
  for (const table in TABLES) {
    const values = sheet_(table).getDataRange().getDisplayValues();
    const cols = values.shift() || [];
    out[table] = values
      .filter(r => r[0] !== '')
      .map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
  }
  return out;
}

function locked_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    fn();
  } finally {
    lock.releaseLock();
  }
  return getAll();
}

/** Insert or update rows (matched by id). New rows are written in one block. */
function write_(table, rows, admin) {
  const sh = sheet_(table);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getDisplayValues().map(r => r[0]);
  const fresh = [];
  rows.forEach(row => {
    const id = String(row.id || '');
    if (!id) throw new Error('Fila sin id');
    const vals = header.map(c => row[c] == null ? '' : String(row[c]));
    const n = ids.indexOf(id) + 1;
    if (n === 0) {
      ids.push(id);
      fresh.push(vals);
    } else if (admin) { // public users may only add, never overwrite
      sh.getRange(n, 1, 1, header.length).setNumberFormat('@').setValues([vals]);
    }
  });
  if (!fresh.length) return;
  const start = sh.getLastRow() + 1;
  const extra = start + fresh.length - 1 - sh.getMaxRows();
  if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra + 100);
  sh.getRange(start, 1, fresh.length, header.length).setNumberFormat('@').setValues(fresh);
}

function delete_(table, ids) {
  const sh = sheet_(table);
  const all = sh.getRange(1, 1, sh.getLastRow(), 1).getDisplayValues().map(r => r[0]);
  const wanted = ids.map(String);
  for (let i = all.length - 1; i >= 1; i--) {
    if (wanted.indexOf(all[i]) >= 0) sh.deleteRow(i + 1);
  }
}

function save(table, rows, pin) {
  const admin = isAdmin_(pin);
  if (!admin && PUBLIC_APPEND.indexOf(table) < 0) throw new Error('PIN incorrecto');
  return locked_(() => write_(table, rows, admin));
}

function remove(table, ids, pin) {
  if (!isAdmin_(pin)) throw new Error('PIN incorrecto');
  return locked_(() => delete_(table, ids));
}

/** Several saves and deletes in one trip: { save: {Table: [rows]}, remove: {Table: [ids]} }. */
function commit(changes, pin) {
  if (!isAdmin_(pin)) throw new Error('PIN incorrecto');
  return locked_(() => {
    for (const table in changes.save || {}) write_(table, changes.save[table], true);
    for (const table in changes.remove || {}) delete_(table, changes.remove[table]);
  });
}
