import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Check, Flag, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../lib/prefs';
import { useQuery } from '../lib/query';
import { fetchSquad, fetchSquadBoard, fetchSquadFeed } from '../lib/data';
import { formatRelative } from '../lib/dates';
import { SquadChart } from '../components/Charts.lazy';
import { Bubble, Button, EmptyState, ErrorState, Notice, PageHeader, Panel, Skeleton, cx, useToast } from '../components/ui';
import type { SquadEvent } from '../types/database';

export default function SquadPage() {
  const { profile } = useAuth();
  const { t, lang, lite } = usePrefs();
  const toast = useToast();

  const squad = useQuery(profile?.squad_id ? `squad:info:${profile.squad_id}` : null, () => fetchSquad(profile!.squad_id!));
  const board = useQuery('squad:board', fetchSquadBoard);
  const feed = useQuery('squad:feed', fetchSquadFeed);

  const members = useMemo(() => board.data ?? [], [board.data]);
  const me = members.find((m) => m.is_me);
  const checkedIn = members.filter((m) => m.checked_in_today).length;
  const alone = members.length <= 1;

  const invite = async () => {
    const text = t('I am preparing for {exam} on PrepSaathi. Join me so we can keep each other honest.', { exam: profile?.exam ?? '' });
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'PrepSaathi', text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast(t('Invite link copied.'));
      }
    } catch {
      // Closing the share sheet is not an error.
    }
  };

  const describe = (event: SquadEvent): string => {
    const who = event.is_me ? t('You') : t('Aspirant {seat}', { seat: event.seat });
    switch (event.kind) {
      case 'proof':
        return t('{who} submitted a {type} proof', {
          who,
          type: event.detail === 'photo' ? t('photo') : event.detail === 'voice' ? t('voice') : t('text'),
        });
      case 'quiz':
        return t('{who} scored {n}% on a quiz', { who, n: event.detail });
      default:
        return t('{who} studied for {n} min', { who, n: event.detail });
    }
  };

  return (
    <div>
      <PageHeader
        title={squad.data?.name ?? t('Squad')}
        sub={t('Your squad sees the gap. Everyone appears only as a letter.')}
        action={
          me && !me.checked_in_today ? (
            <Link to="/proof" className="inline-flex items-center justify-center min-h-11 px-4 rounded-sheet bg-ink text-white font-semibold no-underline">
              {t("Submit today's proof")}
            </Link>
          ) : undefined
        }
      />

      {board.error && !board.data ? (
        <ErrorState error={board.error} onRetry={board.refetch} />
      ) : board.isLoading ? (
        <Skeleton className="h-60" />
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start">
          <div className="flex flex-col gap-8">
            <Panel title={t('Today')} aside={<span className="font-medium">{t('{n} of {m} checked in', { n: checkedIn, m: members.length })}</span>}>
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full min-w-[26rem] text-sm">
                  <thead>
                    <tr className="text-left text-print-dark">
                      <th className="font-medium py-1.5 pr-3">{t('Member')}</th>
                      <th className="font-medium py-1.5 pr-3">{t('Today')}</th>
                      <th className="font-medium py-1.5 pr-3 text-right">{t('Streak')}</th>
                      <th className="font-medium py-1.5 pr-3 text-right">{t('Hours, 7 days')}</th>
                      <th className="font-medium py-1.5 text-right">{t('Check-ins')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.seat} className={cx('border-t border-line', m.is_me && 'font-semibold')}>
                        <td className="py-2 pr-3">
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            <Bubble size={24} label={m.seat} filled={m.is_me} />
                            {m.is_me ? t('You') : t('Aspirant {seat}', { seat: m.seat })}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          {m.checked_in_today ? (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              <Check size={15} aria-hidden="true" />
                              {t('Checked in')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gap font-semibold whitespace-nowrap">
                              <Flag size={15} aria-hidden="true" />
                              {t('Missed so far')}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right">{t('{n}d', { n: m.streak })}</td>
                        <td className="py-2 pr-3 text-right">{Math.round(m.hours_week * 10) / 10}h</td>
                        <td className="py-2 text-right">{m.checkins_week}/7</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {alone && (
                <Notice
                  className="mt-3"
                  action={
                    <Button small variant="print" onClick={invite}>
                      <Share2 size={14} aria-hidden="true" />
                      {t('Invite someone')}
                    </Button>
                  }
                >
                  {t('You are the only member so far. New {exam} aspirants join automatically until the squad has six.', { exam: profile?.exam ?? '' })}
                </Notice>
              )}
            </Panel>

            {!alone && !lite && (
              <Panel title={t('Check-ins, last 7 days')}>
                <SquadChart members={members} />
              </Panel>
            )}
          </div>

          <Panel title={t('Activity')}>
            {feed.error && !feed.data ? (
              <ErrorState error={feed.error} onRetry={feed.refetch} />
            ) : feed.isLoading ? (
              <Skeleton className="h-24" />
            ) : (feed.data ?? []).length === 0 ? (
              <EmptyState title={t('No activity this week')}>
                {t('Check-ins, study sessions and quiz scores from your squad appear here.')}
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {(feed.data ?? []).map((event, i) => (
                  <li key={`${event.occurred_at}-${i}`} className="py-2 first:pt-0 last:pb-0">
                    <p className={cx('leading-snug', event.is_me && 'font-semibold')}>{describe(event)}</p>
                    <p className="text-sm text-ink-soft">
                      {formatRelative(event.occurred_at, lang)}
                      {event.is_sample && ` · ${t('Sample data')}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
