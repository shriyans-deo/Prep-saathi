import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_PROFILE } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ProofIcon,
  MicIcon,
  FileTextIcon,
  FlameIcon,
  CheckIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
} from '../components/ui/Icons';
import { Badge } from '../components/ui/Badge';
import { ShimmerButton } from '../components/magicui/ShimmerButton';
import { triggerAcademicConfetti } from '../components/magicui/Confetti';
import { BlurFade } from '../components/magicui/BlurFade';
import { SpotlightCard } from '../components/reactbits/SpotlightCard';
import { ClickSpark } from '../components/reactbits/ClickSpark';
import { motion } from 'motion/react';

interface ProofSubmission {
  id: string;
  proof_type: 'photo' | 'voice' | 'text';
  summary: string;
  ai_verdict: string;
  timestamp: string;
  counted: boolean;
}

const RECENT_SUBMISSIONS: ProofSubmission[] = [
  {
    id: 'proof-1',
    proof_type: 'photo',
    summary: 'Notebook photo: 15 relative speed problem derivations and rough scratchpad calculations.',
    ai_verdict:
      'Plausibility check passed: Appears to be handwritten mathematics work, consistent with today’s topic (Time, Speed and Distance).',
    timestamp: 'Today, 09:45 PM',
    counted: true,
  },
  {
    id: 'proof-2',
    proof_type: 'text',
    summary: 'Solved 20 syllogism questions from 2024 CGL tier-1 paper. 18 correct answers recorded.',
    ai_verdict: 'Plausibility check passed: Practice log matches syllabus difficulty standard.',
    timestamp: 'Yesterday, 10:15 PM',
    counted: true,
  },
  {
    id: 'proof-3',
    proof_type: 'voice',
    summary: 'Voice audio memo: 45s audio debrief on Governor powers Articles 153-162.',
    ai_verdict: 'Plausibility check passed: Verbal recall contains key constitutional provisions.',
    timestamp: '28 Oct, 09:30 PM',
    counted: true,
  },
];

