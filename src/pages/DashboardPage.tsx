import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_PROFILE } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import {
  FlameIcon,
  StarIcon,
  ClockIcon,
  CheckIcon,
  UploadIcon,
  QuizIcon,
  ProofIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '../components/ui/Icons';
import { Badge } from '../components/ui/Badge';

interface StudyLogData {
  log_date: string;
  dayLabel: string;
  planned_hrs: number;
  actual_hrs: number;
  gap_hrs: number;
}

interface PlanTask {
  subject: string;
  topic: string;
  task: string;
  minutes: number;
  type: 'weak_topic' | 'learning' | 'revision';
  why: string;
  masteryScore?: number;
  completed?: boolean;
}

// 30 days of seeded logs showing the narrowing gap from ~55% to ~22% (§8 & §9 of spec)
const SEEDED_30_DAYS_LOGS: StudyLogData[] = Array.from({ length: 30 }, (_, index) => {
  const i = 29 - index;
  const d = new Date();
  d.setDate(d.getDate() - i);
  const dayLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const planned = 6.0 + Math.round(Math.sin(i) * 5) / 10;
  let actual = 2.2;
  if (i >= 20) {
    actual = +(2.0 + (30 - i) * 0.05).toFixed(1);
  } else if (i >= 10) {
    actual = +(3.0 + (20 - i) * 0.08).toFixed(1);
  } else {
    actual = +(4.5 + (10 - i) * 0.06).toFixed(1);
  }
  return {
    log_date: d.toISOString().split('T')[0],
    dayLabel,
    planned_hrs: planned,
    actual_hrs: actual,
    gap_hrs: +(Math.max(0, planned - actual)).toFixed(1),
  };
});

// Seeded accuracy & consistency secondary curve (§6 Screen 3)
const ACCURACY_CONSISTENCY_DATA = [
  { week: 'Week 1', accuracy: 44, consistency: 52 },
  { week: 'Week 2', accuracy: 51, consistency: 61 },
  { week: 'Week 3', accuracy: 59, consistency: 74 },
  { week: 'Week 4', accuracy: 68, consistency: 85 },
];

export default function DashboardPage() {
  const { profile, isDemoUser } = useAuth();
  const navigate = useNavigate();

  const [timeRange, setTimeRange] = useState<'7' | '30'>('7');
  const [logs, setLogs] = useState<StudyLogData[]>(SEEDED_30_DAYS_LOGS);
  const [tasks, setTasks] = useState<PlanTask[]>([
    {
      subject: 'Quantitative Aptitude',
      topic: 'Time, Speed and Distance',
      task: 'Practice 15 relative-motion train problems from standard PYQs',
      minutes: 45,
      type: 'weak_topic',
      why: 'You scored 32% here on recent diagnostic (measured gap)',
      masteryScore: 32,
      completed: true,
    },
    {
      subject: 'Reasoning',
      topic: 'Syllogism',
      task: 'Solve 20 "Only a few" categorical syllogism sets',
      minutes: 30,
      type: 'learning',
      why: 'Due for spaced reinforcement (62% mastery)',
      masteryScore: 62,
      completed: true,
    },
    {
      subject: 'English',
      topic: 'Reading Comprehension',
      task: '2 editorial passages, timed solving and inference extraction',
      minutes: 40,
      type: 'revision',
      why: 'Maintain your strongest area (78% mastery)',
      masteryScore: 78,
      completed: false,
    },
  ]);

  const [liteMode, setLiteMode] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logHoursInput, setLogHoursInput] = useState('3.5');

  useEffect(() => {
    setLiteMode(localStorage.getItem('prepsaathi_lite_mode') === 'true');

    // Fetch real logs from Supabase if connected
    const fetchStudyLogs = async () => {
      if (isDemoUser) return;
      try {
        const { data, error } = await supabase
          .from('study_logs')
          .select('log_date, planned_hrs, actual_hrs')
          .order('log_date', { ascending: true })
          .limit(30);

        if (!error && data && data.length > 0) {
          const formatted = data.map((d: any) => {
            const dateObj = new Date(d.log_date);
            return {
              log_date: d.log_date,
              dayLabel: dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
              planned_hrs: Number(d.planned_hrs),
              actual_hrs: Number(d.actual_hrs),
              gap_hrs: Math.max(0, Number(d.planned_hrs) - Number(d.actual_hrs)),
            };
          });
          setLogs(formatted);
        }

        // Fetch today's cached plan
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: planData } = await supabase
          .from('daily_plans')
          .select('tasks')
          .eq('plan_date', todayStr)
          .maybeSingle();

        if (planData?.tasks?.tasks && Array.isArray(planData.tasks.tasks)) {
          setTasks(planData.tasks.tasks as PlanTask[]);
        }
      } catch (e) {
        console.warn('Using seeded logs baseline:', e);
      }
    };

    fetchStudyLogs();
  }, [isDemoUser]);

  const currentProfile = profile || DEMO_PROFILE;

  // Filter logs for selected time range
  const displayLogs = timeRange === '7' ? logs.slice(-7) : logs;

  // Compute aggregated stats (§8 Chart 1: Planned · Executed · Gap %)
  const totalPlanned = displayLogs.reduce((acc, curr) => acc + curr.planned_hrs, 0);
  const totalExecuted = displayLogs.reduce((acc, curr) => acc + curr.actual_hrs, 0);
  const overallGapPct = totalPlanned > 0
    ? Math.round(((totalPlanned - totalExecuted) / totalPlanned) * 100)
    : 0;

  const handleStartTask = (taskIndex: number) => {
    navigate(`/plan?start=${taskIndex}`);
  };

  const handleManualHourLog = async () => {
    const hours = parseFloat(logHoursInput);
    if (isNaN(hours) || hours <= 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const updated = [...logs];
    const todayLog = updated[updated.length - 1];
    if (todayLog) {
      todayLog.actual_hrs = +(todayLog.actual_hrs + hours).toFixed(1);
      todayLog.gap_hrs = +(Math.max(0, todayLog.planned_hrs - todayLog.actual_hrs)).toFixed(1);
      setLogs([...updated]);
    }

    try {
      if (!isDemoUser && currentProfile.id) {
        await supabase.from('study_logs').upsert({
          user_id: currentProfile.id,
          log_date: todayStr,
          planned_hrs: currentProfile.daily_target_hrs,
          actual_hrs: todayLog ? todayLog.actual_hrs : hours,
        });
      }
    } catch (e) {
      console.warn('Study log upsert:', e);
    }

    setShowLogModal(false);
  };

  return (
    <div className="space-y-8">
      {/* 1. Header (§4 & §6 Screen 3: Compact, professional header containing date, welcome, streak, points, exam label) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-grey block">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight mt-1">
            Welcome back, {currentProfile.name}
          </h1>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange/10 border border-orange/20 text-orange font-bold text-xs sm:text-sm shadow-xs">
            <FlameIcon size={16} className="text-orange" />
            <span>{currentProfile.streak_count} Days Streak</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue/10 border border-blue/20 text-blue font-bold text-xs sm:text-sm shadow-xs">
            <StarIcon size={16} className="text-blue" />
            <span>{currentProfile.total_points.toLocaleString()} Points</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-navy text-white text-xs font-mono font-bold tracking-wide shadow-xs">
            {currentProfile.exam}
          </div>
        </div>
      </div>

      {/* 2. Execution Summary Banner (§4 & §6: "You've executed X of Y planned hours this week.") */}
      <div className="p-5 rounded-2xl bg-navy text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-navy/40">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue/20 border border-blue/30 flex items-center justify-center text-blue flex-shrink-0">
            <ClockIcon size={20} className="text-sky" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              You've executed {totalExecuted.toFixed(0)} of {totalPlanned.toFixed(0)} planned hours this {timeRange === '7' ? 'week' : 'month'}.
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              PrepSaathi measures the execution gap daily so your tomorrow adapts to what you actually achieved.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Current Gap</span>
            <span className="text-xs sm:text-sm font-bold text-orange bg-orange/20 px-3 py-1 rounded-full border border-orange/30 font-mono">
              {overallGapPct}% deficit
            </span>
          </div>
        </div>
      </div>

      {/* 3. Balanced Desktop Grid: 2 Columns for Primary (Chart + Plan), 1 Column for Secondary (Goals, Squad, Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* PRIMARY COLUMN (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero Chart — Execution Gap (§4 & §8 Chart 1) */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 md:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-navy tracking-tight">Execution Gap Analysis</h2>
                  <Badge variant="alert">Core Hero Metric</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Planned vs Executed study hours. The shaded area shows lost preparation time.
                </p>
              </div>

              {/* Time Range Toggle */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs self-start sm:self-auto font-medium">
                <button
                  type="button"
                  onClick={() => setTimeRange('7')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    timeRange === '7'
                      ? 'bg-white text-blue shadow-xs font-bold'
                      : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange('30')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    timeRange === '30'
                      ? 'bg-white text-blue shadow-xs font-bold'
                      : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  Last 30 Days (Narrowing Story)
                </button>
              </div>
            </div>

            {/* Chart Area or Lite Mode */}
            {liteMode ? (
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-navy block mb-3 uppercase tracking-wider">
                  [Lite Mode Active] Daily Execution Table
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                  {displayLogs.slice(-8).map((log, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <span className="font-bold text-navy block">{log.dayLabel}</span>
                      <div className="text-grey text-[11px] mt-1">Planned: {log.planned_hrs}h</div>
                      <div className="text-blue font-bold text-[11px]">Executed: {log.actual_hrs}h</div>
                      <div className="text-orange text-[10px] font-semibold">Gap: {log.gap_hrs}h</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gapFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="executedFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="dayLabel"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="h"
                      domain={[0, 'dataMax + 2']}
                    />
                    <Tooltip
                      wrapperStyle={{ zIndex: 100 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as StudyLogData;
                          return (
                            <div className="bg-navy text-white text-xs p-3.5 rounded-xl shadow-xl border border-navy/40 space-y-1.5 min-w-[170px]">
                              <p className="font-bold text-sky text-sm">{data.dayLabel}</p>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Planned:</span>
                                <span className="font-mono font-semibold text-white">{data.planned_hrs} hrs</span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Executed:</span>
                                <span className="font-mono font-bold text-blue-300">{data.actual_hrs} hrs</span>
                              </div>
                              <div className="flex justify-between gap-4 pt-1.5 border-t border-white/15 text-orange font-bold">
                                <span>Execution Gap:</span>
                                <span className="font-mono">{data.gap_hrs} hrs</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Planned Hours: Dashed grey #94A3B8 */}
                    <Area
                      type="monotone"
                      dataKey="planned_hrs"
                      stroke="#94A3B8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="url(#gapFill)"
                      name="Planned Hours"
                    />
                    {/* Executed Hours: Solid blue #2563EB (3px) */}
                    <Area
                      type="monotone"
                      dataKey="actual_hrs"
                      stroke="#2563EB"
                      strokeWidth={3}
                      fill="url(#executedFill)"
                      name="Executed Hours"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Metrics Below Chart (§8 Chart 1: Planned 38h · Executed 22h · Gap 42%) */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-grey block">
                  Total Planned
                </span>
                <span className="text-xl font-extrabold text-navy font-mono mt-0.5 block">
                  {totalPlanned.toFixed(1)}h
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue/5 border border-blue/15">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue block">
                  Total Executed
                </span>
                <span className="text-xl font-extrabold text-blue font-mono mt-0.5 block">
                  {totalExecuted.toFixed(1)}h
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-orange/5 border border-orange/15">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-orange block">
                  Execution Gap
                </span>
                <span className="text-xl font-extrabold text-orange font-mono mt-0.5 block">
                  {overallGapPct}%
                </span>
              </div>
            </div>

            {timeRange === '30' && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <span>
                  📈 <strong>The Execution Thesis:</strong> Over the last 30 days, this aspirant's gap narrowed from <strong>55% down to 22%</strong>.
                </span>
                <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px] bg-emerald-100 px-2 py-0.5 rounded">
                  Loop Validated
                </span>
              </div>
            )}
          </div>

          {/* Today's Adaptive Plan Card (§4: Clean task rows with generous horizontal layout) */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 md:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-navy tracking-tight">Today's Adaptive Plan</h2>
                  <Badge variant="primary">
                    <SparklesIcon size={12} className="text-blue" />
                    <span>AI-generated from weak topics</span>
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Target: <strong>{currentProfile.daily_target_hrs} hours</strong>. Grounded in your measured diagnostic scores.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/plan')}
                className="text-xs font-bold text-blue hover:text-blue/80 transition flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Full Timetable</span>
                <ArrowRightIcon size={12} />
              </button>
            </div>

            {/* Task Rows */}
            <div className="space-y-3.5">
              {tasks.map((task, idx) => (
                <div
                  key={idx}
                  className={`p-4 sm:p-5 rounded-xl border transition-all ${
                    task.completed
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : 'border-slate-200/80 bg-white hover:border-blue/40 shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {task.subject}
                        </span>
                        <Badge
                          variant={
                            (task.masteryScore ?? 50) < 40
                              ? 'weak'
                              : (task.masteryScore ?? 50) <= 70
                              ? 'learning'
                              : 'mastered'
                          }
                        >
                          {(task.masteryScore ?? 50) < 40
                            ? 'Weak Topic'
                            : (task.masteryScore ?? 50) <= 70
                            ? 'Reinforcing'
                            : 'Revision'}
                          {' '}({task.masteryScore}%)
                        </Badge>
                        {task.completed && (
                          <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckIcon size={10} />
                            <span>Done</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm sm:text-base text-navy">{task.topic}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{task.task}</p>

                      {/* AI Why Rationale Line (§4 & §5) */}
                      <p className="text-[11px] text-blue font-medium pt-1">
                        🎯 <strong>Why:</strong> {task.why}
                      </p>
                    </div>

                    {/* Actions and Duration */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-shrink-0">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <ClockIcon size={13} className="text-slate-500" />
                        <span>{task.minutes}m</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartTask(idx)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                          task.completed
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-blue text-white hover:bg-blue/90'
                        }`}
                      >
                        {task.completed ? 'Review Session' : 'Start Task'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Completed 2 of 3 daily targets</span>
              <button
                type="button"
                onClick={() => navigate('/plan')}
                className="font-bold text-blue hover:underline"
              >
                Go to Active Study Workspace →
              </button>
            </div>
          </div>
        </div>

        {/* SECONDARY COLUMN (1 col on lg: Daily Goals, Squad Snapshot, Quick Actions) */}
        <div className="space-y-6">
          {/* Daily Goals Card (§4: 2 complete, 1 pending) */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-navy tracking-tight">Daily Execution Goals</h3>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                2 of 3 Done
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                  <CheckIcon size={11} />
                </span>
                <span className="line-through text-slate-500 font-medium flex-1">
                  Relative Motion train problems (45m)
                </span>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                  <CheckIcon size={11} />
                </span>
                <span className="line-through text-slate-500 font-medium flex-1">
                  20 Syllogism drill sets (30m)
                </span>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                <span className="text-navy font-semibold flex-1">
                  Reading Comprehension timed session (40m)
                </span>
              </div>
            </div>
          </div>

          {/* Squad Snapshot Card (§4: members completed today, average streak, link through) */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-navy tracking-tight">Squad Snapshot</h3>
              <span className="text-[10px] font-bold text-orange bg-orange/10 px-2 py-0.5 rounded-md border border-orange/20">
                SSC CGL #4
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Checked in today:</span>
                <span className="font-bold text-emerald-700 font-mono">4 of 6 members</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Average squad streak:</span>
                <span className="font-bold text-orange font-mono flex items-center gap-1">
                  <FlameIcon size={13} className="text-orange" />
                  <span>11.2 days</span>
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-orange/5 border border-orange/20 text-[11px] text-orange-950">
                <strong>Loss Aversion active:</strong> 2 peers are pending proof submission before 23:59.
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/squad')}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Squad Accountability Board</span>
              <ArrowRightIcon size={12} />
            </button>
          </div>

          {/* Quick Actions Card (§4: 4 buttons with recognized vector icons) */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 space-y-3">
            <h3 className="font-bold text-sm text-navy tracking-tight">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => navigate('/library')}
                className="p-3.5 rounded-xl bg-blue/5 hover:bg-blue/15 border border-blue/20 text-blue flex flex-col items-center gap-2 transition text-center cursor-pointer"
              >
                <UploadIcon size={20} className="text-blue" />
                <span>Upload Document</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/quiz')}
                className="p-3.5 rounded-xl bg-orange/5 hover:bg-orange/15 border border-orange/20 text-orange flex flex-col items-center gap-2 transition text-center cursor-pointer"
              >
                <QuizIcon size={20} className="text-orange" />
                <span>Take Quiz</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/proof')}
                className="p-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 flex flex-col items-center gap-2 transition text-center cursor-pointer"
              >
                <ProofIcon size={20} className="text-emerald-700" />
                <span>Submit Proof</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLogModal(true)}
                className="p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-navy flex flex-col items-center gap-2 transition text-center cursor-pointer"
              >
                <ClockIcon size={20} className="text-navy" />
                <span>Log Hours</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Below the Fold: Secondary Consistency & Accuracy Curve (§4 & §6) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 md:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-navy tracking-tight">
              Consistency & Accuracy Progression Curve
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Correlating weekly study discipline with diagnostic test accuracy scores.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-blue">
              <span className="w-3.5 h-1 bg-blue rounded-full inline-block" /> Accuracy %
            </span>
            <span className="flex items-center gap-1.5 text-orange">
              <span className="w-3.5 h-1 bg-orange rounded-full inline-block" /> Consistency %
            </span>
          </div>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ACCURACY_CONSISTENCY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="week" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="accuracy" stroke="#2563EB" strokeWidth={2.5} name="Accuracy %" />
              <Line type="monotone" dataKey="consistency" stroke="#F97316" strokeWidth={2.5} name="Consistency %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Manual Hours Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-navy tracking-tight mb-1">Log Executed Study Hours</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter hours studied today to update your execution gap live.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-1">
                Hours Studied Today
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="16"
                value={logHoursInput}
                onChange={(e) => setLogHoursInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-navy font-bold text-lg focus:ring-2 focus:ring-blue focus:outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-500 hover:text-navy font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualHourLog}
                className="px-5 py-2 rounded-xl bg-blue hover:bg-blue/90 text-white font-bold text-xs shadow-xs"
              >
                Save & Update Gap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
