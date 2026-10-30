import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GapPoint, WeeklyPoint } from '../lib/data';
import { formatDay, istToday } from '../lib/dates';
import { usePrefs } from '../lib/prefs';
import type { SquadMember } from '../types/database';

// The sheet's rule applies to charts too: print (blue) is the plan, ink (black) is what happened, orange is the gap between them.
const PRINT = '#1d63b0';
const GAP = '#de9242';
const INK = '#14141a';
const GRID = '#e3edf7';
const AXIS = '#4f5a66';

function ChartTooltip({ active, rows, title }: { active?: boolean; title?: string; rows?: { label: string; value: string; strong?: boolean }[] }) {
  if (!active || !rows) return null;
  return (
    <div className="rounded-sheet bg-ink text-white px-3 py-2 text-sm">
      <div className="font-semibold mb-1">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-5">
          <span>{r.label}</span>
          <span className={r.strong ? 'font-semibold' : ''}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function GapChart({ points }: { points: GapPoint[] }) {
  const { t, lang } = usePrefs();
  const today = istToday();
  const hasPast = points.length > 1;
  const data = points.map((p, i) => {
    const isToday = hasPast && p.log_date === today;
    const isYesterday = hasPast && i === points.length - 2 && points[points.length - 1].log_date === today;
    return {
      ...p,
      label: formatDay(p.log_date, lang),
      base: isToday ? null : Math.min(p.actual_hrs, p.planned_hrs),
      gap: isToday ? null : Math.max(0, p.planned_hrs - p.actual_hrs),
      done: isToday ? null : p.actual_hrs,
      sofar: isToday || isYesterday ? p.actual_hrs : null,
    };
  });
  const maxY = Math.ceil(Math.max(...points.map((p) => Math.max(p.planned_hrs, p.actual_hrs)), 4) + 1);

  return (
    <div className="h-64 sm:h-72 w-full" role="img" aria-label={t('Chart of planned and executed hours per day. The same numbers are in the table below.')}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" stroke={AXIS} fontSize={12} tickLine={false} axisLine={{ stroke: '#b9d0e8' }} minTickGap={24} />
          <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} domain={[0, maxY]} allowDecimals={false} unit="h" />
          <Tooltip
            cursor={{ stroke: INK, strokeWidth: 1 }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as (GapPoint & { label: string }) | undefined;
              return (
                <ChartTooltip
                  active={active}
                  title={d?.label}
                  rows={
                    d && [
                      { label: t('Planned'), value: `${d.planned_hrs}h` },
                      { label: d.log_date === today ? t('Today so far') : t('Done'), value: `${d.actual_hrs}h`, strong: true },
                      { label: t('Gap'), value: `${Math.round(d.gap_hrs * 10) / 10}h` },
                    ]
                  }
                />
              );
            }}
          />
          <Area dataKey="base" stackId="gap" stroke="none" fill="transparent" isAnimationActive={false} />
          <Area dataKey="gap" stackId="gap" stroke="none" fill={GAP} fillOpacity={0.25} isAnimationActive={false} />
          <Line dataKey="planned_hrs" stroke={PRINT} strokeWidth={2} strokeDasharray="6 5" dot={false} isAnimationActive={false} />
          <Line
            dataKey="sofar"
            stroke={INK}
            strokeWidth={1}
            dot={(props: { cx?: number; cy?: number; index?: number; payload?: GapPoint }) =>
              props.payload?.log_date === today ? (
                <circle key="today" cx={props.cx} cy={props.cy} r={5} fill="#fff" stroke={INK} strokeWidth={2} />
              ) : (
                <g key={props.index} />
              )
            }
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="done"
            stroke={INK}
            strokeWidth={3}
            dot={points.length <= 10 ? { r: 4, fill: INK, stroke: '#fff', strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: INK, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({ points }: { points: WeeklyPoint[] }) {
  const { t, lang } = usePrefs();
  const data = points.map((p) => ({ ...p, name: formatDay(p.label, lang) }));
  return (
    <div className="h-52 w-full" role="img" aria-label={t('Chart of quiz accuracy and study consistency per week. The same numbers are in the table below.')}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="name" stroke={AXIS} fontSize={12} tickLine={false} axisLine={{ stroke: '#b9d0e8' }} />
          <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
          <Tooltip
            cursor={{ stroke: INK, strokeWidth: 1 }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as (WeeklyPoint & { name: string }) | undefined;
              return (
                <ChartTooltip
                  active={active}
                  title={d && t('Week of {date}', { date: d.name })}
                  rows={
                    d && [
                      { label: t('Quiz accuracy'), value: d.accuracy === null ? t('No quiz') : `${d.accuracy}%`, strong: true },
                      { label: t('Consistency'), value: `${d.consistency}%` },
                    ]
                  }
                />
              );
            }}
          />
          <Line dataKey="consistency" stroke={INK} strokeWidth={1.5} dot={{ r: 4, fill: '#fff', stroke: INK, strokeWidth: 2 }} isAnimationActive={false} />
          <Line dataKey="accuracy" stroke={INK} strokeWidth={3} connectNulls dot={{ r: 4, fill: INK, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SquadChart({ members }: { members: SquadMember[] }) {
  const { t } = usePrefs();
  const data = members.map((m) => ({ ...m, name: m.is_me ? t('You') : m.seat }));
  return (
    <div className="h-52 w-full" role="img" aria-label={t('Chart of check-ins this week for each squad member. The same numbers are in the table above.')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="name" stroke={AXIS} fontSize={12} tickLine={false} axisLine={{ stroke: '#b9d0e8' }} />
          <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} domain={[0, 7]} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: '#eaf2fb' }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as (SquadMember & { name: string }) | undefined;
              return (
                <ChartTooltip
                  active={active}
                  title={d?.is_me ? t('You') : d && t('Aspirant {seat}', { seat: d.seat })}
                  rows={d && [{ label: t('Check-ins'), value: `${d.checkins_week} / 7`, strong: true }]}
                />
              );
            }}
          />
          <Bar dataKey="checkins_week" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
            {data.map((m) => (
              <Cell key={m.seat} fill={m.is_me ? INK : PRINT} fillOpacity={m.is_me ? 1 : 0.55} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
