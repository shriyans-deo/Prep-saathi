import { useEffect, useState, useRef } from 'react';
import { cn } from '../../lib/utils';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
  animateOn?: 'view' | 'hover';
}

export function DecryptedText({
  text,
  speed = 40,
  maxIterations = 10,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*',
  className = '',
  parentClassName = '',
  encryptedClassName = 'text-blue-500 font-mono opacity-80',
  animateOn = 'view',
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let currentIteration = 0;

    const startAnimation = () => {
      setIsScrambling(true);
      currentIteration = 0;
      setRevealedIndices(new Set());

      interval = setInterval(() => {
        setRevealedIndices((prev) => {
          if (prev.size >= text.length) {
            clearInterval(interval);
            setIsScrambling(false);
            return prev;
          }

          const nextIndex = prev.size;
          const newRevealed = new Set(prev);
          newRevealed.add(nextIndex);
          return newRevealed;
        });

        currentIteration++;
        if (currentIteration >= maxIterations + text.length) {
          clearInterval(interval);
          setIsScrambling(false);
          setDisplayText(text);
        }
      }, speed);
    };

    if (animateOn === 'view') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startAnimation();
              observer.disconnect();
            }
          });
        },
        { threshold: 0.1 }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => {
        observer.disconnect();
        clearInterval(interval);
      };
    } else if (animateOn === 'hover' && isHovering && !isScrambling) {
      startAnimation();
      return () => clearInterval(interval);
    }
  }, [animateOn, isHovering, text, speed, maxIterations]);

  useEffect(() => {
    if (!isScrambling) {
      setDisplayText(text);
      return;
    }

    const scrambled = text
      .split('')
      .map((char, i) => {
        if (char === ' ') return ' ';
        if (revealedIndices.has(i)) return text[i];
        return characters[Math.floor(Math.random() * characters.length)];
      })
      .join('');

    setDisplayText(scrambled);
  }, [revealedIndices, isScrambling, text, characters]);

  return (
    <span
      ref={containerRef}
      className={cn('inline-block whitespace-pre-wrap', parentClassName)}
      onMouseEnter={() => animateOn === 'hover' && setIsHovering(true)}
      onMouseLeave={() => animateOn === 'hover' && setIsHovering(false)}
    >
      {displayText.split('').map((char, index) => {
        const isRevealed = revealedIndices.has(index) || !isScrambling;
        return (
          <span
            key={index}
            className={cn(className, !isRevealed && encryptedClassName)}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}
