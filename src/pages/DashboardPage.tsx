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
import { NumberTicker } from '../components/magicui/NumberTicker';
import { BorderBeam } from '../components/magicui/BorderBeam';
import { BlurFade } from '../components/magicui/BlurFade';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import { DecryptedText } from '../components/reactbits/DecryptedText';
import { motion, AnimatePresence } from 'motion/react';

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

// 30 days of seeded logs showing the narrowing gap from ~55% to ~22%
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

// Seeded accuracy & consistency secondary curve
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
      why: 'You scored 32% here on recent diagnostic (measured weak area)',
      masteryScore: 32,
      completed: true,
    },
    {
      subject: 'Reasoning',
      topic: 'Syllogism',
      task: 'Solve 20 "Only a few" categorical syllogism drill sets',
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

    const fetchStudyLogs = async () => {
      if (isDemoUser) return;
      try {
        const { data, error } = await supabase
          .from('study_logs')
          .select('log_date, planned_hrs, actual_hrs')
          .order('log_date', { ascending: true })
          .limit(30);

        if (!error && data && data.length > 0) {
          const formatted = data.map((d: { log_date: string; planned_hrs: number | string; actual_hrs: number | string }) => {
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
  const displayLogs = timeRange === '7' ? logs.slice(-7) : logs;

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
      {/* 1. Header with Executive Greeting, Badges, and High Contrast */}
      <BlurFade delay={0.05}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-slate-200/90">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue via-blue-600 to-sky-400 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue/25 flex-shrink-0">
              {currentProfile.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {new Date().toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  Daily Execution Loop
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-navy tracking-tight mt-0.5 flex items-center gap-2">
                <span>Welcome back,</span>
                <DecryptedText
                  text={currentProfile.name}
                  speed={35}
                  className="text-blue font-black"
                />
              </h1>
            </div>
          </div>

          {/* Elevated Stat Badges */}
          <div className="flex items-center flex-wrap gap-3">
            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              className="bg-white border border-slate-200/90 shadow-sm p-2 px-3.5 rounded-2xl flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-orange/15 flex items-center justify-center text-orange">
                <FlameIcon size={18} className="text-orange" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Current Streak</span>
                <span className="text-sm font-extrabold text-orange font-mono">
                  <NumberTicker value={currentProfile.streak_count} suffix=" Days" />
                </span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              className="bg-white border border-slate-200/90 shadow-sm p-2 px-3.5 rounded-2xl flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-blue/15 flex items-center justify-center text-blue">
                <StarIcon size={18} className="text-blue" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Study Points</span>
                <span className="text-sm font-extrabold text-blue font-mono">
                  <NumberTicker value={currentProfile.total_points} suffix=" pts" />
                </span>
              </div>
            </motion.div>

            <div className="bg-navy text-white px-4 py-2.5 rounded-2xl text-xs font-mono font-bold tracking-wide shadow-md shadow-navy/20 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentProfile.exam} Target</span>
            </div>
          </div>
        </div>
      </BlurFade>

      {/* 2. Hero Execution Summary Banner with Radial Glow */}
      <BlurFade delay={0.1}>
        <div className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#0B1F3A] via-[#162E52] to-[#0B1F3A] text-white flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl shadow-navy/15 border border-blue-900/40">
          <div className="relative z-10 flex items-start sm:items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-blue/25 border border-sky-400/30 flex items-center justify-center text-sky shadow-inner flex-shrink-0">
              <ClockIcon size={26} className="text-sky" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold tracking-wider uppercase text-sky">Weekly Progress Overview</span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky" />
                <span className="text-xs text-slate-300 font-medium">Auto-calibrated</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center flex-wrap gap-2">
                <span>You've executed</span>
                <span className="text-sky font-mono font-black text-2xl sm:text-3xl">{totalExecuted.toFixed(0)}</span>
                <span>of</span>
                <span className="text-slate-300 font-mono font-black text-2xl sm:text-3xl">{totalPlanned.toFixed(0)}</span>
                <span>planned hours this {timeRange === '7' ? 'week' : 'month'}.</span>
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                PrepSaathi measures the execution gap daily so your tomorrow adapts to what you actually achieved today.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-4 self-start md:self-auto flex-shrink-0">
            <div className="bg-white/10 backdrop-blur-md p-3.5 px-5 rounded-2xl border border-white/15 flex flex-col items-center shadow-inner">
              <span className="text-[11px] text-slate-300 uppercase tracking-wider font-extrabold">Execution Deficit</span>
              <span className="text-xl sm:text-2xl font-black text-orange-400 font-mono mt-0.5">
                {overallGapPct}% deficit
              </span>
            </div>
          </div>
        </div>
      </BlurFade>

      {/* 3. Balanced Grid: Primary Column (2 cols) vs Secondary Column (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* PRIMARY COLUMN */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero Chart — Execution Gap with BorderBeam and Elevated Card Surface */}
          <BlurFade delay={0.15}>
            <div className="relative bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-7 sm:p-8 overflow-hidden">
              <BorderBeam size={240} duration={14} colorFrom="#2563EB" colorTo="#60A5FA" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-extrabold text-navy tracking-tight">Execution Gap Analysis</h2>
                    <Badge variant="alert">Core Hero Metric</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Planned vs Executed study hours. The shaded orange area shows lost preparation momentum.
                  </p>
                </div>

                {/* Range Toggle */}
                <div className="flex items-center rounded-2xl bg-slate-100 p-1.5 border border-slate-200 text-xs self-start sm:self-auto font-semibold shadow-inner">
                  <button
                    type="button"
                    onClick={() => setTimeRange('7')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      timeRange === '7'
                        ? 'bg-white text-blue shadow-sm font-bold'
                        : 'text-slate-600 hover:text-navy'
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeRange('30')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      timeRange === '30'
                        ? 'bg-white text-blue shadow-sm font-bold'
                        : 'text-slate-600 hover:text-navy'
                    }`}
                  >
                    Last 30 Days (Narrowing Story)
                  </button>
                </div>
              </div>

              {/* Chart Area */}
              {liteMode ? (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-navy block mb-3 uppercase tracking-wider">
                    [Lite Mode Active] Daily Execution Table
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {displayLogs.slice(-8).map((log, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                        <span className="font-bold text-navy block">{log.dayLabel}</span>
                        <div className="text-grey text-[11px] mt-1">Planned: {log.planned_hrs}h</div>
                        <div className="text-blue font-bold text-[11px]">Executed: {log.actual_hrs}h</div>
                        <div className="text-orange text-[10px] font-semibold">Gap: {log.gap_hrs}h</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-84 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayLogs} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gapFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F97316" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#F97316" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="executedFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="dayLabel"
                        stroke="#94A3B8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: '#CBD5E1' }}
                      />
                      <YAxis
                        stroke="#94A3B8"
                        fontSize={12}
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
                              <div className="bg-[#0B1F3A]/95 backdrop-blur-md text-white text-xs p-4 rounded-2xl shadow-2xl border border-slate-700 space-y-2 min-w-[190px]">
                                <p className="font-extrabold text-sky text-sm border-b border-white/10 pb-1.5">{data.dayLabel}</p>
                                <div className="flex justify-between gap-4 text-slate-300">
                                  <span>Planned Hours:</span>
                                  <span className="font-mono font-semibold text-white">{data.planned_hrs} hrs</span>
                                </div>
                                <div className="flex justify-between gap-4 text-slate-300">
                                  <span>Executed Hours:</span>
                                  <span className="font-mono font-bold text-sky-300">{data.actual_hrs} hrs</span>
                                </div>
                                <div className="flex justify-between gap-4 pt-1.5 border-t border-white/15 text-orange font-bold text-sm">
                                  <span>Execution Gap:</span>
                                  <span className="font-mono">{data.gap_hrs} hrs</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="planned_hrs"
                        stroke="#94A3B8"
                        strokeWidth={2.5}
                        strokeDasharray="5 5"
                        fill="url(#gapFill)"
                        name="Planned Hours"
                      />
                      <Area
                        type="monotone"
                        dataKey="actual_hrs"
                        stroke="#2563EB"
                        strokeWidth={3.5}
                        fill="url(#executedFill)"
                        name="Executed Hours"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* 3 Metric Cards Below Chart */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 text-center">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Total Planned
                  </span>
                  <span className="text-2xl font-black text-navy font-mono mt-1 block">
                    <NumberTicker value={totalPlanned} decimalPlaces={1} suffix="h" />
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue block">
                    Total Executed
                  </span>
                  <span className="text-2xl font-black text-blue-700 font-mono mt-1 block">
                    <NumberTicker value={totalExecuted} decimalPlaces={1} suffix="h" />
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange block">
                    Execution Gap
                  </span>
                  <span className="text-2xl font-black text-orange-600 font-mono mt-1 block">
                    <NumberTicker value={overallGapPct} suffix="%" />
                  </span>
                </div>
              </div>

              {timeRange === '30' && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between"
                >
                  <span className="text-sm">
                    📈 <strong>The Execution Thesis:</strong> Over the last 30 days, your gap narrowed from <strong>55% down to 22%</strong>.
                  </span>
                  <span className="font-extrabold text-emerald-700 uppercase tracking-wider text-xs bg-emerald-100 px-3 py-1 rounded-xl">
                    Loop Validated
                  </span>
                </motion.div>
              )}
            </div>
          </BlurFade>

          {/* Today's Adaptive Plan Section with Elevated Individual Cards */}
          <BlurFade delay={0.2}>
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-7 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-extrabold text-navy tracking-tight">Today's Adaptive Plan</h2>
                    <Badge variant="primary">
                      <SparklesIcon size={13} className="text-blue" />
                      <span>Grounded AI Engine</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Target: <strong className="text-navy">{currentProfile.daily_target_hrs} hours</strong>. Scheduled dynamically from your measured diagnostic weak spots.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/plan')}
                  className="text-xs font-extrabold text-blue hover:text-blue/80 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer bg-blue/10 px-3.5 py-1.5 rounded-xl hover:bg-blue/15"
                >
                  <span>Full Timetable</span>
                  <ArrowRightIcon size={12} />
                </button>
              </div>

              {/* Individual Task Cards */}
              <div className="space-y-4">
                {tasks.map((task, idx) => (
                  <SpotlightCard
                    key={idx}
                    spotlightColor="rgba(37, 99, 235, 0.08)"
                    className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                      task.completed
                        ? 'border-emerald-300 bg-emerald-50/70 shadow-sm'
                        : 'border-slate-200/90 bg-white hover:border-blue-400 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
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
                              ? '#1 Weakest Area'
                              : (task.masteryScore ?? 50) <= 70
                              ? 'Reinforcement'
                              : 'Revision'}
                            {' '}({task.masteryScore}%)
                          </Badge>
                          {task.completed && (
                            <span className="text-[11px] font-extrabold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-xs">
                              <CheckIcon size={11} />
                              <span>Completed</span>
                            </span>
                          )}
                        </div>

                        <h3 className="font-extrabold text-base sm:text-lg text-navy">{task.topic}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed font-normal">{task.task}</p>

                        <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/70 text-xs text-blue-950 font-medium">
                          🎯 <strong>AI Rationale:</strong> {task.why}
                        </div>
                      </div>

                      {/* Actions and Duration */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                          <ClockIcon size={14} className="text-slate-500" />
                          <span>{task.minutes}m</span>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          type="button"
                          onClick={() => handleStartTask(idx)}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md cursor-pointer ${
                            task.completed
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              : 'bg-blue text-white hover:bg-blue/90 shadow-blue/20'
                          }`}
                        >
                          {task.completed ? 'Review Session' : 'Start Task →'}
                        </motion.button>
                      </div>
                    </div>
                  </SpotlightCard>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Completed 2 of 3 daily targets</span>
                <button
                  type="button"
                  onClick={() => navigate('/plan')}
                  className="font-bold text-blue hover:underline cursor-pointer"
                >
                  Go to Active Study Workspace →
                </button>
              </div>
            </div>
          </BlurFade>
        </div>

        {/* SECONDARY COLUMN */}
        <div className="space-y-6">
          {/* Daily Goals Card */}
          <BlurFade delay={0.25}>
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-navy tracking-tight">Daily Execution Goals</h3>
                  <p className="text-xs text-slate-400 mt-0.5">3 tasks allocated today</p>
                </div>
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-3 py-1 rounded-full shadow-xs">
                  2 of 3 Done
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <motion.div
                  whileHover={{ x: 3 }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200"
                >
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <CheckIcon size={12} />
                  </span>
                  <span className="line-through text-slate-500 font-medium flex-1">
                    Relative Motion train problems (45m)
                  </span>
                </motion.div>

                <motion.div
                  whileHover={{ x: 3 }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200"
                >
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <CheckIcon size={12} />
                  </span>
                  <span className="line-through text-slate-500 font-medium flex-1">
                    20 Syllogism drill sets (30m)
                  </span>
                </motion.div>

                <motion.div
                  whileHover={{ x: 3 }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs"
                >
                  <span className="w-6 h-6 rounded-full border-2 border-slate-300 flex-shrink-0" />
                  <span className="text-navy font-bold flex-1">
                    Reading Comprehension timed session (40m)
                  </span>
                </motion.div>
              </div>
            </div>
          </BlurFade>

          {/* Squad Snapshot Card */}
          <BlurFade delay={0.3}>
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-navy tracking-tight">Squad Snapshot</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Cohort peer accountability</p>
                </div>
                <span className="text-xs font-bold text-orange bg-orange/15 px-2.5 py-0.5 rounded-lg border border-orange/25">
                  SSC CGL #4
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-medium">Checked in today:</span>
                  <span className="font-extrabold text-emerald-700 font-mono text-sm">4 of 6 members</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-medium">Average squad streak:</span>
                  <span className="font-extrabold text-orange font-mono text-sm flex items-center gap-1">
                    <FlameIcon size={14} className="text-orange" />
                    <span>11.2 days</span>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-orange-50/80 border border-orange-200 text-xs text-orange-950 font-medium leading-relaxed">
                  <strong>Loss Aversion active:</strong> 2 peers are pending proof submission before 23:59.
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => navigate('/squad')}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-navy font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>View Squad Accountability Board</span>
                <ArrowRightIcon size={13} />
              </motion.button>
            </div>
          </BlurFade>

          {/* Quick Actions Card with Rich Tactile Tiles */}
          <BlurFade delay={0.35}>
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 sm:p-7 space-y-4">
              <div>
                <h3 className="font-extrabold text-base text-navy tracking-tight">Quick Actions</h3>
                <p className="text-xs text-slate-400 mt-0.5">Jump directly into the daily loop</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                <motion.button
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => navigate('/library')}
                  className="p-4 rounded-2xl bg-blue-50/80 hover:bg-blue-100 border border-blue-200 text-blue-800 flex flex-col items-center gap-2.5 transition text-center cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue/15 flex items-center justify-center text-blue">
                    <UploadIcon size={20} className="text-blue" />
                  </div>
                  <span>Upload Document</span>
                </motion.button>

                <motion.button
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => navigate('/quiz')}
                  className="p-4 rounded-2xl bg-orange-50/80 hover:bg-orange-100 border border-orange-200 text-orange-800 flex flex-col items-center gap-2.5 transition text-center cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange/15 flex items-center justify-center text-orange">
                    <QuizIcon size={20} className="text-orange" />
                  </div>
                  <span>Take Quiz</span>
                </motion.button>

                <motion.button
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => navigate('/proof')}
                  className="p-4 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 flex flex-col items-center gap-2.5 transition text-center cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/15 flex items-center justify-center text-emerald-700">
                    <ProofIcon size={20} className="text-emerald-700" />
                  </div>
                  <span>Submit Proof</span>
                </motion.button>

                <motion.button
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => setShowLogModal(true)}
                  className="p-4 rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 flex flex-col items-center gap-2.5 transition text-center cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center text-navy">
                    <ClockIcon size={20} className="text-navy" />
                  </div>
                  <span>Log Hours</span>
                </motion.button>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>

      {/* 4. Secondary Consistency & Accuracy Progression Curve */}
      <BlurFade delay={0.4}>
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-7 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-navy tracking-tight">
                Consistency & Accuracy Progression Curve
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Correlating weekly study discipline with diagnostic test accuracy scores.
              </p>
            </div>
            <div className="flex items-center gap-5 text-xs font-bold">
              <span className="flex items-center gap-2 text-blue">
                <span className="w-4 h-1.5 bg-blue rounded-full inline-block" /> Accuracy %
              </span>
              <span className="flex items-center gap-2 text-orange">
                <span className="w-4 h-1.5 bg-orange rounded-full inline-block" /> Consistency %
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ACCURACY_CONSISTENCY_DATA} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="week" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="#2563EB" strokeWidth={3} name="Accuracy %" />
                <Line type="monotone" dataKey="consistency" stroke="#F97316" strokeWidth={3} name="Consistency %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </BlurFade>

      {/* Manual Hours Log Modal */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl max-w-sm w-full p-7 shadow-2xl border border-slate-200"
            >
              <h3 className="text-xl font-extrabold text-navy tracking-tight mb-1">Log Executed Study Hours</h3>
              <p className="text-xs text-slate-500 mb-5">
                Enter hours studied today to update your execution gap live.
              </p>

              <div className="mb-5">
                <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
                  Hours Studied Today
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="16"
                  value={logHoursInput}
                  onChange={(e) => setLogHoursInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-navy font-black text-2xl focus:ring-2 focus:ring-blue focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs text-slate-500 hover:text-navy font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleManualHourLog}
                  className="px-5 py-2.5 rounded-xl bg-blue hover:bg-blue/90 text-white font-bold text-xs shadow-md shadow-blue/20 cursor-pointer"
                >
                  Save & Update Gap
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
