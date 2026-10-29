import { useState, useEffect } from 'react';
import { useAuth, DEMO_PROFILE } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { invokeAI } from '../lib/ai';
import { AI_TASKS } from '../lib/constants';
import {
  SparklesIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckIcon,
  ClockIcon,
  FlameIcon,
} from '../components/ui/Icons';
import { Badge } from '../components/ui/Badge';
import { Spotlight } from '../components/aceternity/Spotlight';
import { NumberTicker } from '../components/magicui/NumberTicker';
import { BlurFade } from '../components/magicui/BlurFade';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import { useGsapTimeline, gsap } from '../lib/gsap';
import { motion } from 'motion/react';

interface TopicMastery {
  subject: string;
  topic: string;
  score: number;
  status: 'weak' | 'learning' | 'mastered';
}

interface HeatmapDay {
  date: string;
  hours: number;
  label: string;
}

// 12 Mastery Rows sorted ascending by score (§8 Chart 2: 3 red <40, 5 amber 40-70, 4 green >70)
const SEEDED_MASTERY: TopicMastery[] = [
  // 3 Red (<40)
  { subject: 'Quantitative Aptitude', topic: 'Time, Speed and Distance', score: 32, status: 'weak' },
  { subject: 'Quantitative Aptitude', topic: 'Geometry and Mensuration', score: 35, status: 'weak' },
  { subject: 'General Awareness', topic: 'Economics & Union Budget', score: 38, status: 'weak' },
  // 5 Amber (40-70)
  { subject: 'Quantitative Aptitude', topic: 'Number System', score: 48, status: 'learning' },
  { subject: 'Quantitative Aptitude', topic: 'Time and Work', score: 55, status: 'learning' },
  { subject: 'English', topic: 'Cloze Test & Phrasal Verbs', score: 58, status: 'learning' },
  { subject: 'Reasoning', topic: 'Syllogism', score: 62, status: 'learning' },
  { subject: 'General Awareness', topic: 'Indian Polity - Constitution', score: 65, status: 'learning' },
  // 4 Green (>70)
  { subject: 'General Awareness', topic: 'Modern Indian History', score: 75, status: 'mastered' },
  { subject: 'English', topic: 'Reading Comprehension', score: 78, status: 'mastered' },
  { subject: 'Quantitative Aptitude', topic: 'Profit and Loss', score: 82, status: 'mastered' },
  { subject: 'Reasoning', topic: 'Coding-Decoding', score: 88, status: 'mastered' },
];

// 30 Days Heatmap cells (§8 Chart 3: 30 cells in a 5x6 grid)
const SEEDED_HEATMAP: HeatmapDay[] = Array.from({ length: 30 }, (_, index) => {
  const i = 29 - index;
  const d = new Date();
  d.setDate(d.getDate() - i);
  let hours = 0;
  if (i >= 20) {
    hours = i % 3 === 0 ? 0 : 2.2;
  } else if (i >= 10) {
    hours = i % 5 === 0 ? 1.0 : 3.5;
  } else {
    hours = +(4.2 + (index % 4) * 0.3).toFixed(1);
  }
  return {
    date: d.toISOString().split('T')[0],
    hours,
    label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  };
});

