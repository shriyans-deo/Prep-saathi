import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, Check, CircleAlert, Info, Loader2, X } from 'lucide-react';
import { usePrefs } from '../lib/prefs';
import { AIError } from '../lib/ai';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

// ---- Bubble ---------------------------------------------------------------

export function Logo({ className }: { className?: string }) {
  return <img src="/logo.webp" alt="PrepSaathi" width={350} height={131} className={className} />;
}

export function Bubble({
  filled = false,
  size = 24,
  label,
  className,
}: {
  filled?: boolean;
  size?: number;
  label?: string;
  className?: string;
}) {
  // The ink stroke plays only when a bubble is actually marked, not every time it renders.
  const startedFilled = useRef(filled);
  return (
    <span
      className={cx('bubble', className)}
      data-filled={filled}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      aria-hidden="true"
    >
      {filled && <span className={cx('bubble-ink', !startedFilled.current && 'bubble-ink-new')} />}
      {label && <span className="bubble-label">{label}</span>}
    </span>
  );
}

// ---- Buttons --------------------------------------------------------------

type ButtonVariant = 'ink' | 'print' | 'ghost' | 'danger';

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  ink: 'bg-ink text-white hover:bg-[#2c2c36] disabled:bg-[#8d8a92]',
  print: 'border border-print text-print-dark bg-sheet hover:bg-tint disabled:opacity-50',
  ghost: 'text-print-dark hover:bg-tint disabled:opacity-50',
  danger: 'border border-ink-soft text-ink bg-sheet hover:bg-[#fbe4e4] hover:border-[#a01818] hover:text-[#8e1414] disabled:opacity-50',
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean; small?: boolean }
>(function Button({ variant = 'ink', loading, small, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-sheet font-semibold transition-colors duration-150',
        small ? 'min-h-9 px-3 text-sm' : 'min-h-11 px-4',
        BUTTON_STYLES[variant],
        className
      )}
      {...rest}
    >
      {loading && <Loader2 size={16} className="spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

// ---- Layout pieces --------------------------------------------------------

export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] leading-tight font-bold text-ink">{title}</h1>
        {sub && <p className="mt-1 text-ink-soft max-w-2xl">{sub}</p>}
      </div>
      {action && <div className="flex-none">{action}</div>}
    </header>
  );
}

