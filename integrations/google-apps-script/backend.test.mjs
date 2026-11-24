import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const code = fs.readFileSync(new URL('./Code.gs', import.meta.url), 'utf8');
const guest = { requestId: '12345678-1234-4234-8234-123456789abc', name: 'Тестовый гость', attendance: 'yes', companions: 'Анна', weddingDate: '2027-01-30T16:00:00+05:00' };

function server() {
  const rows = [['Дата ответа', 'Имя и фамилия', 'Присутствие', 'С кем придёт', 'Дата свадьбы', 'ID ответа']];
  const cache = new Map();
  let flushed = 0;
  const sheet = {
    getLastRow: () => rows.length,
    appendRow: values => rows.push(values),
    getRange: () => ({
      setNumberFormat() {},
      createTextFinder: id => ({ matchEntireCell: () => ({ findNext: () => rows.slice(1).some(row => row[5] === id) ? {} : null }) }),
    }),
  };
  const context = vm.createContext({
    console: { error() {} },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush: () => { flushed++; } },
    CacheService: { getScriptCache: () => ({ put: (key, value) => cache.set(key, value), get: key => cache.get(key) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json', JAVASCRIPT: 'js' }, createTextOutput: text => ({ text, setMimeType(mime) { this.mime = mime; return this; } }) },
  });
  vm.runInContext(code, context);
  return { rows, cache, get flushed() { return flushed; }, post: data => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(data) } }).text), get: parameter => context.doGet({ parameter }) };
}

test('Apps Script saves one row, confirms after flush, and deduplicates retries', () => {
  const app = server();
  assert.equal(app.post(guest).ok, true);
  assert.equal(app.flushed, 1);
  assert.equal(app.rows.length, 2);
  assert.equal(app.post(guest).ok, true);
  assert.equal(app.rows.length, 2);
  const status = JSON.parse(app.get({ action: 'status', requestId: guest.requestId }).text);
  assert.equal(status.ok, true);
  assert.equal('name' in status, false);
  app.cache.clear();
  assert.equal(JSON.parse(app.get({ action: 'status', requestId: guest.requestId }).text).ok, true);
});

test('declining clears companions and spreadsheet formula strings remain literal', () => {
  const app = server();
  app.post({ ...guest, attendance: 'no', name: '=IMPORTXML("x")' });
  assert.equal(app.rows[1][1], '\'=IMPORTXML("x")');
  assert.equal(app.rows[1][2], 'Не смогу');
  assert.equal(app.rows[1][3], '');
});

test('invalid data never receives a saved acknowledgement', () => {
  for (const data of [{ ...guest, name: '' }, { ...guest, weddingDate: 'wrong' }, { ...guest, requestId: '<script>' }]) {
    const app = server();
    assert.equal(app.post(data).ok, false);
    assert.equal(app.rows.length, 1);
  }
});

test('JSONP only accepts a bounded callback and returns no guest data', () => {
  const app = server(); app.post(guest);
  const response = app.get({ action: 'status', requestId: guest.requestId, callback: 'rsvp_12345678123442348234123456789abc' });
  assert.equal(response.mime, 'js');
  assert.ok(!response.text.includes(guest.name));
  assert.equal(app.get({ action: 'status', requestId: guest.requestId, callback: 'alert(1)//' }).mime, 'json');
});
