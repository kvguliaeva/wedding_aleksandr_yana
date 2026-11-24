export function getCalendar(target: string, timeZone: string) {
  const date = new Date(target);
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date);
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value);
  const year = part('year');
  const month = part('month') - 1;
  const day = part('day');
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const slots = Math.ceil((offset + total) / 7) * 7;
  return {
    day,
    year,
    label: new Intl.DateTimeFormat('ru', { timeZone, month: 'long' }).format(date),
    dateLabel: new Intl.DateTimeFormat('ru', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date),
    cells: Array.from({ length: slots }, (_, index) => index < offset || index >= offset + total ? null : index - offset + 1),
  };
}

