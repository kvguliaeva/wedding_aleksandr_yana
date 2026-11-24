export interface GuestResponse {
  requestId: string;
  name: string;
  attendance: 'yes' | 'no';
  companions: string;
  weddingDate: string;
}

export function validateGuest(data: GuestResponse) {
  if (data.name.trim().length < 2 || data.name.length > 120) throw new Error('Пожалуйста, укажите имя и фамилию.');
  if (!['yes', 'no'].includes(data.attendance)) throw new Error('Пожалуйста, выберите вариант присутствия.');
  if (data.companions.length > 500) throw new Error('Пожалуйста, сократите список сопровождающих до 500 символов.');
}

export function isGoogleEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && url.hostname === 'script.google.com' && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname);
  } catch { return false; }
}

interface SaveStatus { ok?: boolean; requestId?: string; error?: string }
type JsonpWindow = Window & Record<string, unknown>;

/** Только статус сохранения по случайному ID, без чтения личных ответов. */
function readGoogleStatus(endpoint: string, requestId: string): Promise<SaveStatus> {
  return new Promise((resolve, reject) => {
    const callback = `rsvp_${crypto.randomUUID().replaceAll('-', '')}`;
    const script = document.createElement('script');
    const target = window as unknown as JsonpWindow;
    const url = new URL(endpoint);
    url.searchParams.set('action', 'status');
    url.searchParams.set('requestId', requestId);
    url.searchParams.set('callback', callback);
    url.searchParams.set('t', String(Date.now()));
    const clean = () => { clearTimeout(timer); script.remove(); delete target[callback]; };
    const timer = window.setTimeout(() => { clean(); reject(new Error('Сервис не подтвердил сохранение ответа. Попробуйте ещё раз.')); }, 8_000);
    target[callback] = (status: SaveStatus) => { clean(); resolve(status); };
    script.onerror = () => { clean(); reject(new Error('Не удалось связаться с Google Таблицей. Попробуйте ещё раз.')); };
    script.src = url.toString();
    document.head.append(script);
  });
}

export async function waitForSaved(
  requestId: string,
  readStatus: () => Promise<SaveStatus>,
  pause: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 1_500)),
) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await readStatus();
    if (result.requestId !== requestId) throw new Error('Сервис вернул некорректное подтверждение. Попробуйте ещё раз.');
    if (result.error) throw new Error(result.error);
    if (result.ok === true) return;
    await pause();
  }
  throw new Error('Подтверждение пока не получено. Ответ мог сохраниться: попробуйте ещё раз, повторная попытка не создаст дубль.');
}

/** GitHub Pages → Apps Script POST → проверка фактически сохранённой строки. */
export async function sendRsvp(endpoint: string, data: GuestResponse) {
  validateGuest(data);
  if (!endpoint) throw new Error('Приём ответов ещё не подключён. Пожалуйста, зайдите чуть позже.');
  if (!isGoogleEndpoint(endpoint)) throw new Error('Приём ответов временно недоступен. Пожалуйста, зайдите чуть позже.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    // text/plain исключает preflight; opaque-ответ НЕ считается подтверждением.
    await fetch(endpoint, { method: 'POST', mode: 'no-cors', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...data, companions: data.attendance === 'yes' ? data.companions.trim() : '' }), signal: controller.signal });
  } finally { clearTimeout(timer); }
  await waitForSaved(data.requestId, () => readGoogleStatus(endpoint, data.requestId));
}

export async function loadRsvpEndpoint(fallback: string) {
  if (fallback) return fallback;
  const response = await fetch(`${import.meta.env.BASE_URL}rsvp-config.json`, { cache: 'no-store' });
  if (!response.ok) return '';
  const config: unknown = await response.json();
  return typeof config === 'object' && config !== null && 'endpoint' in config && typeof config.endpoint === 'string' ? config.endpoint.trim() : '';
}
