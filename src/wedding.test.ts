import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCalendar } from './wedding';
import { isGoogleEndpoint, sendRsvp, validateGuest, waitForSaved, type GuestResponse } from './google-rsvp';

const guest: GuestResponse = { requestId: '12345678-1234-4234-8234-123456789abc', name: 'Тестовый гость', attendance: 'yes', companions: 'Анна', weddingDate: '2027-01-30T16:00:00+05:00' };

test('January 2027 highlights Saturday the 30th', () => {
  const calendar = getCalendar(guest.weddingDate, 'Asia/Yekaterinburg');
  assert.equal(calendar.cells[4], 1);
  assert.equal(calendar.cells.indexOf(30) % 7, 5);
  assert.equal(calendar.cells.filter(Boolean).length, 31);
  assert.equal(calendar.dateLabel, '30.01.2027');
});

test('calendar follows the venue timezone and handles leap years', () => {
  assert.equal(getCalendar('2028-02-29T23:30:00-05:00', 'Asia/Yekaterinburg').day, 1);
  assert.equal(getCalendar('2028-02-15T12:00:00Z', 'Asia/Yekaterinburg').cells.filter(Boolean).length, 29);
});

test('only a published HTTPS Apps Script endpoint is accepted', () => {
  assert.equal(isGoogleEndpoint('https://script.google.com/macros/s/EXAMPLE_123/exec'), true);
  for (const url of ['', 'http://script.google.com/macros/s/ID/exec', 'https://script.google.com.evil.test/macros/s/ID/exec', 'https://script.google.com/macros/s/ID/dev']) assert.equal(isGoogleEndpoint(url), false);
});

test('guest validation and a missing endpoint cannot produce success', async () => {
  assert.throws(() => validateGuest({ ...guest, name: '  ' }), /имя/);
  assert.throws(() => validateGuest({ ...guest, companions: 'a'.repeat(501) }), /500/);
  await assert.rejects(sendRsvp('', guest), /не подключён/);
});

test('successful transport is not success until a matching saved row is confirmed', async () => {
  let attempts = 0;
  await waitForSaved(guest.requestId, async () => ({ requestId: guest.requestId, ok: ++attempts === 3 }), async () => {});
  assert.equal(attempts, 3);
  await assert.rejects(waitForSaved(guest.requestId, async () => ({ requestId: 'wrong', ok: true }), async () => {}), /некорректное/);
  await assert.rejects(waitForSaved(guest.requestId, async () => ({ requestId: guest.requestId, ok: false, error: 'Ошибка записи' }), async () => {}), /Ошибка записи/);
});

test('a timeout leaves the outcome unconfirmed', async () => {
  let attempts = 0;
  await assert.rejects(waitForSaved(guest.requestId, async () => { attempts++; return { requestId: guest.requestId, ok: false }; }, async () => {}), /мог сохраниться/);
  assert.equal(attempts, 12);
});
