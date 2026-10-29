import React from 'react';
import { cn } from '../../lib/utils';
import { motion, type HTMLMotionProps } from 'motion/react';

interface ShimmerButtonProps extends HTMLMotionProps<'button'> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = '#60A5FA',
      shimmerSize = '0.05em',
      shimmerDuration = '3s',
      borderRadius = '8px',
      background = '#2563EB',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        style={
          {
            '--spread': '90deg',
            '--shimmer-color': shimmerColor,
            '--radius': borderRadius,
            '--speed': shimmerDuration,
            '--cut': shimmerSize,
            '--bg': background,
          } as React.CSSProperties
        }
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-blue-600/30 px-5 py-2.5 font-medium text-white [background:var(--bg)] [border-radius:var(--radius)] shadow-sm hover:shadow-md transition-shadow duration-200',
          className
        )}
        {...props}
      >
        {/* Spark container */}
        <div className="-z-30 blur-[2px] absolute inset-0 overflow-visible [container-type:size]">
          {/* Spark */}
          <div className="absolute inset-0 h-[100cqh] animate-shimmer [aspect-ratio:1] [border-radius:0] [mask:none]">
            {/* Spark before */}
            <div className="animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
          </div>
        </div>
        {children}

        {/* Backdrop highlight */}
        <div
          className={cn(
            'insert-0 absolute size-full',
            'rounded-[inherit] px-4 py-1.5 text-sm font-medium',
            'transform-gpu transition-all duration-300 ease-in-out',
            'group-hover:bg-white/[0.04]'
          )}
        />
      </motion.button>
    );
  }
);

ShimmerButton.displayName = 'ShimmerButton';
