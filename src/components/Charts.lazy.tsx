import { lazy, Suspense, type ComponentProps } from 'react';
import { Skeleton } from './ui';

// Charts load only when a screen actually draws one, and never in Lite mode.
const LazyGap = lazy(() => import('./charts').then((m) => ({ default: m.GapChart })));
const LazyTrend = lazy(() => import('./charts').then((m) => ({ default: m.TrendChart })));
const LazySquad = lazy(() => import('./charts').then((m) => ({ default: m.SquadChart })));

export function GapChart(props: ComponentProps<typeof LazyGap>) {
  return (
    <Suspense fallback={<Skeleton className="h-64 sm:h-72" />}>
      <LazyGap {...props} />
    </Suspense>
  );
}

export function TrendChart(props: ComponentProps<typeof LazyTrend>) {
  return (
    <Suspense fallback={<Skeleton className="h-52" />}>
      <LazyTrend {...props} />
    </Suspense>
  );
}

export function SquadChart(props: ComponentProps<typeof LazySquad>) {
  return (
    <Suspense fallback={<Skeleton className="h-52" />}>
      <LazySquad {...props} />
    </Suspense>
  );
}
