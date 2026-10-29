import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckIcon, SparklesIcon, ArrowRightIcon } from '../components/ui/Icons';
import { Badge } from '../components/ui/Badge';

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
      {/* Left panel: Product Thesis & Daily Loop (§6 Screen 1) */}
      <div className="w-full md:w-1/2 bg-navy text-white p-8 sm:p-12 md:p-16 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-navy/40">
        <div>
          <div className="flex items-center gap-2.5 mb-10">
            <span className="w-9 h-9 rounded-xl bg-blue flex items-center justify-center font-bold text-base text-white shadow-xs">
              PS
            </span>
            <span className="text-2xl font-extrabold tracking-tight text-white">PrepSaathi</span>
            <Badge variant="primary" className="ml-2 bg-blue/20 text-sky border-blue/30">
              Execution Partner
            </Badge>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4 tracking-tight">
            The Execution Engine for Indian Government Exams
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mb-8 leading-relaxed font-normal">
            Content is solved. YouTube is free. The binding constraint is execution.
            PrepSaathi makes your execution gap visible daily and adapts tomorrow's plan based on what you actually did today.
          </p>

          {/* The Daily Loop Framing Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky block">The Daily Closed Loop</span>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              Plan → Study → Log Execution → Diagnostic Quiz → Mastery Update → Proof Submission → Tomorrow's Plan Changes.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue/20 text-sky flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckIcon size={12} />
              </span>
              <p className="text-xs sm:text-sm text-slate-300">
                <strong className="text-white">Execution Gap Tracking:</strong> Measure planned vs executed hours daily, not just test scores.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue/20 text-sky flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckIcon size={12} />
              </span>
              <p className="text-xs sm:text-sm text-slate-300">
                <strong className="text-white">Grounded AI Planning:</strong> Daily plans built from your weakest mastery scores, adjusting down if yesterday fell below 60%.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-blue/20 text-sky flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckIcon size={12} />
              </span>
              <p className="text-xs sm:text-sm text-slate-300">
                <strong className="text-white">Own-Notes Ingestion:</strong> Upload your coaching PDFs to detect syllabus overlaps and generate targeted quizzes.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>SSC CGL · UPSC CSE · IBPS PO</span>
          <span>Tier 2–3 First</span>
        </div>
      </div>

      {/* Right panel: Auth Form */}
      <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-16 flex items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
              {isSignUp ? 'Create your aspirant account' : 'Welcome back'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isSignUp
                ? 'Join serious aspirants closing their daily execution gap.'
                : 'Enter your credentials to access your daily plan and squad.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <strong className="font-bold">Error:</strong>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-navy focus:outline-none focus:ring-2 focus:ring-blue text-sm"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aspirant@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-navy focus:outline-none focus:ring-2 focus:ring-blue text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-navy focus:outline-none focus:ring-2 focus:ring-blue text-sm"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-blue hover:bg-blue/90 text-white font-bold text-xs sm:text-sm transition shadow-xs disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading
                ? 'Processing...'
                : isSignUp
                ? 'Sign Up & Start Onboarding'
                : 'Log In to PrepSaathi'}
            </button>
          </form>

          <div className="flex items-center justify-between text-xs sm:text-sm pt-2">
            <span className="text-slate-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
              }}
              className="text-blue font-bold hover:underline cursor-pointer"
            >
              {isSignUp ? 'Log In' : 'Sign Up'}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-bg px-3 text-slate-400 font-semibold tracking-wider">
                Live Demonstration Mode
              </span>
            </div>
          </div>

          {/* Quick Demo Launch Button */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center space-y-2.5">
            <div className="flex items-center justify-center gap-2">
              <SparklesIcon size={15} className="text-blue" />
              <span className="text-xs font-bold text-navy">
                Walkthrough with Pre-Seeded Account
              </span>
            </div>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-3 px-4 rounded-xl bg-navy hover:bg-navy/90 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Launch Demo Account (Priya Sharma · 12d streak)</span>
              <ArrowRightIcon size={12} />
            </button>
            <p className="text-[11px] text-slate-400">
              Pre-seeded with 30 days of narrowing execution gap, 12 mastery topics, and 4 quizzes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
