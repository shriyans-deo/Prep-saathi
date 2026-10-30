import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Check, FileText, Flame, Mic, Square, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../lib/prefs';
import { invalidate, useQuery } from '../lib/query';
import { checkProof, fetchProofs, signedProofUrl, submitProof } from '../lib/data';
import { formatRelative } from '../lib/dates';
import { checkedInToday, effectiveStreak } from '../lib/stats';
import { Button, EmptyState, ErrorState, Field, Notice, PageHeader, Panel, Segmented, Skeleton, cx, inputClass } from '../components/ui';
import type { Proof } from '../types/database';

type Tab = 'photo' | 'voice' | 'text';

const MAX_RECORDING_SECONDS = 120;

// Phone photos are often over 4 MB. Shrinking keeps uploads quick on slow connections.
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('compress_failed'))), 'image/jpeg', 0.8);
  });
}

function preferredAudioType(): string {
  for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

function ProofItem({ proof }: { proof: Proof }) {
  const { t, lang, lite } = usePrefs();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (lite || !proof.content_url) return;
    let cancelled = false;
    void signedProofUrl(proof.content_url).then((signed) => {
      if (!cancelled) setUrl(signed);
    });
    return () => {
      cancelled = true;
    };
  }, [proof.content_url, lite]);

  const Icon = proof.proof_type === 'photo' ? Camera : proof.proof_type === 'voice' ? Mic : FileText;
  const label = proof.proof_type === 'photo' ? t('Photo') : proof.proof_type === 'voice' ? t('Voice note') : t('Text log');

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-print flex-none" aria-hidden="true" />
        <span className="font-medium">{label}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium">
          <Check size={14} aria-hidden="true" />
          {t('Counted')}
        </span>
      </div>
      <p className="text-sm text-ink-soft">{formatRelative(proof.created_at, lang)}</p>
      {proof.proof_type === 'photo' && url && (
        <img src={url} alt={t('Your proof photo')} loading="lazy" className="mt-2 max-h-40 rounded-sheet border border-line" />
      )}
      {proof.proof_type === 'voice' && url && <audio controls preload="none" src={url} className="mt-2 w-full max-w-xs" />}
      {proof.content_text && <p className="mt-1 text-sm line-clamp-3">{proof.content_text}</p>}
      <p className="mt-1 text-sm text-ink-soft">{proof.ai_verdict ?? t('No AI note for this one.')}</p>
    </li>
  );
}

