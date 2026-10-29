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

// 30 days of seeded logs showing the narrowing gap from ~55% to ~20% (§8 & §9 of spec)
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
  { week: 'W1', accuracy: 44, consistency: 52 },
  { week: 'W2', accuracy: 51, consistency: 61 },
  { week: 'W3', accuracy: 59, consistency: 74 },
  { week: 'W4', accuracy: 68, consistency: 85 },
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
      task: 'Practice 15 relative-motion problems',
      minutes: 45,
      type: 'weak_topic',
      why: 'You scored 32% here on recent diagnostic',
      masteryScore: 32,
      completed: true,
    },
    {
      subject: 'Reasoning',
      topic: 'Syllogism',
      task: 'Solve 20 "Only a few" syllogism sets',
      minutes: 30,
      type: 'learning',
      why: 'Due for spaced reinforcement (62% mastery)',
      masteryScore: 62,
      completed: true,
    },
    {
      subject: 'English',
      topic: 'Reading Comprehension',
      task: '2 editorial passages, timed solving',
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

    // Fetch real logs from Supabase if user is logged in
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
        // Fetch today's cached plan from Supabase if present
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
    // Navigate to Plan page and start study session with selected task
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
    <div className="space-y-6">
      {/* 1. Header (§6 Screen 3: date · "Welcome back, {name}" · streak flame · points) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-grey/20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-grey">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy tracking-tight mt-0.5">
            Welcome back, {currentProfile.name}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange/10 border border-orange/20 text-orange font-bold text-sm shadow-sm">
            <span>🔥</span>
            <span>{currentProfile.streak_count} Days Streak</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue/10 border border-blue/20 text-blue font-bold text-sm shadow-sm">
            <span>⭐</span>
            <span>{currentProfile.total_points.toLocaleString()} Pts</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-navy text-white text-xs font-mono font-medium">
            {currentProfile.exam}
          </div>
        </div>
      </div>

      {/* 2. Primary Thesis Line (§6 Screen 3: "Under the header, one line of plain text") */}
      <div className="p-4 rounded-xl bg-navy text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm border border-navy/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange/20 flex items-center justify-center text-orange font-bold text-base flex-shrink-0">
            ⚡
          </div>
          <div>
            <p className="text-base md:text-lg font-bold text-white tracking-tight">
              You've executed {totalExecuted.toFixed(0)} of {totalPlanned.toFixed(0)} planned hours this {timeRange === '7' ? 'week' : 'month'}.
            </p>
            <p className="text-xs text-slate-300 mt-0.5">
              The execution gap is real and measurable. Closing it is the only variable that moves your exam rank.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs text-orange font-bold bg-orange/20 px-2.5 py-1 rounded-full border border-orange/30">
            Gap: {overallGapPct}%
          </span>
        </div>
      </div>

      {/* 3. Hero Chart — Execution Gap (§6 Screen 3 & §8 Chart 1) */}
      <div className="bg-white rounded-2xl shadow-sm border border-grey/20 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-navy">Execution Gap Analysis</h2>
              <span className="text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-semibold border border-red-200">
                Core Hero Metric
              </span>
            </div>
            <p className="text-xs text-grey mt-0.5">
              Planned vs Executed hours daily. The shaded region represents lost preparation time.
            </p>
          </div>

          {/* Time range toggle (7 vs 30 days) */}
          <div className="flex items-center rounded-lg bg-slate-100 p-1 border border-grey/20 text-xs self-start sm:self-auto">
            <button
              onClick={() => setTimeRange('7')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                timeRange === '7' ? 'bg-white text-blue shadow-xs font-semibold' : 'text-grey hover:text-navy'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange('30')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                timeRange === '30' ? 'bg-white text-blue shadow-xs font-semibold' : 'text-grey hover:text-navy'
              }`}
            >
              Last 30 Days (Narrowing Story)
            </button>
          </div>
        </div>

        {/* Chart representation or Lite Mode representation (§1 constraint) */}
        {liteMode ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-grey/20">
            <p className="text-xs font-semibold text-navy mb-2">
              [Lite Mode Active] Numerical Execution Summary:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {displayLogs.slice(-6).map((log, idx) => (
                <div key={idx} className="p-2.5 rounded bg-white border border-grey/15">
                  <div className="font-semibold text-navy">{log.dayLabel}</div>
                  <div className="text-grey text-[11px]">
                    Plan: <span className="font-mono text-navy">{log.planned_hrs}h</span>
                  </div>
                  <div className="text-blue text-[11px] font-medium">
                    Done: <span className="font-mono font-bold">{log.actual_hrs}h</span>
                  </div>
                  <div className="text-orange text-[10px]">
                    Gap: {log.gap_hrs}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {/* Shaded Execution Gap (§8 Chart 1: Fill between light red/orange 15% opacity) */}
                  <linearGradient id="gapGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0.02} />
                  </linearGradient>
                  {/* Executed hours fill */}
                  <linearGradient id="executedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
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
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as StudyLogData;
                      return (
                        <div className="bg-navy text-white text-xs p-3 rounded-xl shadow-lg border border-navy/40 space-y-1">
                          <p className="font-bold text-sky">{data.dayLabel}</p>
                          <p className="flex justify-between gap-4">
                            <span className="text-grey">Planned:</span>
                            <span className="font-mono font-semibold">{data.planned_hrs} hrs</span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-blue-300">Executed:</span>
                            <span className="font-mono font-bold text-white">{data.actual_hrs} hrs</span>
                          </p>
                          <p className="flex justify-between gap-4 pt-1 border-t border-white/10 text-orange">
                            <span>Execution Gap:</span>
                            <span className="font-mono font-bold">{data.gap_hrs} hrs</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Series A: Planned hours — grey #94A3B8, dashed (§8 Chart 1) */}
                <Area
                  type="monotone"
                  dataKey="planned_hrs"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#gapGradient)"
                  name="Planned Hours"
                />
                {/* Series B: Executed hours — blue #2563EB, solid 3px (§8 Chart 1) */}
                <Area
                  type="monotone"
                  dataKey="actual_hrs"
                  stroke="#2563EB"
                  strokeWidth={3}
                  fill="url(#executedGradient)"
                  name="Executed Hours"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Below Chart: Three stats: Planned 38h · Executed 22h · Gap 42% (§8 Chart 1) */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-grey/15 text-center">
          <div>
            <span className="text-xs text-grey block">Total Planned</span>
            <span className="text-lg font-bold text-navy">{totalPlanned.toFixed(1)}h</span>
          </div>
          <div>
            <span className="text-xs text-grey block">Total Executed</span>
            <span className="text-lg font-bold text-blue">{totalExecuted.toFixed(1)}h</span>
          </div>
          <div>
            <span className="text-xs text-grey block">Execution Gap</span>
            <span className="text-lg font-bold text-orange">{overallGapPct}%</span>
          </div>
        </div>

        {timeRange === '30' && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
            <span>
              📈 <strong>The Narrative Story:</strong> This user's execution gap shrank from <strong>55% down to 22%</strong> over the last 30 days.
            </span>
            <span className="font-semibold text-emerald-700">Loop verified</span>
          </div>
        )}
      </div>

      {/* 4. Grid: Left Column (Today's Plan) + Right Column (Goals, Squad, Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Plan Card (2 cols on lg) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-grey/20 p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-bold text-navy">Today's Adaptive Plan</h2>
                {/* Header label (§6 Screen 3: "AI-generated from your weak topics") */}
                <span className="inline-block mt-1 text-[11px] font-semibold text-blue bg-blue/10 px-2.5 py-0.5 rounded-full border border-blue/20">
                  ✨ AI-generated from your weak topics
                </span>
              </div>
              <button
                onClick={() => navigate('/plan')}
                className="text-xs font-semibold text-blue hover:underline self-start sm:self-auto"
              >
                View Full Timetable →
              </button>
            </div>

            <p className="text-xs text-grey mb-4">
              Target: <strong>{currentProfile.daily_target_hrs} hours</strong>. At least one weak topic, one revision task, and adaptive down-scaling if yesterday was missed.
            </p>

            {/* Task Rows (§6 Screen 3: subject, topic, minutes, mastery %, progress bar, Start button) */}
            <div className="space-y-3">
              {tasks.map((task, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    task.completed
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-grey/20 bg-white hover:border-blue/40 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-grey">
                          {task.subject}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            (task.masteryScore ?? 50) < 40
                              ? 'bg-red-100 text-red-700'
                              : (task.masteryScore ?? 50) <= 70
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {(task.masteryScore ?? 50) < 40
                            ? 'Weak Topic'
                            : (task.masteryScore ?? 50) <= 70
                            ? 'Reinforcing'
                            : 'Revision'}
                          {' '}({task.masteryScore}%)
                        </span>
                        {task.completed && (
                          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-semibold">
                            Done ✓
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-navy">{task.topic}</h3>
                      <p className="text-xs text-slate-700">{task.task}</p>

                      {/* AI "Why" line grounded in data (§5 Task 1) */}
                      <p className="text-[11px] text-blue font-medium mt-1">
                        🎯 Why: {task.why}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-xs font-mono font-semibold text-slate-600">
                        ⏱️ {task.minutes} min
                      </span>
                      <button
                        onClick={() => handleStartTask(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          task.completed
                            ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            : 'bg-blue text-white hover:bg-blue/90 shadow-xs'
                        }`}
                      >
                        {task.completed ? 'Review' : 'Start Task'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-grey/15 flex items-center justify-between text-xs text-grey">
            <span>Completed 2 of 3 tasks today</span>
            <button
              onClick={() => navigate('/plan')}
              className="text-blue font-semibold hover:underline"
            >
              Study Session Controls →
            </button>
          </div>
        </div>

        {/* Right Column: Daily Goals, Squad Snapshot, Quick Actions */}
        <div className="space-y-6">
          {/* Daily Goals (§6 Screen 3: "seeded with two complete, one pending. Never show 'No goals set yet.'") */}
          <div className="bg-white rounded-2xl shadow-sm border border-grey/20 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-navy">Daily Execution Goals</h3>
              <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                2 / 3 Complete
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-emerald-50/60 border border-emerald-200">
                <span className="text-emerald-600 font-bold">✓</span>
                <span className="line-through text-slate-600 flex-1">
                  Relative Motion train problems (45m)
                </span>
              </div>
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-emerald-50/60 border border-emerald-200">
                <span className="text-emerald-600 font-bold">✓</span>
                <span className="line-through text-slate-600 flex-1">
                  20 Syllogism test drill (30m)
                </span>
              </div>
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-grey/20">
                <span className="w-4 h-4 rounded-full border border-grey/40 flex-shrink-0" />
                <span className="text-navy font-medium flex-1">
                  Reading Comprehension timed session (40m)
                </span>
              </div>
            </div>
          </div>

          {/* Squad Snapshot (§6 Screen 3: members completed today, average streak, link through) */}
          <div className="bg-white rounded-2xl shadow-sm border border-grey/20 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-navy">Squad Snapshot</h3>
              <span className="text-[10px] text-orange bg-orange/10 px-2 py-0.5 rounded font-semibold">
                SSC CGL #4
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-grey">Members checked in today:</span>
                <span className="font-bold text-emerald-600">4 of 6</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-grey">Average squad streak:</span>
                <span className="font-bold text-orange">🔥 11.2 days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-grey">Loss aversion alert:</span>
                <span className="text-red-600 font-semibold text-[11px]">
                  2 members pending proof
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/squad')}
              className="mt-3 w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-navy font-semibold text-xs transition"
            >
              View Squad Accountability Board →
            </button>
          </div>

          {/* Quick Actions (§6 Screen 3: Upload document · Take quiz · Submit proof · Log hours) */}
          <div className="bg-white rounded-2xl shadow-sm border border-grey/20 p-5">
            <h3 className="font-bold text-sm text-navy mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                onClick={() => navigate('/library')}
                className="p-3 rounded-xl bg-blue/5 hover:bg-blue/15 border border-blue/20 text-blue flex flex-col items-center gap-1.5 transition text-center"
              >
                <span className="text-lg">📄</span>
                <span>Upload Document</span>
              </button>

              <button
                onClick={() => navigate('/quiz')}
                className="p-3 rounded-xl bg-orange/5 hover:bg-orange/15 border border-orange/20 text-orange flex flex-col items-center gap-1.5 transition text-center"
              >
                <span className="text-lg">🧠</span>
                <span>Take Quiz</span>
              </button>

              <button
                onClick={() => navigate('/proof')}
                className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 flex flex-col items-center gap-1.5 transition text-center"
              >
                <span className="text-lg">📸</span>
                <span>Submit Proof</span>
              </button>

              <button
                onClick={() => setShowLogModal(true)}
                className="p-3 rounded-xl bg-navy/5 hover:bg-navy/15 border border-navy/20 text-navy flex flex-col items-center gap-1.5 transition text-center"
              >
                <span className="text-lg">⏱️</span>
                <span>Log Hours</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Below the Fold: Secondary Accuracy / Consistency Curve (§6 Screen 3) */}
      <div className="bg-white rounded-2xl shadow-sm border border-grey/20 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-navy">Consistency & Accuracy Progression</h3>
            <p className="text-xs text-grey">
              Tracking your weekly study discipline correlation with diagnostic test scores.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-blue">
              <span className="w-3 h-0.5 bg-blue inline-block" /> Accuracy %
            </span>
            <span className="flex items-center gap-1.5 text-orange">
              <span className="w-3 h-0.5 bg-orange inline-block" /> Consistency %
            </span>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ACCURACY_CONSISTENCY_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
        <div className="fixed inset-0 bg-navy/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-grey/20">
            <h3 className="text-lg font-bold text-navy mb-1">Log Executed Study Hours</h3>
            <p className="text-xs text-grey mb-4">
              Enter hours studied today to update your execution gap live.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-1">
                Hours Studied
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="16"
                value={logHoursInput}
                onChange={(e) => setLogHoursInput(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-grey/30 text-navy font-bold text-lg"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="px-4 py-2 rounded-lg text-xs text-grey hover:text-navy font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualHourLog}
                className="px-5 py-2 rounded-lg bg-blue hover:bg-blue/90 text-white font-medium text-xs shadow-sm"
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
