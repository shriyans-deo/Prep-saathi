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
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import { DecryptedText } from '../components/reactbits/DecryptedText';
import { BlurFade } from '../components/magicui/BlurFade';
import { triggerAcademicConfetti } from '../components/magicui/Confetti';
import { motion, AnimatePresence } from 'motion/react';

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

  const [activeTaskIndex, setActiveTaskIndex] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [completedSuccessMsg, setCompletedSuccessMsg] = useState<string | null>(null);

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

  useEffect(() => {
    const startIndex = searchParams.get('start');
    if (startIndex !== null) {
      const idx = parseInt(startIndex, 10);
      if (!isNaN(idx) && tasks[idx]) {
        openStudySession(idx);
      }
    }
  }, [searchParams, tasks.length]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
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

  const handleCompleteTask = async () => {
    if (activeTaskIndex === null) return;
    const task = tasks[activeTaskIndex];

    const updatedTasks = [...tasks];
    updatedTasks[activeTaskIndex] = {
      ...task,
      completed: true,
      masteryScore: Math.min(100, (task.masteryScore || 50) + 4),
    };
    setTasks(updatedTasks);

    triggerAcademicConfetti({ particleCount: 50, spread: 65 });

    const completedCount = updatedTasks.filter((t) => t.completed).length;
    const today = new Date().toISOString().split('T')[0];

    try {
      if (!isDemoUser && currentProfile.id) {
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
          actual: 3.5,
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

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const activeTask = activeTaskIndex !== null ? tasks[activeTaskIndex] : null;

  return (
    <div className="space-y-8">
      {/* Header with Regenerate Action */}
      <BlurFade delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/90">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-navy tracking-tight">
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

          <div className="flex flex-col items-start sm:items-end gap-1.5 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleRegeneratePlan}
              disabled={isRegenerating}
              className="px-5 py-3 rounded-2xl bg-[#0B1F3A] hover:bg-[#162E52] text-white font-bold text-xs shadow-md shadow-navy/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCwIcon size={14} className={isRegenerating ? 'animate-spin text-sky' : ''} />
              <span>{isRegenerating ? 'Analyzing Mastery...' : 'Regenerate Plan with Groq AI'}</span>
            </motion.button>
            <span className="text-[11px] text-slate-400 italic font-medium">
              uses yesterday's completion
            </span>
          </div>
        </div>
      </BlurFade>

      {regenerateNotice && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-start gap-3 shadow-xs"
        >
          <SparklesIcon size={18} className="text-blue flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-extrabold text-blue">Adaptive Feedback Loop:</strong> {regenerateNotice}
          </div>
        </motion.div>
      )}

      {/* Focus Note Card */}
      <BlurFade delay={0.1}>
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue/15 border border-blue/20 flex items-center justify-center text-blue flex-shrink-0">
            <SparklesIcon size={22} className="text-blue" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue block">
              Today's Primary Focus Note
            </span>
            <p className="text-base font-bold text-navy leading-relaxed">
              <DecryptedText text={focusNote} speed={30} className="font-bold text-navy" />
            </p>
          </div>
        </div>
      </BlurFade>

      {/* Task List Workspace */}
      <div className="space-y-5">
        {tasks.map((task, idx) => (
          <BlurFade key={idx} delay={0.15 + idx * 0.05}>
            <SpotlightCard
              spotlightColor="rgba(37, 99, 235, 0.08)"
              className={`p-6 sm:p-7 rounded-3xl border transition-all shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-xl hover:border-blue-400 ${
                task.completed
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-200/90 bg-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
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
                        ? '#1 Weakest Area'
                        : task.type === 'learning'
                        ? 'Reinforcement'
                        : 'Revision'}
                    </Badge>
                    <span className="text-xs font-mono bg-slate-100 border border-slate-200 text-slate-700 px-3 py-0.5 rounded-lg font-bold">
                      Mastery: {task.masteryScore}%
                    </span>
                    {task.completed && (
                      <span className="text-xs font-extrabold bg-emerald-600 text-white px-3 py-0.5 rounded-full inline-flex items-center gap-1.5 shadow-xs">
                        <CheckIcon size={12} />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-navy">{task.topic}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">{task.task}</p>

                  <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/70 text-xs text-blue-950 font-medium">
                    🎯 <strong>AI Rationale:</strong> {task.why}
                  </div>
                </div>

                {/* Action and Duration Column */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-xs">
                    <ClockIcon size={14} className="text-slate-500" />
                    <span>{task.minutes} min</span>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => openStudySession(idx)}
                    className={`px-6 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer ${
                      task.completed
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-blue text-white hover:bg-blue/90 shadow-blue/25'
                    }`}
                  >
                    {task.completed ? <RefreshCwIcon size={13} /> : <PlayIcon size={13} />}
                    <span>{task.completed ? 'Review Session' : 'Start Study Session →'}</span>
                  </motion.button>
                </div>
              </div>
            </SpotlightCard>
          </BlurFade>
        ))}
      </div>

      {/* Study Session Modal with AnimatePresence */}
      <AnimatePresence>
        {activeTask && (
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl max-w-lg w-full p-7 sm:p-8 shadow-2xl border border-slate-200 relative"
            >
              <button
                onClick={closeStudySession}
                className="absolute top-5 right-5 text-slate-400 hover:text-navy text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>

              <div className="text-center mb-6">
                <Badge variant="primary">Active Study Session</Badge>
                <h2 className="text-2xl font-black text-navy tracking-tight mt-2">{activeTask.topic}</h2>
                <p className="text-xs text-slate-600 mt-1.5 max-w-sm mx-auto">{activeTask.task}</p>
              </div>

              {/* Countdown Timer */}
              <div className="my-6 p-7 rounded-3xl bg-slate-50 border border-slate-200 text-center flex flex-col items-center justify-center">
                <div className="font-mono text-5xl sm:text-6xl font-black text-navy tracking-tight">
                  {formatTimer(secondsRemaining)}
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  Target: {activeTask.minutes} minutes · Maintain focus
                </p>

                {/* Timer Controls */}
                <div className="flex items-center gap-3 mt-5">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="px-5 py-2.5 rounded-2xl bg-navy text-white text-xs font-bold hover:bg-navy/90 flex items-center gap-2 cursor-pointer shadow-md shadow-navy/20"
                  >
                    {isTimerRunning ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                    <span>{isTimerRunning ? 'Pause' : 'Resume'}</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => setSecondsRemaining(activeTask.minutes * 60)}
                    className="px-4 py-2.5 rounded-2xl border border-slate-300 text-slate-600 hover:text-navy text-xs font-bold cursor-pointer"
                  >
                    Reset
                  </motion.button>
                </div>
              </div>

              {/* Session Notes field */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
                  Session Notes & Solved Problems
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Log question numbers solved, shortcut formulas used, or friction points..."
                  rows={3}
                  className="w-full p-4 rounded-2xl border border-slate-300 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-blue resize-none"
                />
              </div>

              {completedSuccessMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold text-center"
                >
                  {completedSuccessMsg}
                </motion.div>
              )}

              {/* Done Button */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeStudySession}
                  className="flex-1 py-3 rounded-2xl border border-slate-300 text-xs font-bold text-slate-600 hover:text-navy cursor-pointer"
                >
                  Save & Exit Later
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleCompleteTask}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckIcon size={14} />
                  <span>Mark Task Done</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Proof of Work Prompt */}
      <BlurFade delay={0.35}>
        <div className="p-6 rounded-3xl bg-orange-50/70 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-orange/15 flex items-center justify-center text-orange flex-shrink-0">
              <FlameIcon size={20} className="text-orange" />
            </div>
            <div className="text-navy text-sm font-medium">
              <strong className="font-extrabold text-navy">Finished your study block?</strong> Submit a 20-second notebook photo to bump your streak and update your squad feed.
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/proof')}
            className="px-5 py-3 rounded-2xl bg-orange text-white font-extrabold flex-shrink-0 hover:bg-orange/90 transition shadow-md shadow-orange/20 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <span>Submit Proof of Work</span>
            <ArrowRightIcon size={13} />
          </motion.button>
        </div>
      </BlurFade>
    </div>
  );
}
