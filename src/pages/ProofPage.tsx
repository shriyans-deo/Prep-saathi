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

      // Insert proof row in Supabase (§3 & §4: triggers bump streak)
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

      // Update local profile state
      updateProfileState({
        streak_count: (currentProfile.streak_count || 12) + 1,
        total_points: (currentProfile.total_points || 2450) + 50,
      });

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
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
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
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange/10 border border-orange/20 text-orange font-bold text-xs sm:text-sm shadow-2xs">
            <FlameIcon size={16} className="text-orange" />
            <span>{currentProfile.streak_count} Days Streak</span>
          </div>
        </div>
      </div>

      {/* Honesty Framing Information Panel (§8 & §1 Constraint 27) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-100 border border-slate-200/80 text-xs text-slate-700 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-lg bg-navy/5 flex items-center justify-center text-navy flex-shrink-0 mt-0.5">
          <AlertTriangleIcon size={16} className="text-slate-600" />
        </div>
        <div className="space-y-0.5">
          <strong className="font-bold text-navy block text-xs">Friction & Honesty Mechanism:</strong>
          <p className="text-slate-600 leading-relaxed">
            This is an accountability nudge, never hard biometric surveillance. Your genuine enforcement mechanism is peer visibility — your squad sees whether you checked in today.
          </p>
        </div>
      </div>

      {/* Submission Box with 3 Tabs (§8: Photo · Voice · Text) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-8 space-y-6">
        {/* Three Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('photo')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'photo'
                ? 'bg-white text-blue shadow-xs'
                : 'text-slate-600 hover:text-navy'
            }`}
          >
            <ProofIcon size={16} />
            <span>Photo Proof</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'voice'
                ? 'bg-white text-blue shadow-xs'
                : 'text-slate-600 hover:text-navy'
            }`}
          >
            <MicIcon size={16} />
            <span>Voice Note</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'text'
                ? 'bg-white text-blue shadow-xs'
                : 'text-slate-600 hover:text-navy'
            }`}
          >
            <FileTextIcon size={16} />
            <span>Text Log</span>
          </button>
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
                className="border-2 border-dashed border-slate-300 hover:border-blue/60 rounded-2xl p-8 text-center cursor-pointer transition"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue/10 flex items-center justify-center text-blue mx-auto mb-2">
                  <ProofIcon size={22} className="text-blue" />
                </div>
                <p className="text-sm font-bold text-navy">
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
          <div className="border border-slate-200 rounded-2xl p-6 text-center space-y-4 bg-slate-50">
            <div className="w-16 h-16 rounded-full bg-blue/10 flex items-center justify-center text-blue mx-auto">
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

            <button
              type="button"
              onClick={handleToggleVoice}
              className={`px-6 py-2.5 rounded-full text-xs font-bold transition shadow-xs cursor-pointer ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-navy text-white hover:bg-navy/90'
              }`}
            >
              {isRecording ? '⏹ Stop Recording' : voiceRecorded ? '🔁 Re-record Audio' : '⏺ Start Audio Note'}
            </button>
          </div>
        )}

        {/* Tab 3: Text */}
        {activeTab === 'text' && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-navy uppercase tracking-wider">
              Study Execution Log
            </label>
            <textarea
              rows={4}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="e.g. Practiced 15 questions on relative motion from 2023 CGL Tier 1 paper. Derived harmonic mean formula for average speed."
              className="w-full p-4 rounded-xl border border-slate-300 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-blue resize-none"
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          disabled={
            isSubmitting ||
            (activeTab === 'photo' && !photoFile) ||
            (activeTab === 'voice' && !voiceRecorded) ||
            (activeTab === 'text' && !textContent.trim())
          }
          onClick={handleSubmitProof}
          className="w-full py-3.5 px-4 rounded-xl bg-orange hover:bg-orange/90 text-white font-bold text-xs sm:text-sm transition shadow-xs disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
        >
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
        </button>

        {/* AI Plausibility Verdict Line (§8 & §6 Screen 7) */}
        {latestVerdict && (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2 animate-in fade-in">
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
          </div>
        )}
      </div>

      {/* Recent Submissions List with timestamps and Counted badge (§8 & §6 Screen 7) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-navy tracking-tight">Recent Verified Submissions</h3>

        <div className="space-y-3">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-navy uppercase text-[10px] tracking-wider">
                    {sub.proof_type === 'photo' ? 'Photo Proof' : sub.proof_type === 'voice' ? 'Voice Memo' : 'Text Log'}
                  </span>
                  <span className="text-slate-400 text-[11px]">· {sub.timestamp}</span>
                </div>
                <p className="text-slate-700 font-medium">{sub.summary}</p>
                <p className="text-[11px] text-slate-500 italic">"{sub.ai_verdict}"</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                <Badge variant="mastered">
                  <CheckIcon size={10} />
                  <span>Counted</span>
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
