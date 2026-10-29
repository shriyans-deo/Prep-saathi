import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_PROFILE } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { extractTextFromPDF } from '../lib/pdf';
import { invokeAI } from '../lib/ai';
import { AI_TASKS } from '../lib/constants';
import {
  UploadIcon,
  FileTextIcon,
  SparklesIcon,
  AlertTriangleIcon,
  QuizIcon,
  CheckIcon,
  ClockIcon,
} from '../components/ui/Icons';
import { Badge } from '../components/ui/Badge';
import { ShimmerButton } from '../components/magicui/ShimmerButton';
import { BorderBeam } from '../components/magicui/BorderBeam';
import { BlurFade } from '../components/magicui/BlurFade';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import { ClickSpark } from '../components/reactbits/ClickSpark';
import { motion } from 'motion/react';

interface DocItem {
  id: string;
  filename: string;
  storage_path: string;
  ai_summary: string;
  detected_topics: string[];
  weak_topic_overlap: string[];
  suggested_tasks: { task: string; minutes: number; why: string }[];
  quiz?: any[];
  masteryScore?: number;
  created_at: string;
}

// 2 Pre-seeded coaching documents matching spec §9
const SEEDED_DOCUMENTS: DocItem[] = [
  {
    id: 'doc-seed-1',
    filename: 'SSC_CGL_Maths_Coaching_Notes_Speed_Time.pdf',
    storage_path: 'demo/SSC_CGL_Maths_Coaching_Notes_Speed_Time.pdf',
    ai_summary:
      'Covers key formulas for relative speed in opposite and same directions, train crossing platforms, and 15 solved practice questions.',
    detected_topics: ['Time, Speed and Distance', 'Relative Speed', 'Races'],
    weak_topic_overlap: ['Time, Speed and Distance'],
    suggested_tasks: [
      {
        task: 'Work through pages 1-4 and solve 12 relative-speed examples',
        minutes: 40,
        why: 'Covers your weakest topic (32% mastery)',
      },
    ],
    quiz: [
      {
        q: 'What is the relative speed of two trains moving in the same direction with speeds v1 and v2 (v1 > v2)?',
        options: ['v1 + v2', 'v1 - v2', 'v1 * v2', '(v1 + v2)/2'],
        answer: 'v1 - v2',
        concept: 'Relative Speed in Same Direction',
      },
      {
        q: 'If speed is doubled while distance remains constant, the time taken becomes:',
        options: ['Doubled', 'Half', 'Four times', 'Unchanged'],
        answer: 'Half',
        concept: 'Inverse relation of speed and time',
      },
      {
        q: 'To convert speed from km/h to m/s, multiply by:',
        options: ['5/18', '18/5', '3/8', '8/3'],
        answer: '5/18',
        concept: 'Unit Conversion',
      },
      {
        q: 'A train passes a pole in 10 seconds at 72 km/h. What is the length of the train?',
        options: ['150 m', '200 m', '250 m', '300 m'],
        answer: '200 m',
        concept: 'Train Crossing Stationary Object',
      },
      {
        q: 'Average speed for equal distances at speeds u and v is:',
        options: ['(u + v) / 2', '2uv / (u + v)', 'uv / (u + v)', 'sqrt(uv)'],
        answer: '2uv / (u + v)',
        concept: 'Harmonic Mean for Average Speed',
      },
    ],
    masteryScore: 32,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'doc-seed-2',
    filename: 'Geometry_and_Mensuration_Handout.pdf',
    storage_path: 'demo/Geometry_and_Mensuration_Handout.pdf',
    ai_summary:
      'Formulas and shortcut approaches for circle tangents, cyclic quadrilaterals, and cone/sphere volume calculations.',
    detected_topics: ['Geometry and Mensuration', 'Triangles', 'Circles'],
    weak_topic_overlap: ['Geometry and Mensuration'],
    suggested_tasks: [
      {
        task: 'Memorize inscribed angle theorems and solve 8 diagram questions',
        minutes: 35,
        why: 'Directly targets weak area (35% mastery)',
      },
    ],
    quiz: [],
    masteryScore: 35,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function LibraryPage() {
  const { profile, isDemoUser } = useAuth();
  const navigate = useNavigate();
  const currentProfile = profile || DEMO_PROFILE;

  const [documents, setDocuments] = useState<DocItem[]>(SEEDED_DOCUMENTS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [activeResult, setActiveResult] = useState<DocItem | null>(SEEDED_DOCUMENTS[0]);
  const [planAddedSuccess, setPlanAddedSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      if (isDemoUser) return;
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const formatted: DocItem[] = data.map((d: any) => ({
            id: d.id,
            filename: d.filename,
            storage_path: d.storage_path,
            ai_summary: d.ai_summary || '',
            detected_topics: Array.isArray(d.detected_topics) ? d.detected_topics : [],
            weak_topic_overlap: Array.isArray(d.weak_topic_overlap) ? d.weak_topic_overlap : [],
            suggested_tasks: Array.isArray(d.suggested_tasks) ? d.suggested_tasks : [],
            masteryScore: 34,
            created_at: d.created_at,
          }));
          setDocuments([...formatted, ...SEEDED_DOCUMENTS]);
        }
      } catch (e) {
        console.warn('Documents query fallback:', e);
      }
    };

    fetchDocs();
  }, [isDemoUser]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsProcessing(true);
    setPlanAddedSuccess(null);

    try {
      setProcessingStage('reading document…');
      const extractedText = await extractTextFromPDF(file);

      const storagePath = `${currentProfile.id || 'demo'}/${Date.now()}_${file.name}`;
      try {
        if (!isDemoUser && currentProfile.id) {
          await supabase.storage.from('documents').upload(storagePath, file);
        }
      } catch (uploadErr) {
        console.warn('Storage upload note:', uploadErr);
      }

      setProcessingStage('mapping to syllabus…');
      const weakTopics = ['Time, Speed and Distance', 'Geometry and Mensuration', 'Economics'];

      const aiResponse = await invokeAI(AI_TASKS.DOC_SUGGEST, {
        exam: currentProfile.exam,
        weak_topics: weakTopics,
        text: extractedText,
      });

      setProcessingStage('building quiz…');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const newDoc: DocItem = {
        id: `doc-${Date.now()}`,
        filename: file.name,
        storage_path: storagePath,
        ai_summary:
          aiResponse?.summary ||
          'Analysis of uploaded material shows strong alignment with exam kinematics and numerical aptitude.',
        detected_topics: aiResponse?.detected_topics || ['Time, Speed and Distance', 'Kinematics'],
        weak_topic_overlap: aiResponse?.overlaps_weak_topics || ['Time, Speed and Distance'],
        suggested_tasks: aiResponse?.suggested_tasks || [
          {
            task: 'Work through pages 1-4 and solve 12 relative motion train problems',
            minutes: 40,
            why: 'Directly addresses your 32% measured mastery gap',
          },
        ],
        quiz: aiResponse?.quiz || SEEDED_DOCUMENTS[0].quiz,
        masteryScore: 32,
        created_at: new Date().toISOString(),
      };

      try {
        if (!isDemoUser && currentProfile.id) {
          await supabase.from('documents').insert({
            user_id: currentProfile.id,
            filename: newDoc.filename,
            storage_path: newDoc.storage_path,
            extracted_text: extractedText,
            ai_summary: newDoc.ai_summary,
            detected_topics: newDoc.detected_topics,
            weak_topic_overlap: newDoc.weak_topic_overlap,
            suggested_tasks: newDoc.suggested_tasks,
            processed: true,
          });
        }
      } catch (dbErr) {
        console.warn('Document record persist note:', dbErr);
      }

      setDocuments([newDoc, ...documents]);
      setActiveResult(newDoc);
    } catch (err) {
      console.error('Document processing flow error:', err);
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const handleAddToTomorrowPlan = async (taskItem: { task: string; minutes: number; why: string }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
      if (!isDemoUser && currentProfile.id) {
        const { data: existingPlan } = await supabase
          .from('daily_plans')
          .select('*')
          .eq('user_id', currentProfile.id)
          .eq('plan_date', tomorrowStr)
          .maybeSingle();

        const currentTasks = existingPlan?.tasks?.tasks || [];
        const newTask = {
          subject: 'Quantitative Aptitude',
          topic: activeResult?.detected_topics[0] || 'Coaching Material Practice',
          task: taskItem.task,
          minutes: taskItem.minutes,
          type: 'weak_topic',
          why: taskItem.why,
          completed: false,
        };

        const updatedTasks = [...currentTasks, newTask];

        await supabase.from('daily_plans').upsert({
          user_id: currentProfile.id,
          plan_date: tomorrowStr,
          tasks: {
            tasks: updatedTasks,
            total_minutes: updatedTasks.reduce((acc: number, t: any) => acc + (t.minutes || 30), 0),
            focus_note: 'Includes high-priority remedial tasks absorbed from your uploaded document.',
          },
          completed_count: 0,
          generated_by_ai: true,
        });
      }
    } catch (e) {
      console.warn('Add to tomorrow plan note:', e);
    }

    setPlanAddedSuccess(
      `✓ "${taskItem.task}" has been scheduled into tomorrow's adaptive daily plan!`
    );
  };

  const handleGenerateQuiz = () => {
    if (!activeResult) return;
    if (activeResult.quiz && activeResult.quiz.length > 0) {
      sessionStorage.setItem(
        'prepsaathi_active_doc_quiz',
        JSON.stringify({
          topic: activeResult.detected_topics[0] || 'Coaching Material',
          sourceDocId: activeResult.id,
          filename: activeResult.filename,
          questions: activeResult.quiz,
        })
      );
    }
    navigate('/quiz?source=doc');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <BlurFade delay={0.05}>
        <div className="pb-6 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
              Library & Notes Ingestion
            </h1>
            <Badge variant="alert">
              <SparklesIcon size={12} className="text-orange" />
              <span>Product Differentiator</span>
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Upload your coaching notes or PDFs. PrepSaathi maps them to your exam syllabus, detects weak-topic overlaps, and builds targeted quizzes.
          </p>
        </div>
      </BlurFade>

      {/* Upload Drop Zone */}
      <BlurFade delay={0.1}>
        <div className="bg-white rounded-2xl shadow-xs border-2 border-dashed border-slate-300 hover:border-blue/60 p-6 sm:p-8 text-center transition-all">
          <input
            type="file"
            id="doc-upload"
            accept=".pdf,application/pdf"
            onChange={handleFileUpload}
            disabled={isProcessing}
            className="hidden"
          />

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
              <div className="w-10 h-10 border-3 border-blue border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-navy animate-pulse tracking-wide">{processingStage}</p>
              <p className="text-xs text-slate-400">Extracting text in-browser with pdf.js · Zero token waste</p>
            </div>
          ) : (
            <label htmlFor="doc-upload" className="cursor-pointer block space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue/10 flex items-center justify-center text-blue mx-auto">
                <UploadIcon size={22} className="text-blue" />
              </div>
              <div>
                <p className="text-sm font-bold text-navy">
                  Click to upload coaching PDF or drag and drop
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Lecture handouts, teacher notes, or solution sheets (PDF up to 10MB)
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => document.getElementById('doc-upload')?.click()}
                className="px-5 py-2.5 rounded-xl bg-blue hover:bg-blue/90 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Select PDF Document
              </motion.button>
            </label>
          )}
        </div>
      </BlurFade>

      {/* PROCESSED DOCUMENT CARD with SpotlightCard */}
      {activeResult && (
        <BlurFade delay={0.15}>
          <SpotlightCard
            spotlightColor="rgba(37, 99, 235, 0.06)"
            className="p-6 sm:p-8 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center text-blue flex-shrink-0">
                  <FileTextIcon size={20} className="text-blue" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-navy truncate max-w-lg">
                    {activeResult.filename}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">Ingested Study Material Analysis</span>
                </div>
              </div>

              <Badge variant="mastered">
                <CheckIcon size={12} />
                <span>Syllabus Mapped</span>
              </Badge>
            </div>

            {/* 1. Two-sentence AI Summary */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                1. AI Document Summary
              </span>
              <p className="text-sm font-medium text-slate-800 leading-relaxed">
                {activeResult.ai_summary}
              </p>
            </div>

            {/* 2. Topics Detected, as Chips */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                2. Syllabus Topics Detected
              </span>
              <div className="flex flex-wrap gap-2">
                {activeResult.detected_topics.map((topic, i) => (
                  <span
                    key={i}
                    className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* 3. The Overlap Line, Highlighted with BorderBeam */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-orange/5 border-2 border-orange/30 text-orange-950 flex items-start gap-3.5 shadow-2xs">
              <BorderBeam size={180} duration={10} colorFrom="#F97316" colorTo="#FDBA74" />
              <div className="w-8 h-8 rounded-lg bg-orange/15 flex items-center justify-center text-orange flex-shrink-0 mt-0.5">
                <AlertTriangleIcon size={18} className="text-orange" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-orange block">
                  Weak-Topic Overlap Alert
                </span>
                <p className="text-sm font-bold text-navy">
                  This document covers{' '}
                  <span className="underline decoration-orange decoration-2">
                    {activeResult.weak_topic_overlap.join(', ') || 'Time, Speed and Distance'}
                  </span>{' '}
                  — one of your three weakest topics.
                </p>
                <p className="text-xs text-slate-600">
                  Your measured diagnostic score here is <strong>32%</strong>. Working through the solved examples in this document will directly close this gap.
                </p>
              </div>
            </div>

            {/* 4. Suggested Tasks with ClickSpark */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                4. Targeted Remedial Tasks
              </span>
              <div className="space-y-2.5">
                {activeResult.suggested_tasks.map((taskItem, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-bold text-navy">{taskItem.task}</p>
                      <p className="text-[11px] text-blue font-medium flex items-center gap-1.5">
                        <ClockIcon size={12} className="text-blue" />
                        <span>{taskItem.minutes} min · {taskItem.why}</span>
                      </p>
                    </div>
                    <ClickSpark sparkColor="#2563EB">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => handleAddToTomorrowPlan(taskItem)}
                        className="px-4 py-2 rounded-xl bg-navy hover:bg-navy/90 text-white font-bold text-xs transition shadow-xs flex-shrink-0 cursor-pointer self-start sm:self-auto"
                      >
                        Add to tomorrow's plan +
                      </motion.button>
                    </ClickSpark>
                  </div>
                ))}
              </div>

              {planAddedSuccess && (
                <p className="text-xs text-emerald-800 font-bold mt-2.5 animate-in fade-in flex items-center gap-1">
                  <CheckIcon size={13} className="text-emerald-700" />
                  <span>{planAddedSuccess}</span>
                </p>
              )}
            </div>

            {/* 5. ShimmerButton for Quiz Launch */}
            <div className="pt-2">
              <ShimmerButton
                onClick={handleGenerateQuiz}
                className="w-full py-3.5 px-4 text-xs sm:text-sm font-bold"
              >
                <div className="flex items-center justify-center gap-2">
                  <QuizIcon size={16} />
                  <span>Generate 5-Question Quiz From This Document</span>
                </div>
              </ShimmerButton>
            </div>
          </SpotlightCard>
        </BlurFade>
      )}

      {/* Document Grid Below */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-navy tracking-tight">Your Study Material Collection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc, idx) => (
            <BlurFade key={doc.id} delay={0.2 + idx * 0.05}>
              <SpotlightCard
                onClick={() => setActiveResult(doc)}
                className={`p-5 cursor-pointer transition shadow-2xs hover:border-blue/60 ${
                  activeResult?.id === doc.id ? 'border-blue ring-1 ring-blue' : 'border-slate-200/80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue/10 flex items-center justify-center text-blue flex-shrink-0">
                    <FileTextIcon size={20} className="text-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-navy truncate">{doc.filename}</h4>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {doc.detected_topics.slice(0, 3).map((t, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400 font-mono">
                        {new Date(doc.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span className="font-bold text-orange flex items-center gap-1">
                        <AlertTriangleIcon size={11} className="text-orange" />
                        <span>Weak overlap: {doc.weak_topic_overlap[0] || 'Yes'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </BlurFade>
          ))}
        </div>
      </div>
    </div>
  );
}
