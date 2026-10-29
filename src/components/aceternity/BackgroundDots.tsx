import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface BackgroundDotsProps {
  className?: string;
  children?: ReactNode;
  variant?: 'light' | 'dark';
}

export function BackgroundDots({
  className,
  children,
  variant = 'light',
}: BackgroundDotsProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        variant === 'light' ? 'bg-[#F8FAFC]' : 'bg-[#0B1F3A]',
        className
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          variant === 'light' ? 'bg-dot-pattern' : 'bg-dot-pattern-dark',
          '[mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]'
        )}
      />
      {children}
    </div>
  );
}
