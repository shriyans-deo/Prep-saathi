import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { usePrefs } from '../lib/prefs';
import { Bubble, Button, cx } from './ui';
import type { PlanTask } from '../types/database';

export function nextTaskIndex(tasks: PlanTask[]): number {
  return tasks.findIndex((t) => !t.completed);
}

// The sheet's rule: a task still to do is printed in blue. Doing it turns it to black ink.
export function TaskRow({
  task,
  index,
  isNext,
  mastery,
  showWhy,
}: {
  task: PlanTask;
  index: number;
  isNext: boolean;
  mastery?: number | null;
  showWhy?: boolean;
}) {
  const { t } = usePrefs();
  const navigate = useNavigate();

  const start = () => {
    if (task.type === 'retest') {
      navigate(`/quiz?topic=${encodeURIComponent(task.topic)}`);
    } else {
      navigate(`/plan?start=${index}`);
    }
  };

  return (
    <li className={cx('flex gap-3 py-3 first:pt-0 last:pb-0', task.completed ? 'text-ink' : 'text-print-dark')}>
      <Bubble filled={task.completed} size={26} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="font-semibold leading-snug">
            {task.topic}
            <span className="sr-only"> ({task.completed ? t('Done') : t('Not done')})</span>
          </h3>
          <span className="text-sm font-medium whitespace-nowrap">
            {!task.completed
              ? t('{n} min', { n: task.minutes })
              : task.minutes_spent
                ? t('{n} min done', { n: task.minutes_spent })
                : t('Done')}
          </span>
        </div>
        <p className="text-sm leading-snug">{task.task}</p>
        {showWhy && !task.completed && <p className="text-sm text-ink-soft mt-1">{task.why}</p>}
        {!task.completed && typeof mastery === 'number' && (
          <p className="text-sm text-ink-soft mt-0.5">{t('Current score {n}%', { n: mastery })}</p>
        )}
        {isNext && (
          <Button className="mt-2" onClick={start}>
            <Play size={16} aria-hidden="true" />
            {task.type === 'retest' ? t('Take the retest') : t('Start')}
          </Button>
        )}
        {!isNext && !task.completed && showWhy && (
          <Button small variant="print" className="mt-2" onClick={start}>
            {task.type === 'retest' ? t('Take the retest') : t('Start')}
          </Button>
        )}
      </div>
    </li>
  );
}
