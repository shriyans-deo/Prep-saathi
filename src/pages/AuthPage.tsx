import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (isSignUp) {
      if (!name.trim()) {
        setErrorMsg('Please enter your full name');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, name);
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      } else {
        // New user has no exam set yet -> redirect to Onboarding (§6 Screen 1)
        navigate('/onboarding');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleDemoLogin = () => {
    loginAsDemo();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg">
      {/* Left panel: Product Promise (Spec §6 Screen 1) */}
      <div className="w-full md:w-1/2 bg-navy text-white p-8 md:p-14 flex flex-col justify-between relative overflow-hidden">
        {/* Background decorative gradient */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-orange/15 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center gap-2 mb-8">
            <span className="w-9 h-9 rounded-lg bg-blue flex items-center justify-center font-bold text-lg text-white">
              PS
            </span>
            <span className="text-2xl font-bold tracking-tight text-white">PrepSaathi</span>
            <span className="text-xs bg-orange/20 text-orange px-2 py-0.5 rounded-full font-medium ml-2 border border-orange/30">
              Innov-a-thon 2.0
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">
            The Execution Engine for Indian Government Exams
          </h1>
          <p className="text-grey text-base md:text-lg mb-8 leading-relaxed">
            Content is solved. YouTube is free. The binding constraint is execution.
            PrepSaathi makes your execution gap visible daily and adapts tomorrow's plan based on what you actually did today.
          </p>

          {/* Key thesis callout */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky mb-1">The Daily Loop</p>
            <p className="text-sm text-slate-200">
              Plan → Study → Log Execution → Diagnostic Quiz → Mastery Update → Proof Submission → Tomorrow's Plan Changes.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue/20 flex items-center justify-center text-blue flex-shrink-0 mt-0.5">
                ✓
              </div>
              <p className="text-sm text-slate-300">
                <strong className="text-white">Execution Gap Tracking:</strong> Measure planned vs executed hours daily, not just test scores.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue/20 flex items-center justify-center text-blue flex-shrink-0 mt-0.5">
                ✓
              </div>
              <p className="text-sm text-slate-300">
                <strong className="text-white">Grounded AI Planning:</strong> Daily plans built from your weakest mastery scores, adjusting down if yesterday fell below 60%.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue/20 flex items-center justify-center text-blue flex-shrink-0 mt-0.5">
                ✓
              </div>
              <p className="text-sm text-slate-300">
                <strong className="text-white">Own-Notes Ingestion:</strong> Upload your coaching PDFs to detect syllabus overlaps and generate targeted quizzes.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-grey">
          <span>SSC CGL · UPSC CSE · IBPS PO</span>
          <span>Tier 2–3 First</span>
        </div>
      </div>

      {/* Right panel: Auth Form */}
      <div className="w-full md:w-1/2 p-8 md:p-14 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy">
              {isSignUp ? 'Create your aspirant account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-grey mt-1">
              {isSignUp
                ? 'Join thousands of serious aspirants closing their daily execution gap.'
                : 'Enter your credentials to access your daily plan and squad.'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
              <span className="font-bold">Error:</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-4 py-2.5 rounded-lg border border-grey/30 bg-white text-navy focus:outline-none focus:ring-2 focus:ring-blue text-sm"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aspirant@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-grey/30 bg-white text-navy focus:outline-none focus:ring-2 focus:ring-blue text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-grey/30 bg-white text-navy focus:outline-none focus:ring-2 focus:ring-blue text-sm"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-blue hover:bg-blue/90 text-white font-medium text-sm transition shadow-sm disabled:opacity-50 mt-2"
            >
              {loading
                ? 'Processing...'
                : isSignUp
                ? 'Sign Up & Start Onboarding'
                : 'Log In to PrepSaathi'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <span className="text-grey">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
              }}
              className="text-blue font-semibold hover:underline"
            >
              {isSignUp ? 'Log In' : 'Sign Up'}
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-grey/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-bg px-2 text-grey">Prototype Demonstration</span>
            </div>
          </div>

          {/* Quick Demo Mode for Stage/Judges (§9 of spec) */}
          <div className="p-4 rounded-xl bg-blue/5 border border-blue/20 text-center">
            <p className="text-xs font-medium text-navy mb-2">
              Innov-a-thon Pitch Mode (Pre-populated SSC CGL Demo Account)
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 px-4 rounded-lg bg-navy hover:bg-navy/90 text-white font-medium text-xs transition shadow-sm flex items-center justify-center gap-2"
            >
              <span>🚀</span>
              <span>Launch Demo Account (Priya Sharma · 12-day streak)</span>
            </button>
            <p className="text-[11px] text-grey mt-2">
              Seeded with 30-day narrowing gap, 12 mastery topics, 4 quizzes, and pre-mapped documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
