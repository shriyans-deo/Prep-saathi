import React from 'react';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'weak'
  | 'learning'
  | 'mastered'
  | 'alert'
  | 'neutral'
  | 'outline';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '', ...props }: BadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5 rounded-full transition-colors';

  const variants: Record<BadgeVariant, string> = {
    default: 'bg-slate-100 text-[#0B1F3A] border border-slate-300 font-bold',
    primary: 'bg-blue-50 text-blue-700 border border-blue-200 font-bold shadow-xs',
    weak: 'bg-rose-50 text-rose-700 border border-rose-200 font-bold shadow-xs',
    learning: 'bg-amber-50 text-amber-800 border border-amber-200 font-bold shadow-xs',
    mastered: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold shadow-xs',
    alert: 'bg-orange-50 text-orange-700 border border-orange-200 font-bold shadow-xs',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold',
    outline: 'border border-slate-300 text-slate-700 bg-white font-medium',
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
