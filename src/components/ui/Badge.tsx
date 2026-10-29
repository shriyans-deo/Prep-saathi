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
    default: 'bg-slate-100 text-navy border border-slate-200',
    primary: 'bg-blue/10 text-blue border border-blue/20',
    weak: 'bg-red-50 text-red-700 border border-red-200',
    learning: 'bg-amber-50 text-amber-800 border border-amber-200',
    mastered: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    alert: 'bg-orange/10 text-orange border border-orange/25',
    neutral: 'bg-navy/5 text-slate-700 border border-navy/10',
    outline: 'border border-slate-300 text-slate-700 bg-transparent',
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
