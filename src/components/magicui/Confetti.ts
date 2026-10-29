import confetti from 'canvas-confetti';

interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
  colors?: string[];
}

export function triggerAcademicConfetti(options?: ConfettiOptions) {
  // PrepSaathi brand colors: Blue, Sky, Orange, Navy, Gold
  const colors = options?.colors || ['#2563EB', '#60A5FA', '#F97316', '#0B1F3A', '#FBBF24'];

  confetti({
    particleCount: options?.particleCount || 45,
    spread: options?.spread || 60,
    origin: options?.origin || { y: 0.75 },
    colors,
    ticks: 200,
    gravity: 1.1,
    scalar: 0.9,
    shapes: ['circle', 'square'],
    disableForReducedMotion: true,
  });
}
