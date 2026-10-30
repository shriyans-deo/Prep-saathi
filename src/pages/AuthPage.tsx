import React, { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../lib/prefs';
import { supabase } from '../lib/supabase';
import { Bubble, Button, Field, Logo, Notice, Segmented, inputClass } from '../components/ui';

type Mode = 'login' | 'signup' | 'forgot' | 'recovery';

const LOOP = ['Plan', 'Study', 'Quiz', 'Proof', 'Tomorrow changes'];

function authMessage(message: string, t: (s: string) => string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return t('That email and password do not match. Try again or reset your password.');
  if (m.includes('already registered')) return t('This email already has an account. Log in instead.');
  if (m.includes('password should')) return t('Use a password of at least 6 characters.');
  if (m.includes('rate limit')) return t('Too many attempts. Please wait a few minutes and try again.');
  if (m.includes('fetch') || m.includes('network')) return t('Could not reach the server. Check your connection and try again.');
  return t('Something went wrong. Please try again.');
}

export default function AuthPage() {
  const { user, isLoading, signIn, signUp, sendPasswordReset, startSampleAccount } = useAuth();
  const { t, lang, setLang } = usePrefs();
  const [params] = useSearchParams();

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) setMode('recovery');
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('recovery');
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isLoading && user && mode !== 'recovery' && !sampleBusy) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email.trim(), password);
        if (err) setError(authMessage(err.message, t));
      } else if (mode === 'signup') {
        if (!name.trim()) {
          setError(t('Please enter your name.'));
          return;
        }
        const { error: err, needsConfirmation } = await signUp(email.trim(), password, name.trim());
        if (err) setError(authMessage(err.message, t));
        else if (needsConfirmation) setInfo(t('Check your email for a link to confirm your account.'));
      } else if (mode === 'forgot') {
        const { error: err } = await sendPasswordReset(email.trim());
        if (err) setError(authMessage(err.message, t));
        else setInfo(t('If that email has an account, a reset link is on its way.'));
      } else {
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) setError(authMessage(err.message, t));
        else {
          window.history.replaceState(null, '', '/auth');
          setMode('login');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const openSample = async () => {
    setError(null);
    setSampleBusy(true);
    const { error: err } = await startSampleAccount();
    setSampleBusy(false);
    if (err) setError(t('Could not open the sample account. Please try again.'));
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const heading: Record<Mode, string> = {
    login: t('Log in'),
    signup: t('Create your account'),
    forgot: t('Reset your password'),
    recovery: t('Choose a new password'),
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr]">
      <section className="bg-rail text-white px-6 py-6 sm:px-10 lg:px-14 lg:py-12 flex flex-col">
        <div className="self-start bg-sheet rounded-sheet px-3 py-2">
          <Logo className="w-44 h-auto" />
        </div>

        <div className="lg:my-auto mt-8">
          <h1 className="text-[2.5rem] sm:text-[3.5rem] leading-[1.15] font-bold max-w-[14ch] [text-wrap:balance]">
            {t('Only black marks count.')}
          </h1>
          <p className="mt-4 text-lg leading-relaxed max-w-[46ch]">
            {t('An OMR scanner ignores the printed sheet and reads only what you mark. Your preparation works the same way. PrepSaathi measures the gap between the hours you plan and the hours you do, and rewrites tomorrow from it.')}
          </p>

          <ol className="mt-7 hidden lg:flex flex-col gap-2.5">
            {LOOP.map((step, i) => (
              <li key={step} className="flex items-center gap-3 font-medium">
                <span
                  className={`w-6 h-6 rounded-full border-[1.5px] flex-none ${i < 2 ? 'bg-white border-white' : 'border-white'}`}
                  aria-hidden="true"
                />
                {t(step)}
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-8 text-sm text-[#dce9f6]">
          {t('For SSC, IBPS, UPSC and RRB aspirants.')}
        </p>
      </section>

      <section className="bg-sheet px-6 py-8 sm:px-10 flex flex-col">
        <div className="flex justify-end">
          <Segmented
            label={t('Language')}
            value={lang}
            onChange={setLang}
            options={[
              { value: 'en', label: 'English' },
              { value: 'hi', label: 'हिन्दी' },
            ]}
          />
        </div>

        <div className="w-full max-w-sm mx-auto my-auto py-8">
          <h2 className="text-[1.75rem] leading-tight font-bold mb-5">{heading[mode]}</h2>

          {error && <Notice tone="error" className="mb-4">{error}</Notice>}
          {info && <Notice tone="good" className="mb-4">{info}</Notice>}

          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <Field label={t('Your name')}>
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              </Field>
            )}
            {mode !== 'recovery' && (
              <Field label={t('Email')}>
                <input className={inputClass} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </Field>
            )}
            {mode !== 'forgot' && (
              <Field label={t('Password')} hint={mode === 'login' ? undefined : t('At least 6 characters')}>
                <span className="relative block">
                  <input
                    className={`${inputClass} pr-11`}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('Hide password') : t('Show password')}
                    className="absolute right-1 top-1 w-9 h-9 inline-flex items-center justify-center text-print-dark rounded-sheet hover:bg-tint"
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </span>
              </Field>
            )}

            <Button type="submit" loading={busy} className="w-full mt-1">
              {mode === 'login' && t('Log in')}
              {mode === 'signup' && t('Create account')}
              {mode === 'forgot' && t('Send reset link')}
              {mode === 'recovery' && t('Save new password')}
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
            {mode === 'login' ? (
              <>
                <button type="button" className="font-semibold text-print-dark underline" onClick={() => switchMode('signup')}>
                  {t('Create an account')}
                </button>
                <button type="button" className="text-ink-soft underline" onClick={() => switchMode('forgot')}>
                  {t('Forgot password?')}
                </button>
              </>
            ) : (
              mode !== 'recovery' && (
                <button type="button" className="font-semibold text-print-dark underline" onClick={() => switchMode('login')}>
                  {t('Back to log in')}
                </button>
              )
            )}
          </div>

          {(mode === 'login' || mode === 'signup') && (
            <div className="mt-7 pt-5 border-t border-line">
              <div className="flex items-start gap-2.5 mb-3">
                <Bubble size={20} className="mt-0.5" />
                <p className="text-sm text-ink-soft">
                  {t('Want a look first? Open a private account filled with made-up sample data. It is labelled on every screen and deleted after 2 days.')}
                </p>
              </div>
              <Button variant="print" className="w-full" loading={sampleBusy} onClick={openSample}>
                {t('Explore with sample data')}
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