export function Panel({
  title,
  aside,
  children,
  className,
  tint,
}: {
  title?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tint?: boolean;
}) {
  return (
    <section className={cx('min-w-0 rounded-sheet border border-line p-4 sm:p-5', tint ? 'bg-tint' : 'bg-sheet', className)}>
      {(title || aside) && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          {title && <h2 className="text-lg leading-snug font-semibold text-print-dark">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, tone = 'ink' }: { label: string; value: React.ReactNode; tone?: 'ink' | 'print' }) {
  return (
    <div className="min-w-0">
      <div className="text-sm font-medium text-print-dark">{label}</div>
      <div className={cx('text-[1.75rem] leading-tight font-bold', tone === 'print' ? 'text-print' : 'text-ink')}>{value}</div>
    </div>
  );
}

// ---- Feedback -------------------------------------------------------------

type Tone = 'info' | 'warn' | 'error' | 'good';

const NOTICE: Record<Tone, { box: string; Icon: typeof Info }> = {
  info: { box: 'bg-tint text-ink', Icon: Info },
  warn: { box: 'bg-warn-bg text-ink', Icon: AlertTriangle },
  error: { box: 'bg-[#fbe4e4] text-[#7a1212]', Icon: CircleAlert },
  good: { box: 'bg-good-bg text-ink', Icon: Check },
};

export function Notice({
  tone = 'info',
  children,
  action,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const { box, Icon } = NOTICE[tone];
  return (
    <div className={cx('flex flex-wrap items-start gap-2.5 rounded-sheet px-3.5 py-3', box, className)} role={tone === 'error' ? 'alert' : undefined}>
      <Icon size={18} className="mt-0.5 flex-none" aria-hidden="true" />
      <div className="min-w-0 flex-1 basis-48">{children}</div>
      {action && <div className="flex-none">{action}</div>}
    </div>
  );
}

export function aiErrorMessage(error: unknown, t: (s: string) => string): string {
  const code = error instanceof AIError ? error.code : '';
  switch (code) {
    case 'ai_unavailable':
      return t("The AI service isn't responding right now, so this can't be generated. Please try again in a minute.");
    case 'rate_limited':
      return t("You've made a lot of AI requests this hour. Please try again later.");
    case 'not_enough_data':
      return t('Log at least one study day first.');
    case 'network_error':
      return t('Could not reach the server. Check your connection and try again.');
    default:
      return t('Something went wrong. Please try again.');
  }
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const { t } = usePrefs();
  return (
    <Notice
      tone="error"
      action={
        onRetry && (
          <Button small variant="print" onClick={onRetry}>
            {t('Try again')}
          </Button>
        )
      }
    >
      {aiErrorMessage(error, t)}
    </Notice>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 py-3">
      <Bubble size={28} />
      <h3 className="font-semibold text-ink">{title}</h3>
      {children && <p className="text-ink-soft max-w-prose">{children}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} aria-hidden="true" />;
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-ink-soft py-4" role="status">
      <Loader2 size={18} className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

// ---- Forms ----------------------------------------------------------------

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-medium text-ink mb-1">{label}</span>
      {children}
      {hint && !error && <span className="block text-sm text-ink-soft mt-1">{hint}</span>}
      {error && <span className="block text-sm text-[#8e1414] mt-1">{error}</span>}
    </label>
  );
}

export const inputClass =
  'block w-full min-h-11 rounded-sheet border border-[#7c8fa3] bg-sheet px-3 py-2 hover:border-print focus-visible:border-ink';

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-sheet border border-print overflow-hidden">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-9 px-3 text-sm font-semibold transition-colors duration-150',
            value === o.value ? 'bg-ink text-white' : 'bg-sheet text-print-dark hover:bg-tint'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---- Dialog ---------------------------------------------------------------

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { t } = usePrefs();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className={cx('m-auto w-[calc(100%-2rem)] rounded-sheet border border-print bg-sheet p-0 text-ink', wide ? 'max-w-xl' : 'max-w-md')}
    >
      {open && (
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 id={titleId} className="text-xl leading-snug font-bold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('Close')}
              className="flex-none w-9 h-9 inline-flex items-center justify-center rounded-sheet text-print-dark hover:bg-tint"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

// ---- Toast ----------------------------------------------------------------

const ToastContext = createContext<(message: string, tone?: 'good' | 'error') => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; tone: 'good' | 'error' } | null>(null);

  const show = useCallback((message: string, tone: 'good' | 'error' = 'good') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-6 z-50 w-[calc(100%-2rem)] max-w-md pointer-events-none">
        {toast && (
          <div key={toast.id} className={cx('rounded-sheet px-4 py-3 text-white flex items-start gap-2', toast.tone === 'good' ? 'bg-ink' : 'bg-[#8e1414]')}>
            {toast.tone === 'good' ? <Check size={18} className="mt-0.5 flex-none" aria-hidden="true" /> : <CircleAlert size={18} className="mt-0.5 flex-none" aria-hidden="true" />}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ---- Domain helpers -------------------------------------------------------

// Fills {name} slots in a translated sentence with styled elements.
export function Rich({ template, parts }: { template: string; parts: Record<string, React.ReactNode> }) {
  return (
    <>
      {template.split(/(\{\w+\})/).map((piece, i) => {
        const key = piece.match(/^\{(\w+)\}$/)?.[1];
        return <React.Fragment key={i}>{key && key in parts ? parts[key] : piece}</React.Fragment>;
      })}
    </>
  );
}

export function masteryBand(score: number): 'weak' | 'learning' | 'mastered' {
  return score < 40 ? 'weak' : score <= 70 ? 'learning' : 'mastered';
}

export function SourceLabel({ source }: { source: 'ai' | 'rules' | 'sample' }) {
  const { t } = usePrefs();
  const text =
    source === 'ai'
      ? t('Written by AI from your data')
      : source === 'rules'
        ? t('AI unavailable. Calculated from your data by simple rules.')
        : t('Sample data');
  return <span className="text-sm text-ink-soft">{text}</span>;
}
