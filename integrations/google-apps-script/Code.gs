/** Александр и Яна · Google Sheets RSVP · GitHub Pages compatible. */
const RSVP_SETTINGS = {
  SPREADSHEET_ID: '1SNCV-6v_oQg4MJ5gU1Pk01lxHiMwcgHGO7KotSsX_Ok', // Заполняется после импорта таблицы.
  SHEET_NAME: 'Ответы гостей',
  WEDDING_DATE: '2027-01-30T16:00:00+05:00',
};

function getRsvpSheet_() {
  if (!RSVP_SETTINGS.SPREADSHEET_ID) throw new Error('Не указан ID таблицы.');
  const sheet = SpreadsheetApp.openById(RSVP_SETTINGS.SPREADSHEET_ID).getSheetByName(RSVP_SETTINGS.SHEET_NAME);
  if (!sheet) throw new Error('Не найден лист ответов.');
  return sheet;
}

function setupRsvp() {
  const sheet = getRsvpSheet_();
  const expected = ['Дата ответа', 'Имя и фамилия', 'Присутствие', 'С кем придёт', 'Дата свадьбы', 'ID ответа'];
  const headers = sheet.getRange(1, 1, 1, 6).getValues()[0];
  if (headers.join('|') !== expected.join('|')) throw new Error('Названия столбцов не совпадают. Используйте подготовленную таблицу.');
  sheet.setFrozenRows(1);
  SpreadsheetApp.openById(RSVP_SETTINGS.SPREADSHEET_ID).setSpreadsheetTimeZone('Asia/Yekaterinburg');
  console.log('Готово: таблица подключена. Опубликуйте скрипт как веб-приложение.');
}

function validRequestId_(id) {
  return typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id);
}

function safeCell_(value) {
  const text = String(value || '').trim();
  return /^[=+@\-\t\r]/.test(text) ? "'" + text : text;
}

function findRequest_(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  return Boolean(sheet.getRange(2, 6, lastRow - 1, 1).createTextFinder(id).matchEntireCell(true).findNext());
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let requestId = '';
  try {
    const body = e && e.postData && e.postData.contents;
    if (!body || body.length > 5000) throw new Error('Некорректный ответ.');
    const data = JSON.parse(body);
    requestId = data.requestId;
    if (!validRequestId_(requestId)) throw new Error('Некорректный идентификатор ответа.');
    if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.length > 120) throw new Error('Пожалуйста, укажите имя и фамилию.');
    if (!['yes', 'no'].includes(data.attendance)) throw new Error('Укажите вариант присутствия.');
    if (typeof data.companions !== 'string' || data.companions.length > 500) throw new Error('Слишком длинный список сопровождающих.');
    if (data.weddingDate !== RSVP_SETTINGS.WEDDING_DATE) throw new Error('Ответ относится к другому приглашению.');

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sheet = getRsvpSheet_();
      if (!findRequest_(sheet, requestId)) {
        sheet.appendRow([
          new Date(), safeCell_(data.name), data.attendance === 'yes' ? 'Буду' : 'Не смогу',
          data.attendance === 'yes' ? safeCell_(data.companions) : '',
          new Date(RSVP_SETTINGS.WEDDING_DATE), requestId,
        ]);
        const row = sheet.getLastRow();
        sheet.getRange(row, 1).setNumberFormat('dd.mm.yyyy hh:mm');
        sheet.getRange(row, 5).setNumberFormat('dd.mm.yyyy');
        SpreadsheetApp.flush();
      }
      CacheService.getScriptCache().put(requestId, JSON.stringify({ ok: true, requestId }), 600);
      return json_({ ok: true, requestId });
    } finally { lock.releaseLock(); }
  } catch (error) {
    const result = { ok: false, requestId, error: 'Не удалось сохранить ответ. Пожалуйста, попробуйте ещё раз.' };
    console.error(String(error));
    if (validRequestId_(requestId)) CacheService.getScriptCache().put(requestId, JSON.stringify(result), 300);
    return json_(result);
  }
}

/** Только проверка записи. Никакие имена и ответы гостей не публикуются. */
function doGet(e) {
  const params = e && e.parameter || {};
  const requestId = params.requestId || '';
  if (params.action !== 'status' || !validRequestId_(requestId)) return json_({ ok: false });
  let result;
  try {
    const cached = CacheService.getScriptCache().get(requestId);
    result = cached ? JSON.parse(cached) : { ok: findRequest_(getRsvpSheet_(), requestId), requestId };
  } catch (error) {
    result = { ok: false, requestId, error: 'Не удалось проверить сохранение. Пожалуйста, попробуйте ещё раз.' };
  }
  if (typeof params.callback === 'string' && /^rsvp_[a-f0-9]{32}$/.test(params.callback)) {
    return ContentService.createTextOutput(params.callback + '(' + JSON.stringify(result) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(result);
}
