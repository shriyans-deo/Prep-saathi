import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface HoverItem {
  id: string | number;
  content: ReactNode;
}

interface CardHoverEffectProps {
  items: HoverItem[];
  className?: string;
  itemClassName?: string;
}

export function CardHoverEffect({
  items,
  className,
  itemClassName,
}: CardHoverEffectProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {items.map((item, idx) => (
        <div
          key={item.id}
          className="relative group block p-1 h-full w-full"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-blue-100/60 dark:bg-blue-900/20 block rounded-2xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.05 },
                }}
              />
            )}
          </AnimatePresence>
          <div className={cn('relative z-10 h-full', itemClassName)}>
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
}
