import { useMemo } from 'react';
import { addDays, formatDay, istToday } from '../lib/dates';
import { usePrefs } from '../lib/prefs';
import type { StudyLog } from '../types/database';

// Thirty bubbles, one per day. Ink fills each bubble in proportion to the daily target,
// so empty days are obvious and every mark stays solid black.
export function MonthGrid({ logs, target, joined }: { logs: StudyLog[]; target: number; joined: string }) {
  const { t, lang } = usePrefs();

  const days = useMemo(() => {
    const byDate = new Map(logs.map((l) => [l.log_date, l.actual_hrs]));
    const today = istToday();
    const joinedDay = joined.slice(0, 10);
    return Array.from({ length: 30 }, (_, i) => {
      const date = addDays(today, i - 29);
      return { date, hours: byDate.get(date) ?? 0, beforeJoin: date < joinedDay };
    });
  }, [logs, joined]);

  const size = 28;

  return (
    <>
      <ol className="grid grid-cols-10 gap-x-1.5 gap-y-2 justify-items-center" aria-label={t('Study hours for each of the last 30 days')}>
        {days.map((d) => {
          const ratio = target > 0 ? Math.min(1, d.hours / target) : 0;
          const label = t('{date}: {n} hours', { date: formatDay(d.date, lang), n: d.hours });
          const ink = d.hours > 0 ? Math.max(8, Math.round(ratio * (size - 3))) : 0;
          return (
            <li key={d.date} title={label}>
              <span className="sr-only">{label}</span>
              <span
                aria-hidden="true"
                className={`flex items-center justify-center rounded-full border-[1.5px] ${d.beforeJoin ? 'border-line' : ratio >= 1 ? 'border-ink' : 'border-print'}`}
                style={{ width: size, height: size }}
              >
                {ink > 0 && <span className="block rounded-full bg-ink" style={{ width: ink, height: ink }} />}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-ink-soft mt-3">
        {t('The fuller the bubble, the closer you came to your {n} hour target.', { n: target })}
      </p>
    </>
  );
}