export default function ProgressPage() {
  const { profile, isDemoUser } = useAuth();
  const currentProfile = profile || DEMO_PROFILE;

  const [masteryList, setMasteryList] = useState<TopicMastery[]>(SEEDED_MASTERY);
  const [heatmap] = useState<HeatmapDay[]>(SEEDED_HEATMAP);
  const [reflection, setReflection] = useState({
    headline: 'You planned 38 hours and executed 22 this week',
    pattern: 'Your execution gap concentrates on Thursday and Friday evenings',
    win: 'Syllogism accuracy jumped from 45% to 72% in diagnostic drills',
    next_week_focus: 'Lock in an unmovable 6:00 PM to 8:30 PM evening study block on weekdays',
  });
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);

  // GSAP Coordinated Timeline for Weekly Reflection Pillars
  const reflectionScopeRef = useGsapTimeline(() => {
    gsap.fromTo(
      '.gsap-reflection-col',
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.1, ease: 'power2.out' }
    );
  }, [reflection.headline]);

  // Fetch live mastery from Supabase if available
  useEffect(() => {
    let isMounted = true;
    const fetchLiveMastery = async () => {
      if (isDemoUser) return;
      try {
        const { data, error } = await supabase
          .from('mastery')
          .select('score, status, topics(subject, topic_name)')
          .order('score', { ascending: true })
          .limit(12);

        if (!error && data && data.length > 0 && isMounted) {
          const formatted: TopicMastery[] = data.map((m: any) => {
            const topicObj = Array.isArray(m.topics) ? m.topics[0] : m.topics;
            const numericScore = typeof m.score === 'number' && !isNaN(m.score) ? m.score : Number(m.score) || 0;
            const status: 'weak' | 'learning' | 'mastered' =
              m.status || (numericScore < 40 ? 'weak' : numericScore <= 70 ? 'learning' : 'mastered');

            return {
              subject: topicObj?.subject || 'Quantitative Aptitude',
              topic: topicObj?.topic_name || 'Topic',
              score: numericScore,
              status,
            };
          });
          setMasteryList(formatted);
        }
      } catch (e) {
        console.warn('Mastery list fallback:', e);
      }
    };

    fetchLiveMastery();
    return () => {
      isMounted = false;
    };
  }, [isDemoUser]);

  const handleRefreshReflection = async () => {
    setIsGeneratingReflection(true);
    try {
      const aiResponse = await invokeAI(AI_TASKS.WEEKLY_SUMMARY, {
        daily_logs: [
          { day: 'Mon', planned: 6, actual: 4.5 },
          { day: 'Tue', planned: 6, actual: 4.2 },
          { day: 'Wed', planned: 6, actual: 3.8 },
          { day: 'Thu', planned: 6, actual: 2.1 },
          { day: 'Fri', planned: 6, actual: 2.4 },
          { day: 'Sat', planned: 6, actual: 5.0 },
          { day: 'Sun', planned: 6, actual: 0.0 },
        ],
        tasks_completed: '16 of 22',
        quizzes: [40, 60, 60, 80],
      });

      if (aiResponse?.headline) {
        setReflection({
          headline: aiResponse.headline,
          pattern: aiResponse.pattern || reflection.pattern,
          win: aiResponse.win || reflection.win,
          next_week_focus: aiResponse.next_week_focus || reflection.next_week_focus,
        });
      }
    } catch (e) {
      console.warn('Reflection AI call:', e);
    } finally {
      setIsGeneratingReflection(false);
    }
  };

  const weakCount = masteryList.filter((m) => m.score < 40).length;
  const learningCount = masteryList.filter((m) => m.score >= 40 && m.score <= 70).length;
  const masteredCount = masteryList.filter((m) => m.score > 70).length;
  const activeDaysCount = heatmap.filter((h) => h.hours > 0).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <BlurFade delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
                Progress & Mastery Intelligence
              </h1>
              <Badge variant="neutral">
                <span>{currentProfile.exam}</span>
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Diagnostic concept metrics, 30-day streak density, and weekly AI behavioral retrospective.
            </p>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-navy">Adaptive Diagnostic Model Active</span>
          </div>
        </div>
      </BlurFade>

      {/* 1. WEEKLY AI REFLECTION CARD with Aceternity Spotlight and GSAP Timeline */}
      <BlurFade delay={0.1}>
        <div
          ref={reflectionScopeRef}
          className="relative overflow-hidden bg-navy text-white rounded-2xl shadow-sm border border-navy/40 p-6 sm:p-8 space-y-5"
        >
          <Spotlight className="-top-40 left-0 md:left-40 md:-top-20" fill="#60A5FA" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue/20 border border-blue/30 flex items-center justify-center text-sky">
                <SparklesIcon size={20} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky block">
                  Sunday AI Execution Reflection
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">{reflection.headline}</h2>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              disabled={isGeneratingReflection}
              onClick={handleRefreshReflection}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/15 flex items-center gap-2 cursor-pointer self-start sm:self-auto disabled:opacity-50 shadow-xs"
            >
              <RefreshCwIcon size={13} className={isGeneratingReflection ? 'animate-spin' : ''} />
              <span>{isGeneratingReflection ? 'Analyzing Pattern...' : 'Re-analyze Week'}</span>
            </motion.button>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="gsap-reflection-col p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 backdrop-blur-xs">
              <span className="text-orange font-extrabold uppercase tracking-wider text-[11px] block">
                Behavioral Pattern Detected
              </span>
              <p className="text-slate-200 font-semibold leading-relaxed text-sm">
                "{reflection.pattern}"
              </p>
            </div>

            <div className="gsap-reflection-col p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 backdrop-blur-xs">
              <span className="text-emerald-400 font-extrabold uppercase tracking-wider text-[11px] block">
                Measured Mastery Win
              </span>
              <p className="text-slate-200 font-semibold leading-relaxed text-sm">
                "{reflection.win}"
              </p>
            </div>

            <div className="gsap-reflection-col p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 backdrop-blur-xs">
              <span className="text-sky font-extrabold uppercase tracking-wider text-[11px] block">
                Next Week's Constraint Focus
              </span>
              <p className="text-slate-200 font-semibold leading-relaxed text-sm">
                "{reflection.next_week_focus}"
              </p>
            </div>
          </div>
        </div>
      </BlurFade>

      {/* 2-COLUMN RESPONSIVE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: TOPIC MASTERY BARS (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          <BlurFade delay={0.15}>
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-7 space-y-5">
              <div>
                <Badge variant="alert">
                  <AlertTriangleIcon size={12} className="text-orange" />
                  <span>Aspirant Interview Framing</span>
                </Badge>
                <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight mt-2">
                  Can you name your three weakest topics?
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Most aspirants cannot. PrepSaathi ranks all 12 syllabus topics ascending by diagnostic score, dynamically feeding your weakest concepts directly into tomorrow's priority daily plan.
                </p>
              </div>

              {/* Status Band Legend with Counts */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-1 border-b border-slate-100 pb-3">
                <span className="flex items-center gap-1.5 text-red-600 bg-red-50/60 px-2.5 py-1 rounded-lg border border-red-200/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  <span>Weak (&lt;40%): {weakCount}</span>
                </span>
                <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50/60 px-2.5 py-1 rounded-lg border border-amber-200/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>Learning (40–70%): {learningCount}</span>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50/60 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Mastered (&gt;70%): {masteredCount}</span>
                </span>
              </div>

              {/* 12 Rows sorted ascending by score */}
              <div className="space-y-3 pt-1">
                {masteryList.map((m, idx) => {
                  const isTopWeak = idx < 3;
                  const barColor =
                    m.score < 40
                      ? 'bg-red-500'
                      : m.score <= 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500';

                  return (
                    <SpotlightCard
                      key={idx}
                      spotlightColor="rgba(37, 99, 235, 0.05)"
                      className="p-3.5 bg-slate-50/60 border border-slate-200/80 rounded-xl space-y-2 transition-all hover:bg-slate-50 hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          {isTopWeak ? (
                            <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-extrabold text-[11px] border border-red-200 shrink-0">
                              #{idx + 1} Weakest
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[11px] shrink-0">
                              #{idx + 1}
                            </span>
                          )}
                          <span className="font-bold text-navy truncate">{m.topic}</span>
                          <span className="text-slate-400 text-[11px] hidden sm:inline truncate">
                            · {m.subject}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-800 text-sm shrink-0">
                          <NumberTicker value={m.score} suffix="%" />
                        </span>
                      </div>

                      <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${m.score}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.03 }}
                          className={`h-full rounded-full ${barColor}`}
                        />
                      </div>
                    </SpotlightCard>
                  );
                })}
              </div>
            </div>
          </BlurFade>

          {/* Closed-Loop Remediation Callout */}
          <BlurFade delay={0.2}>
            <div className="p-5 rounded-2xl bg-blue/5 border border-blue/20 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue text-white flex items-center justify-center shrink-0 shadow-xs">
                <ClockIcon size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-navy">Adaptive Closed-Loop Remediation</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tomorrow morning's 08:30 AM study block will automatically allocate 50 minutes to{' '}
                  <strong className="text-navy">{masteryList[0]?.topic || 'Time, Speed and Distance'}</strong>{' '}
                  (current mastery: {masteryList[0]?.score || 32}%) with an automated diagnostic drill to convert this weak area into active mastery.
                </p>
              </div>
            </div>
          </BlurFade>
        </div>

        {/* RIGHT COLUMN: 30-DAY HEATMAP & STATS (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 30-DAY STREAK HEATMAP */}
          <BlurFade delay={0.18}>
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-navy tracking-tight">
                    30-Day Execution Density
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    5×6 grid. Opacity scales with hours logged. Grey cells flag preparation gaps.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange/10 border border-orange/20 rounded-lg text-orange font-bold text-xs">
                  <FlameIcon size={14} className="text-orange" />
                  <span>{activeDaysCount}/30 Active</span>
                </div>
              </div>

              {/* 5x6 Grid */}
              <div className="grid grid-cols-6 gap-2 pt-1">
                {heatmap.map((cell, idx) => {
                  const isZero = cell.hours === 0;
                  const bgClass = isZero
                    ? 'bg-slate-100 text-slate-400 border-slate-200 hover:border-slate-300'
                    : cell.hours < 3
                    ? 'bg-blue/20 text-blue font-bold border-blue/20 hover:bg-blue/30'
                    : cell.hours < 4.5
                    ? 'bg-blue/70 text-white font-bold border-blue/40 hover:bg-blue/80'
                    : 'bg-blue text-white font-bold border-blue/60 hover:bg-blue-700';

                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.06 }}
                      className={`p-2 rounded-xl border text-center flex flex-col justify-between h-18 transition-all cursor-default shadow-2xs ${bgClass}`}
                      title={`${cell.label}: ${isZero ? 'Gap (0 hrs)' : `${cell.hours} hrs logged`}`}
                    >
                      <span className="text-[10px] block opacity-80 leading-none">{cell.label}</span>
                      <span className="font-mono text-xs sm:text-sm tracking-tight font-extrabold">
                        {isZero ? 'Gap' : `${cell.hours}h`}
                      </span>
                      <span className="text-[8px] uppercase tracking-wider opacity-75 leading-none">
                        {isZero ? '0h' : cell.hours >= 4.5 ? 'Met' : 'Part'}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                <span>0h (Gap)</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-sm bg-slate-100 border border-slate-200" title="0h gap" />
                  <span className="w-3.5 h-3.5 rounded-sm bg-blue/20 border border-blue/20" title="<3h" />
                  <span className="w-3.5 h-3.5 rounded-sm bg-blue/70" title="3-4.5h" />
                  <span className="w-3.5 h-3.5 rounded-sm bg-blue" title=">4.5h target met" />
                </div>
                <span>Target Met (&gt;4.5h)</span>
              </div>
            </div>
          </BlurFade>

          {/* MASTERY DISTRIBUTION & RETENTION CARD */}
          <BlurFade delay={0.22}>
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-7 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue" />
                <h3 className="text-base font-bold text-navy">Diagnostic Mastery Summary</h3>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-red-50/70 border border-red-200/70 rounded-xl">
                  <span className="text-xs text-red-600 font-bold block">Weak</span>
                  <span className="text-xl font-extrabold text-red-700 font-mono mt-0.5 block">{weakCount}</span>
                  <span className="text-[10px] text-red-500">&lt;40%</span>
                </div>
                <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl">
                  <span className="text-xs text-amber-700 font-bold block">Learning</span>
                  <span className="text-xl font-extrabold text-amber-800 font-mono mt-0.5 block">{learningCount}</span>
                  <span className="text-[10px] text-amber-600">40–70%</span>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl">
                  <span className="text-xs text-emerald-700 font-bold block">Mastered</span>
                  <span className="text-xl font-extrabold text-emerald-800 font-mono mt-0.5 block">{masteredCount}</span>
                  <span className="text-[10px] text-emerald-600">&gt;70%</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">30-Day Concept Retention (SM-2):</span>
                  <span className="font-bold text-navy font-mono">78%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue h-full rounded-full" style={{ width: '78%' }} />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckIcon size={14} className="text-emerald-500 shrink-0" />
                  <span>Next spaced diagnostic evaluation in <strong className="text-navy">3 days</strong></span>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </div>
  );
}
