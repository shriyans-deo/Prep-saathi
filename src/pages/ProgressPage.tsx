import { useState, useEffect } from 'react';
import { useAuth, DEMO_PROFILE } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { invokeAI } from '../lib/ai';
import { AI_TASKS } from '../lib/constants';
import {
  SparklesIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
} from '../components/ui/Icons';
import { Badge } from '../components/ui/Badge';

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

  // Fetch live mastery from Supabase if available
  useEffect(() => {
    const fetchLiveMastery = async () => {
      if (isDemoUser) return;
      try {
        const { data, error } = await supabase
          .from('mastery')
          .select('score, status, topics(subject, topic_name)')
          .order('score', { ascending: true })
          .limit(12);

        if (!error && data && data.length > 0) {
          const formatted: TopicMastery[] = data.map((m: any) => ({
            subject: m.topics?.subject || 'Quantitative Aptitude',
            topic: m.topics?.topic_name || 'Topic',
            score: m.score,
            status: m.status,
          }));
          setMasteryList(formatted);
        }
      } catch (e) {
        console.warn('Mastery list fallback:', e);
      }
    };

    fetchLiveMastery();
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

  return (
    <div className="space-y-8">
      {/* Header */}
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
      </div>

      {/* 1. WEEKLY AI REFLECTION CARD (§10 & §5 Task 4) */}
      <div className="bg-navy text-white rounded-2xl shadow-sm border border-navy/40 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
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

          <button
            type="button"
            disabled={isGeneratingReflection}
            onClick={handleRefreshReflection}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/15 flex items-center gap-2 cursor-pointer self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCwIcon size={13} className={isGeneratingReflection ? 'animate-spin' : ''} />
            <span>{isGeneratingReflection ? 'Analyzing Pattern...' : 'Re-analyze Week'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Pattern line (§5 & §10: "The pattern line is the single most quotable AI output in the product") */}
          <div className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <span className="text-orange font-extrabold uppercase tracking-wider text-[11px] block">
              Behavioral Pattern Detected
            </span>
            <p className="text-slate-200 font-semibold leading-relaxed text-sm">
              "{reflection.pattern}"
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <span className="text-emerald-400 font-extrabold uppercase tracking-wider text-[11px] block">
              Measured Mastery Win
            </span>
            <p className="text-slate-200 font-semibold leading-relaxed text-sm">
              "{reflection.win}"
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <span className="text-sky font-extrabold uppercase tracking-wider text-[11px] block">
              Next Week's Constraint Focus
            </span>
            <p className="text-slate-200 font-semibold leading-relaxed text-sm">
              "{reflection.next_week_focus}"
            </p>
          </div>
        </div>
      </div>

      {/* 2. TOPIC MASTERY BARS (§10 & §8 Chart 2) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-8 space-y-5">
        <div>
          {/* Required Framing (§10: "Can you name your three weakest topics?") */}
          <Badge variant="alert">
            <AlertTriangleIcon size={12} className="text-orange" />
            <span>Aspirant Interview Framing</span>
          </Badge>
          <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight mt-2">
            Can you name your three weakest topics?
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Most aspirants cannot. PrepSaathi ranks all 12 syllabus topics ascending by score, dynamically highlighting where your next daily plan will focus.
          </p>
        </div>

        <div className="flex items-center gap-5 text-xs font-semibold pt-1 border-b border-slate-100 pb-3">
          <span className="flex items-center gap-1.5 text-red-600">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Weak (&lt;40%)
          </span>
          <span className="flex items-center gap-1.5 text-amber-600">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Learning (40–70%)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Mastered (&gt;70%)
          </span>
        </div>

        {/* 12 Rows sorted ascending by score (§8 Chart 2) */}
        <div className="space-y-3 pt-1">
          {masteryList.map((m, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-navy truncate max-w-sm sm:max-w-md">
                  {idx < 3 && <span className="text-red-600 font-extrabold mr-1.5">#{idx + 1} Weakest:</span>}
                  {m.topic} <span className="text-slate-400 font-normal text-[11px]">({m.subject})</span>
                </span>
                <span className="font-mono font-bold text-slate-800 text-sm">{m.score}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    m.score < 40
                      ? 'bg-red-500'
                      : m.score <= 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${m.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 30-DAY STREAK HEATMAP (§10 & §8 Chart 3) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-8 space-y-5">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-navy tracking-tight">
            30-Day Execution Density Heatmap
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            30 cells in a 5×6 grid. Opacity scales with hours logged. Empty cells are visibly grey, making preparation gaps obvious.
          </p>
        </div>

        {/* 5x6 Grid (§8 Chart 3) */}
        <div className="grid grid-cols-6 gap-2.5 pt-2">
          {heatmap.map((cell, idx) => {
            const isZero = cell.hours === 0;
            const bgClass = isZero
              ? 'bg-slate-200 text-slate-400 border-slate-200'
              : cell.hours < 3
              ? 'bg-blue/30 text-blue font-semibold border-blue/20'
              : cell.hours < 4.5
              ? 'bg-blue/70 text-white font-bold border-blue/40'
              : 'bg-blue text-white font-bold border-blue/60';

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-center flex flex-col justify-between h-20 transition-all ${bgClass}`}
              >
                <span className="text-[10px] block opacity-80">{cell.label}</span>
                <span className="font-mono text-sm tracking-tight font-extrabold">
                  {isZero ? 'Gap' : `${cell.hours}h`}
                </span>
                <span className="text-[9px] uppercase tracking-wider opacity-75">
                  {isZero ? '0 hrs' : cell.hours >= 4.5 ? 'Target Met' : 'Partial'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
          <span>Less Execution</span>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300" title="0h" />
            <span className="w-3.5 h-3.5 rounded bg-blue/30" title="<3h" />
            <span className="w-3.5 h-3.5 rounded bg-blue/70" title="3-4.5h" />
            <span className="w-3.5 h-3.5 rounded bg-blue" title=">4.5h" />
          </div>
          <span>Target Met (&gt;4.5h)</span>
        </div>
      </div>
    </div>
  );
}