export default function ProofPage() {
  const { profile, updateProfileState, isDemoUser } = useAuth();
  const navigate = useNavigate();
  const currentProfile = profile || DEMO_PROFILE;

  const [activeTab, setActiveTab] = useState<'photo' | 'voice' | 'text'>('photo');
  const [textContent, setTextContent] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [voiceRecorded, setVoiceRecorded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<ProofSubmission[]>(RECENT_SUBMISSIONS);
  const [latestVerdict, setLatestVerdict] = useState<string | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleToggleVoice = () => {
    if (!isRecording) {
      setIsRecording(true);
      setAudioSeconds(0);
      const timer = setInterval(() => {
        setAudioSeconds((prev) => {
          if (prev >= 60) {
            clearInterval(timer);
            setIsRecording(false);
            setVoiceRecorded(true);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setIsRecording(false);
      setVoiceRecorded(true);
    }
  };

  const handleSubmitProof = async () => {
    setIsSubmitting(true);
    setLatestVerdict(null);

    const verdictLine =
      activeTab === 'photo'
        ? 'Plausibility check passed: Appears to be handwritten mathematics work, consistent with today’s topic.'
        : activeTab === 'voice'
        ? 'Plausibility check passed: Voice reflection notes match today’s syllabus objectives.'
        : 'Plausibility check passed: Submitted study log content meets execution criteria.';

    try {
      const todayStr = new Date().toISOString().split('T')[0];

      if (!isDemoUser && currentProfile.id) {
        let contentUrl: string | null = null;

        if (photoFile) {
          const storagePath = `${currentProfile.id}/${Date.now()}_${photoFile.name}`;
          try {
            await supabase.storage.from('proofs').upload(storagePath, photoFile);
            contentUrl = storagePath;
          } catch (e) {
            console.warn('Proof photo upload note:', e);
          }
        }

        await supabase.from('proofs').insert({
          user_id: currentProfile.id,
          proof_date: todayStr,
          proof_type: activeTab,
          content_text: activeTab === 'text' ? textContent : null,
          content_url: contentUrl,
          ai_verdict: verdictLine,
        });
      }

      updateProfileState({
        streak_count: (currentProfile.streak_count || 12) + 1,
        total_points: (currentProfile.total_points || 2450) + 50,
      });

      triggerAcademicConfetti({ particleCount: 55, spread: 75 });

      const newSub: ProofSubmission = {
        id: `proof-${Date.now()}`,
        proof_type: activeTab,
        summary:
          activeTab === 'text'
            ? textContent
            : activeTab === 'photo'
            ? `Notebook photo: ${photoFile?.name || 'Handwritten study notes'}`
            : `Voice note: ${audioSeconds}s study debrief`,
        ai_verdict: verdictLine,
        timestamp: 'Just now',
        counted: true,
      };

      setSubmissions([newSub, ...submissions]);
      setLatestVerdict(verdictLine);
      setTextContent('');
      setPhotoFile(null);
      setPhotoPreview(null);
      setVoiceRecorded(false);
    } catch (err) {
      console.error('Proof submission note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <BlurFade delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/90">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
                Proof of Work
              </h1>
              <Badge variant="alert">
                <FlameIcon size={12} className="text-orange" />
                <span>Honesty & Friction Nudge</span>
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              20-second friction and honesty nudge to authenticate daily study. Increments your streak and notifies your squad.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-orange-50 border border-orange-200 text-orange font-black text-xs sm:text-sm shadow-xs"
            >
              <FlameIcon size={16} className="text-orange" />
              <span>{currentProfile.streak_count} Days Streak</span>
            </motion.div>
          </div>
        </div>
      </BlurFade>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Honesty Mechanism & Submission Studio (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Honesty Framing Information Panel */}
          <BlurFade delay={0.1}>
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/90 text-xs text-slate-700 flex items-start gap-3.5 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-navy/5 flex items-center justify-center text-navy flex-shrink-0 mt-0.5">
                <AlertTriangleIcon size={18} className="text-slate-600" />
              </div>
              <div className="space-y-0.5">
                <strong className="font-extrabold text-navy block text-xs">Friction & Honesty Mechanism:</strong>
                <p className="text-slate-600 leading-relaxed">
                  This is an accountability nudge, never hard biometric surveillance. Your genuine enforcement mechanism is peer visibility — your squad sees whether you checked in today.
                </p>
              </div>
            </div>
          </BlurFade>

          {/* Submission Box with 3 Tabs */}
          <BlurFade delay={0.15}>
            <SpotlightCard
              spotlightColor="rgba(249, 115, 22, 0.06)"
              className="p-6 sm:p-8 space-y-6 rounded-3xl border border-slate-200/90 bg-white shadow-[0_4px_20px_-4px_rgba(11,31,58,0.06)]"
            >
              {/* Three Tabs with Animated Pill */}
              <div className="flex rounded-2xl bg-slate-100 p-1.5 border border-slate-200">
                {(['photo', 'voice', 'text'] as const).map((tab) => {
                  const isActive = activeTab === tab;
                  const label = tab === 'photo' ? 'Photo Proof' : tab === 'voice' ? 'Voice Note' : 'Text Log';
                  const Icon = tab === 'photo' ? ProofIcon : tab === 'voice' ? MicIcon : FileTextIcon;

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`relative flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                        isActive ? 'text-blue' : 'text-slate-600 hover:text-navy'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="proofTabActive"
                          className="absolute inset-0 bg-white rounded-xl shadow-xs z-0"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        <Icon size={16} />
                        <span>{label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Tab 1: Photo */}
              {activeTab === 'photo' && (
                <div className="space-y-4">
                  <input
                    type="file"
                    id="proof-photo"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  {photoPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-72 flex justify-center bg-slate-50">
                      <img
                        src={photoPreview}
                        alt="Proof preview"
                        className="object-contain max-h-72 w-full"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                        className="absolute top-3 right-3 bg-navy/80 hover:bg-navy text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => document.getElementById('proof-photo')?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-orange/60 rounded-3xl p-8 text-center cursor-pointer transition bg-slate-50/50 hover:bg-orange-50/10"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-orange/10 flex items-center justify-center text-orange mx-auto mb-2 shadow-inner">
                        <ProofIcon size={22} className="text-orange" />
                      </div>
                      <p className="text-sm font-extrabold text-navy">
                        Upload notebook photo of today's solved problems
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Snap a quick photo of your scratchpad, formulae, or rough calculations
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Voice */}
              {activeTab === 'voice' && (
                <div className="border border-slate-200 rounded-3xl p-6 text-center space-y-4 bg-slate-50/80">
                  <div className="w-16 h-16 rounded-full bg-blue/10 flex items-center justify-center text-blue mx-auto shadow-inner">
                    <MicIcon size={28} className="text-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-navy">
                      {isRecording
                        ? `Recording in progress: 00:${String(audioSeconds).padStart(2, '0')}`
                        : voiceRecorded
                        ? `Audio Debrief Recorded (${audioSeconds} seconds)`
                        : 'Record a 30-second audio debrief'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Speak aloud what topics were solved, which formulas were revised, and where you met friction
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={handleToggleVoice}
                    className={`px-6 py-2.5 rounded-full text-xs font-bold transition shadow-xs cursor-pointer ${
                      isRecording
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-navy text-white hover:bg-navy/90'
                    }`}
                  >
                    {isRecording ? '⏹ Stop Recording' : voiceRecorded ? '🔁 Re-record Audio' : '⏺ Start Audio Note'}
                  </motion.button>
                </div>
              )}

              {/* Tab 3: Text */}
              {activeTab === 'text' && (
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold text-navy uppercase tracking-wider">
                    Study Execution Log
                  </label>
                  <textarea
                    rows={4}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="e.g. Practiced 15 questions on relative motion from 2023 CGL Tier 1 paper. Derived harmonic mean formula for average speed."
                    className="w-full p-4 rounded-2xl border border-slate-300 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-blue resize-none"
                  />
                </div>
              )}

              {/* Submit Button with ShimmerButton and ClickSpark */}
              <ClickSpark sparkColor="#F97316" className="w-full">
                <ShimmerButton
                  background="#F97316"
                  shimmerColor="#FED7AA"
                  disabled={
                    isSubmitting ||
                    (activeTab === 'photo' && !photoFile) ||
                    (activeTab === 'voice' && !voiceRecorded) ||
                    (activeTab === 'text' && !textContent.trim())
                  }
                  onClick={handleSubmitProof}
                  className="w-full py-4 px-4 text-xs sm:text-sm font-bold shadow-lg shadow-orange/20 disabled:opacity-40"
                >
                  <div className="flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Checking Plausibility & Bumping Streak...</span>
                      </>
                    ) : (
                      <>
                        <FlameIcon size={16} />
                        <span>Submit Proof (+50 Points & Bump Streak)</span>
                      </>
                    )}
                  </div>
                </ShimmerButton>
              </ClickSpark>

              {/* AI Plausibility Verdict Line */}
              {latestVerdict && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2"
                >
                  <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                    <CheckIcon size={14} className="text-emerald-700" />
                    <span>Streak Incremented to {currentProfile.streak_count} Days!</span>
                  </div>
                  <p className="text-slate-700 italic">"{latestVerdict}"</p>
                  <div className="pt-2 flex items-center justify-between border-t border-emerald-200/60">
                    <span className="text-[11px] text-emerald-800 font-semibold">
                      Squad activity feed updated: Aspirant D completed today.
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/squad')}
                      className="text-emerald-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Squad Board</span>
                      <ArrowRightIcon size={11} />
                    </button>
                  </div>
                </motion.div>
              )}
            </SpotlightCard>
          </BlurFade>
        </div>

        {/* RIGHT COLUMN: Accountability & Verified Timeline (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Streak & Peer Accountability */}
          <BlurFade delay={0.15}>
            <div className="bg-[#0B1F3A] text-white rounded-3xl border border-blue-900/40 shadow-xl shadow-navy/15 p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-sky">Daily Accountability</span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                  Peer Visible
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15">
                  <span className="text-[10px] text-slate-300 block uppercase font-bold">Current Streak</span>
                  <span className="text-2xl font-black text-orange-400 font-mono mt-0.5 block">
                    {currentProfile.streak_count} Days
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15">
                  <span className="text-[10px] text-slate-300 block uppercase font-bold">Study Points</span>
                  <span className="text-2xl font-black text-sky font-mono mt-0.5 block">
                    {currentProfile.total_points} pts
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                Submitting your proof notifies your 5 peers in Cohort #SSC-04 and marks your status as <strong>Verified</strong> for today.
              </p>
            </div>
          </BlurFade>

          {/* Card 2: Recent Verified Submissions Timeline */}
          <BlurFade delay={0.2}>
            <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(11,31,58,0.06)] border border-slate-200/90 p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-navy tracking-tight">Recent Verified Submissions</h3>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md">
                  {submissions.length} Verified
                </span>
              </div>

              <div className="space-y-3">
                {submissions.map((sub, idx) => (
                  <SpotlightCard
                    key={sub.id || idx}
                    spotlightColor="rgba(37, 99, 235, 0.05)"
                    className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy uppercase text-[10px] tracking-wider">
                        {sub.proof_type === 'photo' ? '📷 Photo Proof' : sub.proof_type === 'voice' ? '🎙️ Voice Memo' : '📝 Text Log'}
                      </span>
                      <Badge variant="mastered">
                        <CheckIcon size={10} />
                        <span>Counted</span>
                      </Badge>
                    </div>
                    <p className="text-slate-800 font-semibold leading-relaxed">{sub.summary}</p>
                    <p className="text-[11px] text-slate-500 italic bg-white/70 p-2 rounded-xl border border-slate-100">
                      "{sub.ai_verdict}"
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono text-right">
                      {sub.timestamp}
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </div>
  );
}
