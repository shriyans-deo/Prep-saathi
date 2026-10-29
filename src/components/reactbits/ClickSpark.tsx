import { useState } from 'react';

interface Spark {
  id: number;
  x: number;
  y: number;
  angle: number;
}

interface ClickSparkProps {
  children: React.ReactNode;
  sparkColor?: string;
  sparkCount?: number;
  className?: string;
}

export function ClickSpark({
  children,
  sparkColor = '#2563EB',
  sparkCount = 6,
  className = '',
}: ClickSparkProps) {
  const [sparks, setSparks] = useState<Spark[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newSparks: Spark[] = Array.from({ length: sparkCount }).map((_, i) => ({
      id: Date.now() + i,
      x,
      y,
      angle: (i * 360) / sparkCount,
    }));

    setSparks((prev) => [...prev, ...newSparks]);

    setTimeout(() => {
      setSparks((prev) => prev.filter((s) => !newSparks.some((ns) => ns.id === s.id)));
    }, 450);
  };

  return (
    <div className={`relative inline-block ${className}`} onClick={handleClick}>
      {children}
      {sparks.map((spark) => (
        <span
          key={spark.id}
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full"
          style={{
            left: `${spark.x}px`,
            top: `${spark.y}px`,
            backgroundColor: sparkColor,
            transform: `rotate(${spark.angle}deg) translate(14px)`,
            opacity: 0,
            animation: 'click-spark 0.45s ease-out forwards',
          }}
        />
      ))}
      <style>{`
        @keyframes click-spark {
          0% {
            opacity: 1;
            transform: scale(1) translate(0px);
          }
          100% {
            opacity: 0;
            transform: scale(0.3) translate(22px);
          }
        }
      `}</style>
    </div>
  );
}
