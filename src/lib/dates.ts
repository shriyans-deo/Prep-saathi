// "Today" is always the Indian calendar day, matching ist_today() in the database.
// toISOString() must not be used for this: it returns yesterday until 05:30 IST.

const TZ = 'Asia/Kolkata';

const isoFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });

export function istToday(): string {
  return isoFormatter.format(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isoDateOf(timestamp: string): string {
  return isoFormatter.format(new Date(timestamp));
}

function localeFor(lang: string): string {
  return lang === 'hi' ? 'hi-IN' : 'en-IN';
}

// Date-only strings are formatted in UTC so the day never shifts.
export function formatDay(iso: string, lang = 'en'): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(localeFor(lang), {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function formatWeekday(iso: string, lang = 'en'): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(localeFor(lang), {
    weekday: 'short',
    timeZone: 'UTC',
  });
}

export function formatLongDate(iso: string, lang = 'en'): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(localeFor(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

export function formatTime(timestamp: string, lang = 'en'): string {
  return new Date(timestamp).toLocaleTimeString(localeFor(lang), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TZ,
  });
}

export function formatRelative(timestamp: string, lang = 'en'): string {
  const rtf = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: 'auto' });
  const minutes = Math.round((new Date(timestamp).getTime() - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(hours / 24), 'day');
}
