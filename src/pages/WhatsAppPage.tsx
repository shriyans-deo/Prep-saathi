import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../lib/prefs';
import { useQuery } from '../lib/query';
import { fetchMastery, fetchTodayPlan } from '../lib/data';
import { checkedInToday, effectiveStreak } from '../lib/stats';
import { Button, ErrorState, Notice, PageHeader, Skeleton } from '../components/ui';

function Message({ mine, children }: { mine?: boolean; children: React.ReactNode }) {
  return (
    <div className={mine ? 'flex justify-end' : 'flex justify-start'}>
      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-snug shadow-[0_1px_1px_rgb(0_0_0/0.12)] ${mine ? 'bg-[#d9fdd3]' : 'bg-white'}`}>
        {children}
      </div>
    </div>
  );
}

export default function WhatsAppPage() {
  const { user, profile } = useAuth();
  const { t } = usePrefs();
  const uid = user!.id;

  const plan = useQuery('plan:today', fetchTodayPlan);
  const mastery = useQuery(`mastery:${uid}`, () => fetchMastery(uid));

  const tasks = useMemo(() => plan.data?.tasks.tasks ?? [], [plan.data]);
  const weakest = mastery.data?.[0];
  const streak = effectiveStreak(profile);

  const planText = useMemo(() => {
    const lines = tasks.map((x, i) => `${i + 1}. ${x.topic}: ${x.task} (${t('{n} min', { n: x.minutes })})`);
    return `${t("Today's plan")}:\n${lines.join('\n')}\n\n${t('Total: {n} minutes', { n: plan.data?.tasks.total_minutes ?? 0 })}`;
  }, [tasks, plan.data, t]);

  const shareUrl = `https://wa.me/?text=${encodeURIComponent(planText)}`;

  return (
    <div>
      <PageHeader
        title={t('WhatsApp preview')}
        sub={t("A preview of how the daily loop would read in WhatsApp, using today's real plan. Automatic messages are not live yet because the WhatsApp Business API needs approval.")}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
        <div className="rounded-sheet overflow-hidden border border-line max-w-md">
          <div className="bg-[#075e54] text-white px-4 py-2.5">
            <div className="font-semibold">PrepSaathi</div>
            <div className="text-xs">{t('Preview, not a real chat')}</div>
          </div>
          <div className="bg-[#ece5dd] p-3 flex flex-col gap-2 min-h-96">
            {plan.error && !plan.data ? (
              <ErrorState error={plan.error} onRetry={plan.refetch} />
            ) : plan.isLoading ? (
              <>
                <Skeleton className="h-24 w-4/5" />
                <Skeleton className="h-12 w-3/5" />
              </>
            ) : (
              <>
                <Message>
                  <p className="font-semibold mb-1">{t('Good morning, {name}. Today:', { name: profile?.name ?? '' })}</p>
                  <ol className="list-decimal pl-4">
                    {tasks.map((x, i) => (
                      <li key={i}>
                        {x.topic} ({t('{n} min', { n: x.minutes })})
                      </li>
                    ))}
                  </ol>
                </Message>
                {weakest && (
                  <Message>
                    {t('Midday check: 5 questions on {topic}, your lowest score at {n}%.', {
                      topic: weakest.topics.topic_name,
                      n: weakest.score,
                    })}
                  </Message>
                )}
                {checkedInToday(profile) ? (
                  <Message>{t('Proof counted. Your streak is {n} days.', { n: streak })}</Message>
                ) : (
                  <Message>{t('Send a photo of your notebook tonight to keep your {n} day streak.', { n: streak })}</Message>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 items-start">
          <Notice>{t('Everything in this thread comes from your account. Nothing here was sent.')}</Notice>
          <div>
            <h2 className="text-lg font-semibold text-print-dark mb-1">{t('Share it yourself today')}</h2>
            <p className="text-ink-soft mb-3 max-w-prose">
              {t('This works now, without any approval. It opens WhatsApp with your plan typed out, and you choose who to send it to.')}
            </p>
            {tasks.length === 0 ? (
              <Button disabled>
                <Send size={16} aria-hidden="true" />
                {t("Send today's plan on WhatsApp")}
              </Button>
            ) : (
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-sheet bg-ink text-white font-semibold no-underline"
              >
                <Send size={16} aria-hidden="true" />
                {t("Send today's plan on WhatsApp")}
              </a>
            )}
          </div>
          <Link to="/plan" className="font-semibold text-print-dark">
            {t('Back to the plan')}
          </Link>
        </div>
      </div>
    </div>
  );
}