export default function ProofPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = usePrefs();
  const uid = user!.id;

  const proofs =useQuery(`proofs:${uid}`, () => fetchProofs(uid));

  const [tab, setTab] = useState<Tab>('photo');
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [audio, setAudio] = useState<{ blob: Blob; url: string; seconds: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ repeat: boolean; streak: number; verdict: string | null; checking: boolean } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const secondsRef = useRef(0);

  const alreadyIn = checkedInToday(profile);

  useEffect(() => {
    return () => {
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
      if (secondsRef.current >= MAX_RECORDING_SECONDS) recorder.current?.stop();
    }, 1000);
    return () => clearInterval(timer);
  }, [recording]);

  const startRecording = async () => {
    setMicError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMicError(t('Voice recording is not supported in this browser. Use a photo or a text log.'));
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      const type = preferredAudioType();
      const rec = new MediaRecorder(media, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: (rec.mimeType || 'audio/webm').split(';')[0] });
        setAudio({ blob, url: URL.createObjectURL(blob), seconds: secondsRef.current });
        setRecording(false);
      };
      recorder.current = rec;
      secondsRef.current = 0;
      setSeconds(0);
      setAudio(null);
      rec.start();
      setRecording(true);
    } catch (e) {
      console.error('Microphone error:', e);
      setMicError(t('Could not use the microphone. Allow microphone access in your browser, or use a photo or a text log.'));
    }
  };

  const canSubmit =
    !submitting &&
    !recording &&
    ((tab === 'photo' && photo) || (tab === 'voice' && audio) || (tab === 'text' && text.trim().length >= 20));

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setOutcome(null);
    const wasIn = alreadyIn;
    const previousStreak = effectiveStreak(profile);

    try {
      let saved: Proof;
      if (tab === 'photo' && photo) {
        const blob = await compressImage(photo.file);
        saved = await submitProof(uid, { type: 'photo', file: blob, extension: 'jpg' });
      } else if (tab === 'voice' && audio) {
        const extension = audio.blob.type.includes('mp4') ? 'mp4' : audio.blob.type.includes('ogg') ? 'ogg' : 'webm';
        saved = await submitProof(uid, { type: 'voice', file: audio.blob, extension, durationSeconds: audio.seconds });
      } else {
        saved = await submitProof(uid, { type: 'text', text: text.trim() });
      }

      await refreshProfile();
      invalidate('proofs:', 'squad:');
      setOutcome({ repeat: wasIn, streak: wasIn ? previousStreak : previousStreak + 1, verdict: null, checking: true });

      setText('');
      if (photo) URL.revokeObjectURL(photo.preview);
      setPhoto(null);
      setAudio(null);
      setSeconds(0);

      // The AI note is a nudge. If it fails, the proof still counts.
      try {
        const check = await checkProof(saved.id);
        setOutcome((current) => current && { ...current, verdict: check.verdict, checking: false });
        invalidate('proofs:');
      } catch (e) {
        console.error('Proof note failed:', e);
        setOutcome((current) => current && { ...current, checking: false });
      }
    } catch (e) {
      console.error('Proof submit failed:', e);
      setSubmitError(t('Could not submit your proof. Check your connection and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('Proof of work')}
        sub={t('A 20-second honesty nudge. Your squad sees that you checked in, never what you submitted.')}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
        <div className="flex flex-col gap-8">
          <Panel
            title={alreadyIn ? t('Checked in today') : t('Not checked in yet today')}
            aside={
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Flame size={16} className="text-print" aria-hidden="true" />
                {t('{n} day streak', { n: effectiveStreak(profile) })}
              </span>
            }
          >
            <div className="mb-4">
              <Segmented
                label={t('Proof type')}
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'photo', label: t('Photo') },
                  { value: 'voice', label: t('Voice') },
                  { value: 'text', label: t('Text') },
                ]}
              />
            </div>

            {tab === 'photo' && (
              <div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label={t('Choose a photo')}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    if (photo) URL.revokeObjectURL(photo.preview);
                    setPhoto({ file, preview: URL.createObjectURL(file) });
                  }}
                />
                {photo ? (
                  <div className="relative inline-block max-w-full">
                    <img src={photo.preview} alt={t('Your proof photo')} className="max-h-72 rounded-sheet border border-line" />
                    <Button
                      small
                      variant="print"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        URL.revokeObjectURL(photo.preview);
                        setPhoto(null);
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      {t('Remove')}
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-sheet border-[1.5px] border-dashed border-print p-5 text-center">
                    <Camera size={24} className="mx-auto text-print" aria-hidden="true" />
                    <p className="font-semibold mt-2">{t("Photograph today's notebook page")}</p>
                    <p className="text-sm text-ink-soft mb-3">{t('Solved problems, formulas, rough work. Takes 20 seconds.')}</p>
                    <Button onClick={() => fileInput.current?.click()}>{t('Take or choose a photo')}</Button>
                  </div>
                )}
              </div>
            )}

            {tab === 'voice' && (
              <div className="rounded-sheet border border-line p-4">
                <p className="mb-3">{t('Say what you studied, which formulas you revised, and where you got stuck.')}</p>
                {micError && <Notice tone="error" className="mb-3">{micError}</Notice>}
                {recording ? (
                  <div className="flex items-center gap-3">
                    <Button onClick={() => recorder.current?.stop()}>
                      <Square size={14} aria-hidden="true" />
                      {t('Stop')}
                    </Button>
                    <span className="font-semibold" role="timer">
                      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-ink-soft">{t('Max 2 minutes')}</span>
                  </div>
                ) : audio ? (
                  <div className="flex flex-col gap-2 items-start">
                    <audio controls src={audio.url} className="w-full max-w-xs" />
                    <Button small variant="print" onClick={startRecording}>
                      {t('Record again')}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={startRecording}>
                    <Mic size={16} aria-hidden="true" />
                    {t('Start recording')}
                  </Button>
                )}
              </div>
            )}

            {tab === 'text' && (
              <Field label={t('What did you actually do today?')} hint={t('At least 20 characters.')}>
                <textarea
                  className={`${inputClass} resize-y`}
                  rows={4}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t('Solved 15 relative-speed problems from the 2023 paper. Stuck on circular tracks.')}
                />
              </Field>
            )}

            {submitError && <Notice tone="error" className="mt-3">{submitError}</Notice>}

            <Button className="w-full mt-4" disabled={!canSubmit} loading={submitting} onClick={submit}>
              {alreadyIn ? t('Submit another proof') : t('Submit proof and keep my streak')}
            </Button>

            {outcome && (
              <Notice tone="good" className="mt-3">
                <p className="font-semibold">
                  {outcome.repeat
                    ? t('Saved. You already checked in today, so your streak stays at {n}.', { n: outcome.streak })
                    : t('Counted. Your streak is now {n} and you earned 50 points.', { n: outcome.streak })}
                </p>
                <p className="text-sm mt-0.5">
                  {outcome.checking ? t('Getting an AI note...') : outcome.verdict ?? t('The AI note is unavailable right now. Your proof still counts.')}
                </p>
                <Link to="/squad" className="text-sm font-semibold mt-1 inline-block underline">
                  {t('See your squad')}
                </Link>
              </Notice>
            )}
          </Panel>
        </div>

        <Panel title={t('Recent submissions')}>
          {proofs.error && !proofs.data ? (
            <ErrorState error={proofs.error} onRetry={proofs.refetch} />
          ) : proofs.isLoading ? (
            <Skeleton className="h-24" />
          ) : (proofs.data ?? []).length === 0 ? (
            <EmptyState title={t('Nothing submitted yet')}>{t('Your first proof starts your streak.')}</EmptyState>
          ) : (
            <ul className={cx('divide-y divide-line')}>
              {(proofs.data ?? []).map((proof) => (
                <ProofItem key={proof.id} proof={proof} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
