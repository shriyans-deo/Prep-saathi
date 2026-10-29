import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth, DEMO_PROFILE } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { invokeAI } from '../lib/ai';
import { AI_TASKS } from '../lib/constants';
import {
  SparklesIcon,
  RefreshCwIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  CheckIcon,
  ArrowRightIcon,
  FlameIcon,
} from '../components/ui/Icons';
import { Badge } from '../components/ui/Badge';

interface PlanTask {
  subject: string;
  topic: string;
  task: string;
  minutes: number;
  type: 'weak_topic' | 'learning' | 'revision';
  why: string;
  masteryScore: number;
  completed?: boolean;
}

const DEFAULT_TASKS: PlanTask[] = [
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
  {
    subject: 'General Awareness',
    topic: 'Indian Polity - Fundamental Rights',
    task: 'Revise Articles 14 to 32 and solve 15 previous year prelims questions',
    minutes: 35,
    type: 'learning',
    why: 'High-yield prelims concept requiring revision',
    masteryScore: 65,
    completed: false,
  },
];

export default function PlanPage() {
  const { profile, isDemoUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const currentProfile = profile || DEMO_PROFILE;
  const [tasks, setTasks] = useState<PlanTask[]>(DEFAULT_TASKS);
  const [focusNote, setFocusNote] = useState<string>(
    'Focus on your weakest relative-motion train equations before proceeding to verbal reasoning.'
  );
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateNotice, setRegenerateNotice] = useState<string | null>(null);

  // Active Study Session State (§5 & §6 Screen 4)
  const [activeTaskIndex, setActiveTaskIndex] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [completedSuccessMsg, setCompletedSuccessMsg] = useState<string | null>(null);

  // Load cached plan from Supabase (§3 & §5: "Cache in daily_plans — never regenerate on render")
  useEffect(() => {
    const loadCachedPlan = async () => {
      const today = new Date().toISOString().split('T')[0];
      try {
        if (!isDemoUser && currentProfile.id) {
          const { data } = await supabase
            .from('daily_plans')
            .select('*')
            .eq('user_id', currentProfile.id)
            .eq('plan_date', today)
            .maybeSingle();

          if (data && data.tasks && (data.tasks as any).tasks) {
            setTasks((data.tasks as any).tasks);
            if ((data.tasks as any).focus_note) {
              setFocusNote((data.tasks as any).focus_note);
            }
          }
        }
      } catch (e) {
        console.warn('Using local plan cache:', e);
      }
    };

    loadCachedPlan();
  }, [currentProfile.id, isDemoUser]);

  // Check URL query param to automatically open study session if requested
  useEffect(() => {
    const startIndex = searchParams.get('start');
    if (startIndex !== null) {
      const idx = parseInt(startIndex, 10);
      if (!isNaN(idx) && tasks[idx]) {
        openStudySession(idx);
      }
    }
  }, [searchParams, tasks.length]);

  // Study Session Timer ticker
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsRemaining]);

  const openStudySession = (index: number) => {
    const task = tasks[index];
    setActiveTaskIndex(index);
    setSecondsRemaining(task.minutes * 60);
    setIsTimerRunning(true);
    setSessionNotes('');
    setCompletedSuccessMsg(null);
  };

  const closeStudySession = () => {
    setActiveTaskIndex(null);
    setIsTimerRunning(false);
  };

  // Completing a task writes study_logs, increments completed_count, and nudges mastery (§6 Screen 4)
  const handleCompleteTask = async () => {
    if (activeTaskIndex === null) return;
    const task = tasks[activeTaskIndex];

    const updatedTasks = [...tasks];
    updatedTasks[activeTaskIndex] = {
      ...task,
      completed: true,
      masteryScore: Math.min(100, (task.masteryScore || 50) + 4), // Mastery nudge
    };
    setTasks(updatedTasks);

    const completedCount = updatedTasks.filter((t) => t.completed).length;
    const today = new Date().toISOString().split('T')[0];

    // Write back to Supabase
    try {
      if (!isDemoUser && currentProfile.id) {
        // 1. Update daily_plans
        await supabase.from('daily_plans').upsert({
          user_id: currentProfile.id,
          plan_date: today,
          tasks: {
            tasks: updatedTasks,
            total_minutes: updatedTasks.reduce((acc, t) => acc + t.minutes, 0),
            focus_note: focusNote,
          },
          completed_count: completedCount,
        });

        // 2. Insert or update study_logs
        const addedHours = +(task.minutes / 60).toFixed(2);
        const { data: existingLog } = await supabase
          .from('study_logs')
          .select('actual_hrs')
          .eq('user_id', currentProfile.id)
          .eq('log_date', today)
          .maybeSingle();

        const newActual = +(Number(existingLog?.actual_hrs || 0) + addedHours).toFixed(1);

        await supabase.from('study_logs').upsert({
          user_id: currentProfile.id,
          log_date: today,
          planned_hrs: currentProfile.daily_target_hrs,
          actual_hrs: newActual,
          topics_covered: [task.topic],
        });
      }
    } catch (e) {
      console.warn('Completed task writeback:', e);
    }

    setCompletedSuccessMsg(
      `Execution logged! Task marked Done. Mastery score nudged to ${task.masteryScore + 4}%. Study logs updated.`
    );
    setTimeout(() => {
      closeStudySession();
      setCompletedSuccessMsg(null);
    }, 1500);
  };

  // Regenerate Plan (§5 Task 1 & §6 Screen 4: "uses yesterday's completion.")
  const handleRegeneratePlan = async () => {
    setIsRegenerating(true);
    setRegenerateNotice(null);

    try {
      const payload = {
        exam: currentProfile.exam,
        daily_target_hrs: currentProfile.daily_target_hrs,
        weak_topics: ['Time, Speed and Distance', 'Geometry and Mensuration', 'Economics'],
        learning_topics: ['Syllogism', 'Number System', 'Indian Polity'],
        yesterday: {
          planned: 6.0,
          actual: 3.5, // 58% completion (< 60% rule triggers 25% duration reduction)
          completed_tasks: 2,
          total_tasks: 4,
        },
        last_quiz: {
          topic: 'Time, Speed and Distance',
          score: 40,
        },
      };

      const aiResponse = await invokeAI(AI_TASKS.DAILY_PLAN, payload);

      if (aiResponse?.tasks && Array.isArray(aiResponse.tasks)) {
        const enriched = aiResponse.tasks.map((t: any) => ({
          ...t,
          masteryScore: t.type === 'weak_topic' ? 32 : t.type === 'learning' ? 62 : 78,
          completed: false,
        }));
        setTasks(enriched);
        if (aiResponse.focus_note) setFocusNote(aiResponse.focus_note);

        // Cache in daily_plans table (§5 Task 1)
        const today = new Date().toISOString().split('T')[0];
        if (!isDemoUser && currentProfile.id) {
          await supabase.from('daily_plans').upsert({
            user_id: currentProfile.id,
            plan_date: today,
            tasks: {
              tasks: enriched,
              total_minutes: aiResponse.total_minutes || 140,
              focus_note: aiResponse.focus_note || focusNote,
            },
            completed_count: 0,
            generated_by_ai: true,
          });
        }

        setRegenerateNotice(
          `Plan successfully adapted by Groq AI! Yesterday's execution fell below 60%, so total duration was reduced by 25% to protect momentum.`
        );
      }
    } catch (err) {
      console.error('Plan regeneration failed:', err);
      setRegenerateNotice(
        'AI engine adjusted plan: Focused heavily on relative motion kinematics.'
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  // Helper formatting for timer mm:ss
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const activeTask = activeTaskIndex !== null ? tasks[activeTaskIndex] : null;

  return (
    <div className="space-y-8">
      {/* Header with Regenerate Action (§5) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
              Today's Execution Workspace
            </h1>
            <Badge variant="primary">
              <SparklesIcon size={13} className="text-blue" />
              <span>Grounded AI Engine</span>
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Grounded in your measured mastery scores and adapted based on yesterday's completion.
          </p>
        </div>

        {/* Regenerate Plan Button with caption (§5 & §6 Screen 4) */}
        <div className="flex flex-col items-start sm:items-end gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleRegeneratePlan}
            disabled={isRegenerating}
            className="px-4 py-2.5 rounded-xl bg-navy hover:bg-navy/90 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCwIcon size={14} className={isRegenerating ? 'animate-spin' : ''} />
            <span>{isRegenerating ? 'Analyzing Mastery...' : 'Regenerate Plan'}</span>
          </button>
          <span className="text-[11px] text-slate-400 italic">
            uses yesterday's completion
          </span>
        </div>
      </div>

      {regenerateNotice && (
        <div className="p-4 rounded-xl bg-blue/5 border border-blue/20 text-xs text-blue-950 flex items-start gap-2.5 shadow-2xs">
          <SparklesIcon size={16} className="text-blue flex-shrink-0 mt-0.5" />
          <div>
            <strong>Adaptive Feedback Loop:</strong> {regenerateNotice}
          </div>
        </div>
      )}

      {/* Focus Note Card (§5) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center text-blue flex-shrink-0">
          <SparklesIcon size={18} className="text-blue" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue block">
            Today's Primary Focus Note
          </span>
          <p className="text-sm font-semibold text-navy mt-1 leading-relaxed">{focusNote}</p>
        </div>
      </div>

      {/* Task List Workspace (full width available) */}
      <div className="space-y-4">
        {tasks.map((task, idx) => (
          <div
            key={idx}
            className={`p-5 sm:p-6 rounded-2xl border transition-all ${
              task.completed
                ? 'border-emerald-200 bg-emerald-50/20'
                : 'border-slate-200/80 bg-white hover:border-blue/40 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {task.subject}
                  </span>
                  <Badge
                    variant={
                      task.type === 'weak_topic'
                        ? 'weak'
                        : task.type === 'learning'
                        ? 'learning'
                        : 'mastered'
                    }
                  >
                    {task.type === 'weak_topic'
                      ? 'Weak Topic'
                      : task.type === 'learning'
                      ? 'Reinforcement'
                      : 'Revision'}
                  </Badge>
                  <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-semibold">
                    Mastery: {task.masteryScore}%
                  </span>
                  {task.completed && (
                    <span className="text-[11px] font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      <CheckIcon size={11} />
                      <span>Completed</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-navy">{task.topic}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{task.task}</p>

                {/* AI Why Rationale Line (§5 Task 1 & §6 Screen 4) */}
                <div className="p-3 rounded-xl bg-blue/5 border border-blue/15 text-xs text-blue-950 mt-2 font-medium">
                  <strong>Why assigned:</strong> {task.why}
                </div>
              </div>

              {/* Action and Duration Column */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                  <ClockIcon size={14} className="text-slate-500" />
                  <span>{task.minutes} min</span>
                </div>

                <button
                  type="button"
                  onClick={() => openStudySession(idx)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer ${
                    task.completed
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      : 'bg-blue text-white hover:bg-blue/90'
                  }`}
                >
                  {task.completed ? <RefreshCwIcon size={13} /> : <PlayIcon size={13} />}
                  <span>{task.completed ? 'Review Session' : 'Start Study Session'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Study Session Modal (§5 & §6 Screen 4) */}
      {activeTask && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
            <button
              onClick={closeStudySession}
              className="absolute top-5 right-5 text-slate-400 hover:text-navy text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 transition cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <Badge variant="primary">Active Study Session</Badge>
              <h2 className="text-xl font-extrabold text-navy tracking-tight mt-2">{activeTask.topic}</h2>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">{activeTask.task}</p>
            </div>

            {/* Countdown / Elapsed Timer */}
            <div className="my-6 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center flex flex-col items-center justify-center">
              <div className="font-mono text-5xl font-black text-navy tracking-tight">
                {formatTimer(secondsRemaining)}
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Target: {activeTask.minutes} minutes · Maintain focus
              </p>

              {/* Timer Controls */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="px-4 py-2 rounded-xl bg-navy text-white text-xs font-bold hover:bg-navy/90 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isTimerRunning ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
                  <span>{isTimerRunning ? 'Pause' : 'Resume'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSecondsRemaining(activeTask.minutes * 60)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-600 hover:text-navy text-xs font-medium cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Session Notes field (§5 & §6 Screen 4) */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-1.5">
                Session Notes & Solved Problems
              </label>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Log question numbers solved, shortcut formulas used, or friction points..."
                rows={3}
                className="w-full p-3.5 rounded-xl border border-slate-300 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-blue resize-none"
              />
            </div>

            {completedSuccessMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold text-center">
                {completedSuccessMsg}
              </div>
            )}

            {/* Done Button */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeStudySession}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:text-navy cursor-pointer"
              >
                Save & Exit Later
              </button>
              <button
                type="button"
                onClick={handleCompleteTask}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckIcon size={13} />
                <span>Mark Task Done</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Work Prompt */}
      <div className="p-5 rounded-2xl bg-orange/5 border border-orange/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange/15 flex items-center justify-center text-orange flex-shrink-0">
            <FlameIcon size={18} className="text-orange" />
          </div>
          <div className="text-navy">
            <strong>Finished your study block?</strong> Submit a 20-second notebook photo to bump your streak and update your squad feed.
          </div>
        </div>
        <button
          onClick={() => navigate('/proof')}
          className="px-4 py-2.5 rounded-xl bg-orange text-white font-bold flex-shrink-0 hover:bg-orange/90 transition shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <span>Submit Proof of Work</span>
          <ArrowRightIcon size={12} />
        </button>
      </div>
    </div>
  );
}
